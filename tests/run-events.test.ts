import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRunEvent,
  followUpContext,
  interruptTask,
  parseRunEvent,
} from "../src/lib/state/run-events";
import {
  createLiveTask,
  consumeRunStream,
  executeClientRun,
  cancelClientRun,
} from "../src/lib/state/run-client";
import {
  getWorkspace,
  workspaceActions,
} from "../src/lib/state/workspace-store";
import { serializeWorkspace, isStoredTask } from "../src/lib/state/validation";
import type {
  Agent,
  RunEvent,
  RunEventPayload,
  RunRequest,
} from "../src/types";
const request: RunRequest = {
  taskId: "task-1",
  runId: "attempt-1",
  prompt: "Write a summary",
  mode: "single",
  lead: { provider: "gemini", modelId: "fixture-model" },
};
const event = (
  sequence: number,
  payload: RunEventPayload,
  runId = request.runId,
): RunEvent => ({
  ...payload,
  taskId: request.taskId,
  runId,
  eventId: `${runId}:${sequence}`,
  sequence,
  timestamp: Date.now(),
});
const delta = (sequence: number, text: string) =>
  event(sequence, { type: "delta", target: "result", text });
const agent: Agent = {
  id: "writer",
  name: "Writer",
  role: "Developer",
  model: "gemini:fixture-model",
  dependsOn: [],
  goal: "Write",
  status: "working",
  activity: "Writing",
  progress: 0,
  elapsed: 0,
  toolCalls: 0,
  modelCalls: 1,
  tokens: null,
  usage: null,
  mode: "live",
  events: [],
  output: "",
};

test("ordered updates ignore duplicates, stale attempts and late terminal updates", () => {
  const initial = createLiveTask(request);
  const first = applyRunEvent(initial, delta(1, "Hello"));
  assert.equal(first.result, "Hello");
  assert.equal(applyRunEvent(first, delta(1, "Hello")), first);
  assert.equal(
    applyRunEvent(
      first,
      event(
        2,
        { type: "delta", target: "result", text: "stale" },
        "old-attempt",
      ),
    ),
    first,
  );
  assert.throws(() => applyRunEvent(first, delta(3, "gap")), /interrupted/);
  const done = applyRunEvent(
    first,
    event(2, { type: "done", status: "completed" }),
  );
  assert.equal(applyRunEvent(done, delta(3, "late")), done);
  assert.throws(
    () => parseRunEvent({ ...delta(2, "x"), eventId: "wrong" }),
    /Invalid/,
  );
});
test("real snapshots accept empty planning state and nullable usage; followups include output", () => {
  const task = createLiveTask(request);
  assert.equal(isStoredTask(JSON.parse(JSON.stringify(task))), true);
  const withOutput = applyRunEvent(
    task,
    delta(1, "Relevant answer from earlier"),
  );
  assert.match(followUpContext(withOutput), /Relevant answer from earlier/);
  assert.ok(
    followUpContext({ ...withOutput, result: "x".repeat(24000) }).length <=
      12000,
  );
  const next = createLiveTask(
    { ...request, runId: "attempt-2" },
    request.runId,
  );
  assert.equal(next.previousRunId, request.runId);
  assert.equal(next.sequence, 0);
  assert.equal(next.result, "");
});
test("stop and interrupted streams preserve actual partial Markdown files", () => {
  let task = applyRunEvent(
    createLiveTask(request),
    event(1, { type: "agents", agents: [agent] }),
  );
  task = applyRunEvent(
    task,
    event(2, {
      type: "delta",
      target: "writer",
      text: "Real partial contribution",
    }),
  );
  task = applyRunEvent(task, delta(3, "Real partial response"));
  const stopped = interruptTask(task, "Stopped", true);
  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.agents[0].status, "stopped");
  assert.equal(stopped.files.length, 2);
  assert.equal(stopped.files[0].content, "Real partial contribution");
  assert.ok(stopped.files.every((file) => file.name.endsWith("partial.md")));
});
test("persistence excludes credentials at every object boundary", () => {
  const secret = "fake-private-key-not-for-inference";
  const task = {
    ...createLiveTask({
      ...request,
      mode: "manual",
      team: [{ ...agent, apiKey: secret } as Agent],
    }),
    apiKey: secret,
    credentials: { apiKey: secret },
    agents: [
      {
        ...agent,
        apiKey: secret,
        usage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3,
          apiKey: secret,
        },
        events: [
          { id: "event", label: "Working", time: "00:00", apiKey: secret },
        ],
      },
    ],
    files: [
      {
        id: "file",
        name: "output.md",
        content: "actual text",
        language: "markdown",
        size: "1 KB",
        apiKey: secret,
      },
    ],
  };
  const serialized = serializeWorkspace({
    tasks: [task],
    defaultModel: "gemini:fixture-model",
    reducedMotion: false,
    savedTeam: [{ ...agent, apiKey: secret } as Agent],
    executionMode: "live",
    credentials: { apiKey: secret },
    providers: [{ apiKey: secret }],
  } as Parameters<typeof serializeWorkspace>[0]);
  assert.ok(!serialized.includes(secret));
  assert.ok(!serialized.includes("apiKey"));
  assert.ok(!serialized.includes("credentials"));
  assert.ok(!serialized.includes("providers"));
  assert.equal(
    JSON.parse(serialized).tasks[0].requestedTeam[0].model,
    agent.model,
  );
});
function stream(events: RunEvent[], fragmented = false) {
  const encoded = new TextEncoder().encode(
    events
      .map((item) => `id: ${item.eventId}\ndata: ${JSON.stringify(item)}\n\n`)
      .join(""),
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        if (fragmented)
          for (const byte of encoded) controller.enqueue(Uint8Array.of(byte));
        else controller.enqueue(encoded);
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
test("client decodes fragmented Unicode and requires a terminal event", async () => {
  const received: RunEvent[] = [];
  await consumeRunStream(
    stream(
      [delta(1, "Hello 🌍"), event(2, { type: "done", status: "completed" })],
      true,
    ),
    (item) => received.push(item),
    new AbortController().signal,
  );
  assert.equal(received.length, 2);
  assert.equal(
    received[0].type === "delta" ? received[0].text : null,
    "Hello 🌍",
  );
  await assert.rejects(
    consumeRunStream(
      stream([delta(1, "Partial")]),
      () => {},
      new AbortController().signal,
    ),
    /interrupted/,
  );
});
test("client marks interrupted streams failed without sample fallback", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) =>
    options?.method === "DELETE"
      ? Response.json({ stopped: true })
      : stream([delta(1, "Actual partial response")]);
  try {
    workspaceActions.addTask(createLiveTask(request));
    await executeClientRun(request);
    const task = getWorkspace().tasks.find(
      (item) => item.runId === request.runId,
    )!;
    assert.equal(task.status, "failed");
    assert.equal(task.result, "Actual partial response");
    assert.match(task.error!, /interrupted/);
  } finally {
    globalThis.fetch = original;
  }
});
test("client Stop aborts active transport and keeps attempts isolated", async () => {
  const original = globalThis.fetch;
  let postedSignal: AbortSignal | null | undefined;
  let deleted = false;
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "DELETE") {
      deleted = true;
      return Response.json({ stopped: true });
    }
    postedSignal = options?.signal;
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify(delta(1, "Partial"))}\n\n`,
            ),
          );
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  try {
    workspaceActions.addTask(createLiveTask(request));
    const running = executeClientRun(request);
    await new Promise((resolve) => setTimeout(resolve, 5));
    cancelClientRun(getWorkspace().tasks[0]);
    await running;
    assert.equal(postedSignal?.aborted, true);
    assert.equal(deleted, true);
    assert.equal(getWorkspace().tasks[0].status, "stopped");
    assert.equal(getWorkspace().tasks[0].result, "Partial");
  } finally {
    globalThis.fetch = original;
  }
});

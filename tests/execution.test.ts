import assert from "node:assert/strict";
import test from "node:test";
import {
  executeRun,
  validatePlan,
  validateRunRequest,
  EXECUTION_LIMITS,
} from "../src/lib/server/execution";
import { ProviderError } from "../src/lib/server/providers";
import type {
  GenerateInput,
  GenerateResult,
} from "../src/lib/server/providers/types";
import type { PlanAgent, RunEvent, RunRequest, TeamMember } from "../src/types";

const lead = { provider: "gemini" as const, modelId: "fixture-lead" };
const key = "fixture-secret-never-in-events";
const result = (text: string): GenerateResult => ({
  text,
  usage: { inputTokens: 4, outputTokens: 2, totalTokens: 9 },
  finishReason: "STOP",
});
function request(overrides: Partial<RunRequest> = {}): RunRequest {
  return {
    taskId: "task-1",
    runId: "attempt-1",
    prompt: "Produce a useful project proposal.",
    mode: "single",
    lead,
    ...overrides,
  };
}
const planned = (id: string, dependsOn: string[] = []): PlanAgent => ({
  id,
  name: id,
  role: "Developer",
  goal: `Write ${id}.`,
  model: "gemini:fixture-lead",
  dependsOn,
});
const terminalStatus = (events: RunEvent[]) =>
  events.findLast((event) => event.type === "done")?.status;
function ordered(events: RunEvent[]) {
  assert.ok(events.length > 0);
  events.forEach((event, index) => {
    assert.equal(event.sequence, index + 1);
    assert.equal(event.eventId, `attempt-1:${index + 1}`);
    assert.equal(event.taskId, "task-1");
    assert.equal(event.runId, "attempt-1");
  });
  assert.equal(events.filter((event) => event.type === "done").length, 1);
  assert.equal(events.at(-1)?.type, "done");
  assert.ok(!JSON.stringify(events).includes(key));
}
async function run(
  runRequest: RunRequest,
  generate: (input: GenerateInput) => Promise<GenerateResult>,
  extra: {
    signal?: AbortSignal;
    timeoutMs?: number;
    resolveModel?: () => { apiKey: string };
  } = {},
) {
  const events: RunEvent[] = [];
  await executeRun(runRequest, {
    generate,
    resolveModel: extra.resolveModel ?? (() => ({ apiKey: key })),
    emit: (event) => events.push(event),
    signal: extra.signal ?? new AbortController().signal,
    timeoutMs: extra.timeoutMs,
  });
  ordered(events);
  return events;
}

test("plan validation rejects cycles, unknown dependencies, duplicate agents, too many agents and unauthorized models", () => {
  assert.deepEqual(
    validatePlan({ agents: [planned("a"), planned("b", ["a"])] }, [
      "gemini:fixture-lead",
    ]).agents.map((a) => a.id),
    ["a", "b"],
  );
  for (const agents of [
    [planned("a", ["b"]), planned("b", ["a"])],
    [planned("a", ["missing"])],
    [planned("a"), planned("a")],
    Array.from({ length: 5 }, (_, i) => planned(`a${i}`)),
    [{ ...planned("a"), model: "openai:unauthorized-fixture" }],
    [planned("result")],
  ])
    assert.throws(() => validatePlan({ agents }, ["gemini:fixture-lead"]));
});
test("request validation bounds prompt, context, IDs and manual configuration", () => {
  assert.throws(() =>
    validateRunRequest(
      request({ prompt: "a".repeat(EXECUTION_LIMITS.promptChars + 1) }),
    ),
  );
  assert.throws(() =>
    validateRunRequest(request({ context: "a".repeat(12001) })),
  );
  assert.throws(() => validateRunRequest(request({ runId: "../secret" })));
  assert.throws(() =>
    validateRunRequest(
      request({
        mode: "manual",
        team: [{ id: "a", name: "A", role: "Developer", model: "Auto" }],
      }),
    ),
  );
  assert.throws(() => validateRunRequest(request({ team: [] })));
});
test("single mode calls exactly the selected model and streams real result once", async () => {
  const calls: GenerateInput[] = [];
  const events = await run(
    request({ context: "Prior proposal: accessibility comes first." }),
    async (input) => {
      calls.push(input);
      input.onText?.("Real ");
      input.onText?.("response");
      return result("Real response");
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].provider, "gemini");
  assert.equal(calls[0].modelId, "fixture-lead");
  assert.match(calls[0].prompt, /accessibility comes first/);
  assert.ok(!calls[0].prompt.includes(key));
  assert.match(calls[0].system, /no tools/);
  assert.equal(
    events
      .filter((e) => e.type === "delta" && e.target === "result")
      .map((e) => (e.type === "delta" ? e.text : ""))
      .join(""),
    "Real response",
  );
  assert.equal(terminalStatus(events), "completed");
  const usage = events.filter((e) => e.type === "usage").at(-1);
  assert.equal(usage?.usage?.totalTokens, 9); // Provider total may include tokens absent from visible text counts.
  assert.equal(
    events
      .filter((e) => e.type === "files")
      .at(-1)
      ?.files.find((f) => f.name === "final-response.md")?.content,
    "Real response",
  );
});
test("automatic mode validates lead plan, waits for dependencies, bounds concurrency and reviews real contributions", async () => {
  const agents = [
    planned("a"),
    planned("b"),
    planned("c", ["a"]),
    { ...planned("review", ["b", "c"]), role: "Reviewer" as const },
  ];
  const calls: GenerateInput[] = [];
  let active = 0;
  let maximumActive = 0;
  const events = await run(request({ mode: "auto" }), async (input) => {
    calls.push(input);
    if (input.json) return result(JSON.stringify({ agents }));
    const data = JSON.parse(input.prompt);
    if (data.contributions) {
      assert.deepEqual(
        data.contributions.map((a: { output: string }) => a.output),
        ["output:a", "output:b", "output:c", "output:review"],
      );
      return result("Reviewed final result.");
    }
    const id = agents.find((a) => a.goal === data.assignedGoal)!.id;
    if (id === "c")
      assert.deepEqual(
        data.dependencyOutputs.map((a: { output: string }) => a.output),
        ["output:a"],
      );
    if (id === "review")
      assert.deepEqual(
        data.dependencyOutputs.map((a: { output: string }) => a.output),
        ["output:b", "output:c"],
      );
    active++;
    maximumActive = Math.max(active, maximumActive);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return result(`output:${id}`);
  });
  assert.equal(calls.length, 6);
  assert.equal(maximumActive, 2);
  assert.ok(
    calls.every(
      (call) => call.provider === "gemini" && call.modelId === "fixture-lead",
    ),
  );
  assert.deepEqual(
    [...new Set(events.filter((e) => e.type === "phase").map((e) => e.phase))],
    [
      "Planning",
      "Creating agents",
      "Agents working",
      "Reviewing",
      "Finalizing",
      "Completed",
    ],
  );
});
test("invalid generated plan never starts specialists or substitutes sample output", async () => {
  for (const text of [
    "not JSON",
    JSON.stringify({
      agents: [{ ...planned("a"), model: "openai:other-fixture" }],
    }),
  ]) {
    let calls = 0;
    const events = await run(request({ mode: "auto" }), async () => {
      calls++;
      return result(text);
    });
    assert.equal(calls, 1);
    assert.equal(terminalStatus(events), "failed");
    assert.equal(
      events.some((e) => e.type === "agents" || e.type === "delta"),
      false,
    );
  }
});
test("manual teams retain names, roles, exact provider/model assignments and reviewer dependency outputs", async () => {
  const team: TeamMember[] = [
    {
      id: "writer",
      name: "My Writer",
      role: "Developer",
      model: "openai:fixture-writer",
    },
    {
      id: "reviewer",
      name: "My Reviewer",
      role: "Reviewer",
      model: "anthropic:fixture-reviewer",
    },
  ];
  const calls: GenerateInput[] = [];
  const events = await run(request({ mode: "manual", team }), async (input) => {
    calls.push(input);
    const data = JSON.parse(input.prompt);
    if (input.provider === "anthropic")
      assert.deepEqual(
        data.dependencyOutputs.map((item: { output: string }) => item.output),
        ["Output from openai"],
      );
    return result(`Output from ${input.provider}`);
  });
  assert.deepEqual(
    calls.map((c) => `${c.provider}:${c.modelId}`),
    [
      "openai:fixture-writer",
      "anthropic:fixture-reviewer",
      "gemini:fixture-lead",
    ],
  );
  const assigned = events.find((e) => e.type === "agents");
  assert.deepEqual(
    assigned?.agents.map((a) => [a.name, a.role, a.model]),
    team.map((a) => [a.name, a.role, a.model]),
  );
  assert.ok(calls.every((c) => !c.json));
});
test("all model configurations are checked before any paid work, with safe errors", async () => {
  let calls = 0;
  let resolves = 0;
  const events = await run(
    request({
      mode: "manual",
      team: [
        {
          id: "a",
          name: "A",
          role: "Developer",
          model: "openai:unconnected-fixture",
        },
      ],
    }),
    async () => {
      calls++;
      return result("never");
    },
    {
      resolveModel: () => {
        if (++resolves === 2) throw new Error(key);
        return { apiKey: key };
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(terminalStatus(events), "failed");
});
test("cancellation retains partial output, aborts calls, prevents review and suppresses late text", async () => {
  const controller = new AbortController();
  let calls = 0;
  let late: (() => void) | undefined;
  let transportSignal: AbortSignal | undefined;
  const events = await run(
    request(),
    async (input) => {
      calls++;
      transportSignal = input.signal;
      input.onText?.("Partial deliverable");
      late = () => input.onText?.(" late mutation");
      controller.abort();
      return new Promise<GenerateResult>(() => {});
    },
    { signal: controller.signal },
  );
  assert.equal(calls, 1);
  assert.equal(transportSignal?.aborted, true);
  assert.equal(terminalStatus(events), "stopped");
  assert.ok(
    events.some(
      (e) =>
        e.type === "files" &&
        e.files.some((f) => f.content === "Partial deliverable"),
    ),
  );
  const length = events.length;
  assert.throws(() => late?.());
  assert.equal(events.length, length);
});
test("deadline bounds an adapter that never settles and permits no later stage", async () => {
  const events = await run(
    request(),
    async () => new Promise<GenerateResult>(() => {}),
    { timeoutMs: 5 },
  );
  const terminal = events.at(-1);
  assert.ok(
    terminal?.type === "done" &&
      terminal.status === "failed" &&
      terminal.error?.includes("time limit"),
  );
  assert.equal(
    events.some((e) => e.type === "phase" && e.phase === "Finalizing"),
    false,
  );
});
test("specialist failure cancels siblings and prevents dependent agents or review", async () => {
  const team = [planned("a"), planned("b"), planned("c", ["a", "b"])];
  let calls = 0;
  let siblingSignal: AbortSignal | undefined;
  const events = await run(request({ mode: "manual", team }), async (input) => {
    calls++;
    if (calls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 2));
      throw new ProviderError("rate_limit", 429);
    }
    siblingSignal = input.signal;
    return new Promise<GenerateResult>(() => {});
  });
  assert.equal(calls, 2);
  assert.equal(siblingSignal?.aborted, true);
  assert.equal(terminalStatus(events), "failed");
  assert.ok(
    events.some(
      (e) =>
        e.type === "agent" && e.agent.id === "a" && e.agent.status === "failed",
    ),
  );
  assert.ok(
    events.some(
      (e) =>
        e.type === "agent" &&
        e.agent.id === "c" &&
        e.agent.status === "stopped",
    ),
  );
});
test("per-call output is bounded and missing usage is not fabricated", async () => {
  const events = await run(request(), async (input) => {
    input.onText?.("a".repeat(24001));
    return result("unreachable");
  });
  assert.equal(terminalStatus(events), "failed");
  const partial = events.find(
    (e): e is Extract<RunEvent, { type: "delta" }> =>
      e.type === "delta" && e.target === "result",
  );
  assert.equal(partial?.text.length, 24000);
  const unavailable = await run(request(), async () => ({
    text: "Output",
    usage: null,
    finishReason: "STOP",
  }));
  assert.deepEqual(
    unavailable.filter((e) => e.type === "usage").at(-1)?.usage,
    { inputTokens: null, outputTokens: null, totalTokens: null },
  );
});
test("failed calls retain available provider usage without generating a successful result", async () => {
  const error = new ProviderError("output_limit");
  error.usage = { inputTokens: 4, outputTokens: 2, totalTokens: 11 };
  const events = await run(request(), async (input) => {
    input.onText?.("Partial");
    throw error;
  });
  assert.equal(terminalStatus(events), "failed");
  assert.deepEqual(
    events.filter((event) => event.type === "usage").at(-1)?.usage,
    error.usage,
  );
});

import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  assertLocalRequest,
  COOKIE,
  destroySession,
  environmentCredential,
  getSession,
  HttpError,
  login,
  readJson,
  resolveCredential,
  rotateSession,
  sessionCookie,
  sessionMetadata,
  type WorkspaceSession,
} from "../src/lib/server/session";
import {
  GET as sessionGET,
  POST as sessionPOST,
} from "../src/app/api/session/route";
import { POST as connectionPOST } from "../src/app/api/connections/route";
import {
  POST as runPOST,
  DELETE as runDELETE,
} from "../src/app/api/runs/route";

const password = "fixture-password-long-enough";
const key = "fixture-key-never-returned-to-browser";
const model = { provider: "gemini" as const, modelId: "fixture-model" };
function env(t: TestContext, name: string, value?: string) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
}
function request(
  path: string,
  body?: unknown,
  session?: WorkspaceSession,
  extra: RequestInit = {},
) {
  return new Request(`http://127.0.0.1:3000/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-ibot-request": "1",
      origin: "http://127.0.0.1:3000",
      "content-type": "application/json",
      ...(session ? { cookie: `${COOKIE}=${session.id}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...extra,
  });
}
function authenticated(t: TestContext) {
  env(t, "IBOT_LOCAL_PASSWORD", password);
  const session = login(password);
  t.after(() => destroySession(session));
  return session;
}
function connected(t: TestContext) {
  const session = authenticated(t);
  session.credentials.set("gemini", {
    apiKey: key,
    modelId: model.modelId,
    source: "session",
  });
  return session;
}
const task = {
  taskId: "task-1",
  runId: "attempt-1",
  prompt: "Write a short proposal.",
  mode: "single",
  lead: model,
};
function providerResponse(text = "Actual mocked inference") {
  return new Response(
    `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 3, totalTokenCount: 7 } })}\n\n`,
    { headers: { "content-type": "text/event-stream" } },
  );
}

test("API guard accepts only explicit same-origin loopback workspace requests", () => {
  assert.doesNotThrow(() => assertLocalRequest(request("session")));
  for (const invalid of [
    new Request("https://example.com/api/session", {
      headers: { "x-ibot-request": "1" },
    }),
    request("session", {}, undefined, {
      headers: { "x-ibot-request": "1", origin: "https://evil.example" },
    }),
    request("session", {}, undefined, { headers: { "x-ibot-request": "1" } }),
    request("session", {}, undefined, {
      headers: {
        "x-ibot-request": "1",
        origin: "http://127.0.0.1:3000",
        "sec-fetch-site": "cross-site",
      },
    }),
    request("session", {}, undefined, {
      headers: { origin: "http://127.0.0.1:3000" },
    }),
  ])
    assert.throws(
      () => assertLocalRequest(invalid),
      (error: unknown) => error instanceof HttpError && error.status === 403,
    );
});
test("workspace needs an explicitly configured password and sets HttpOnly same-site cookie", async (t) => {
  env(t, "IBOT_LOCAL_PASSWORD");
  assert.throws(
    () => login(password),
    (error: unknown) => error instanceof HttpError && error.status === 503,
  );
  process.env.IBOT_LOCAL_PASSWORD = password;
  assert.throws(
    () => login("incorrect"),
    (error: unknown) => error instanceof HttpError && error.status === 401,
  );
  const response = await sessionPOST(
    request("session", { action: "unlock", password }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api/);
  const found = getSession(
    new Request("http://127.0.0.1:3000/api/session", { headers: { cookie } }),
  )!;
  t.after(() => destroySession(found));
  assert.ok(!JSON.stringify(await response.json()).includes(password));
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("shared environment credentials cannot be used without a session", async (t) => {
  env(t, "GEMINI_API_KEY", key);
  env(t, "GEMINI_MODEL", model.modelId);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return providerResponse();
  });
  assert.equal((await runPOST(request("runs", task))).status, 401);
  assert.equal(
    (await connectionPOST(request("connections", { action: "test", ...model })))
      .status,
    401,
  );
  const metadata = await (await sessionGET(request("session"))).json();
  assert.deepEqual(metadata, {
    unlocked: false,
    connections: [],
    environment: [],
  });
  assert.equal(calls, 0);
});
test("refresh rotates the session, clears credentials and aborts active work", (t) => {
  const session = connected(t);
  const controller = new AbortController();
  session.controllers.add(controller);
  const metadata = JSON.stringify(sessionMetadata(session));
  assert.ok(!metadata.includes(key));
  assert.ok(!metadata.includes("apiKey"));
  const rotated = rotateSession(session);
  t.after(() => destroySession(rotated));
  assert.equal(controller.signal.aborted, true);
  assert.equal(session.credentials.size, 0);
  assert.notEqual(rotated.id, session.id);
  assert.equal(rotated.credentials.size, 0);
  assert.throws(() => resolveCredential(session, model));
  assert.throws(() => resolveCredential(rotated, model));
  assert.ok(!sessionCookie(rotated, request("session")).includes(key));
});
test("credentials resolve only the exact tested model and environment configuration", (t) => {
  const session = connected(t);
  env(t, "GEMINI_API_KEY", key);
  env(t, "GEMINI_MODEL", model.modelId);
  assert.deepEqual(resolveCredential(session, model), { apiKey: key });
  assert.throws(() =>
    resolveCredential(session, { ...model, modelId: "other-fixture" }),
  );
  assert.equal(environmentCredential("gemini", model.modelId), key);
  assert.throws(() => environmentCredential("gemini", "other-fixture"));
  assert.ok(!JSON.stringify(sessionMetadata(session)).includes(key));
});
test("test connection marks connected only after actual adapter success; disconnect clears it", async (t) => {
  const session = authenticated(t);
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      calls++;
      assert.equal(new Headers(init.headers).get("x-goog-api-key"), key);
      return providerResponse("OK");
    },
  );
  const response = await connectionPOST(
    request("connections", { action: "test", ...model, apiKey: key }, session),
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  const text = await response.text();
  assert.ok(!text.includes(key));
  assert.ok(!text.includes("apiKey"));
  assert.equal(JSON.parse(text).connections[0].status, "connected");
  assert.equal(
    (
      await connectionPOST(
        request(
          "connections",
          { action: "disconnect", provider: "gemini" },
          session,
        ),
      )
    ).status,
    200,
  );
  assert.throws(() => resolveCredential(session, model));
});
test("environment test requires exact configured model and never returns the environment key", async (t) => {
  const session = authenticated(t);
  env(t, "GEMINI_API_KEY", key);
  env(t, "GEMINI_MODEL", model.modelId);
  t.mock.method(globalThis, "fetch", async () => providerResponse("OK"));
  const response = await connectionPOST(
    request("connections", { action: "test", ...model }, session),
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.connections[0].source, "environment");
  assert.ok(!JSON.stringify(payload).includes(key));
});
test("connection failure is actionable, removes prior credentials, and redacts provider response", async (t) => {
  const session = connected(t);
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: { message: key } }, { status: 401 }),
  );
  const response = await connectionPOST(
    request("connections", { action: "test", ...model, apiKey: key }, session),
  );
  const payload = await response.json();
  assert.equal(response.status, 401);
  assert.equal(payload.connections[0].status, "error");
  assert.ok(!JSON.stringify(payload).includes(key));
  assert.equal(session.credentials.size, 0);
});
test("disconnect invalidates an in-flight test so it cannot reconnect later", async (t) => {
  const session = authenticated(t);
  let complete: ((response: Response) => void) | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      }),
  );
  const testing = connectionPOST(
    request("connections", { action: "test", ...model, apiKey: key }, session),
  );
  while (!complete) await new Promise((resolve) => setTimeout(resolve, 1));
  await connectionPOST(
    request(
      "connections",
      { action: "disconnect", provider: "gemini" },
      session,
    ),
  );
  complete(providerResponse("OK"));
  await testing;
  assert.equal(session.credentials.size, 0);
  assert.equal(session.errors.size, 0);
});
test("run endpoint preflights before paid calls and streams ordered actual output", async (t) => {
  const session = connected(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return providerResponse();
  });
  const invalid = await runPOST(
    request(
      "runs",
      {
        ...task,
        mode: "manual",
        team: [
          {
            id: "a",
            name: "A",
            role: "Developer",
            model: "openai:not-connected-fixture",
          },
        ],
      },
      session,
    ),
  );
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);
  const response = await runPOST(request("runs", task, session));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /event-stream/);
  const body = await response.text();
  assert.ok(!body.includes(key));
  const events = body
    .split("\n\n")
    .filter((block) => block.startsWith("id:"))
    .map((block) => JSON.parse(block.split("\ndata: ")[1]));
  events.forEach((event, index) => {
    assert.equal(event.sequence, index + 1);
    assert.equal(event.runId, task.runId);
  });
  assert.equal(events.at(-1).status, "completed");
  assert.equal(calls, 1);
  assert.ok(
    events.some(
      (event) =>
        event.type === "delta" && event.text === "Actual mocked inference",
    ),
  );
  assert.equal((await runPOST(request("runs", task, session))).status, 409);
});
test("stop endpoint cancels active transport and stream ends with a stopped attempt", async (t) => {
  const session = connected(t);
  let transportSignal: AbortSignal | null | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      transportSignal = init.signal;
      return new Response(new ReadableStream(), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  );
  const response = await runPOST(request("runs", task, session));
  const stopped = await runDELETE(
    request("runs", { runId: task.runId }, session, { method: "DELETE" }),
  );
  assert.equal(stopped.status, 200);
  const text = await response.text();
  assert.equal(transportSignal?.aborted, true);
  assert.match(text, /"status":"stopped"/);
  assert.equal(session.activeRuns.size, 0);
});
test("request size and JSON bounds reject malformed bodies", async () => {
  await assert.rejects(
    readJson(request("session", { text: "a".repeat(100) }), 20),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  await assert.rejects(
    readJson(request("session", {}, undefined, { body: "{" })),
    (error: unknown) => error instanceof HttpError && error.status === 400,
  );
});

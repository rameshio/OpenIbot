import assert from "node:assert/strict";
import test from "node:test";
import {
  createProviderAdapter,
  ProviderError,
} from "../src/lib/server/providers";
import type { GenerateInput } from "../src/lib/server/providers/types";
import type { ProviderId } from "../src/types";

// Deliberately synthetic IDs and credentials; no real provider is contacted.
const key = "secret-only-in-auth-header";
function input(
  provider: ProviderId,
  overrides: Partial<GenerateInput> = {},
): GenerateInput {
  return {
    provider,
    modelId: "fixture-model",
    apiKey: key,
    system: "Write a deliverable.",
    prompt: "Hello",
    maxOutputTokens: 128,
    signal: new AbortController().signal,
    ...overrides,
  };
}
function event(value: unknown) {
  return `data: ${JSON.stringify(value)}\r\n\r\n`;
}
function stream(data: string, chunkSize = 13) {
  const bytes = new TextEncoder().encode(data);
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunkSize)
          controller.enqueue(bytes.slice(i, i + chunkSize));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}
const fixtures: Record<ProviderId, string> = {
  gemini: event({
    candidates: [
      {
        content: {
          parts: [{ text: "private", thought: true }, { text: "Hello 🌎" }],
        },
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 2,
      totalTokenCount: 17,
    },
  }),
  openai:
    event({ type: "response.reasoning_summary_text.delta", delta: "private" }) +
    event({ type: "response.output_text.delta", delta: "Hello 🌎" }) +
    event({
      type: "response.completed",
      response: {
        status: "completed",
        usage: { input_tokens: 10, output_tokens: 2, total_tokens: 12 },
      },
    }),
  anthropic:
    event({
      type: "message_start",
      message: { usage: { input_tokens: 10, output_tokens: 0 } },
    }) +
    event({
      type: "content_block_start",
      index: 0,
      content_block: { type: "thinking", thinking: "private" },
    }) +
    event({
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "private" },
    }) +
    event({
      type: "content_block_start",
      index: 1,
      content_block: { type: "text", text: "" },
    }) +
    event({
      type: "content_block_delta",
      index: 1,
      delta: { type: "text_delta", text: "Hello 🌎" },
    }) +
    event({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 2 },
    }) +
    event({ type: "message_stop" }),
  xai:
    event({
      choices: [
        {
          index: 0,
          delta: { reasoning_content: "private", content: "Hello 🌎" },
          finish_reason: null,
        },
      ],
    }) +
    event({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }) +
    event({
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
    }) +
    "data: [DONE]\r\n\r\n",
  cohere:
    event({
      type: "content-start",
      index: 0,
      delta: {
        message: { content: { type: "thinking", thinking: "private" } },
      },
    }) +
    event({
      type: "content-delta",
      index: 0,
      delta: { message: { content: { thinking: "private" } } },
    }) +
    event({
      type: "content-start",
      index: 1,
      delta: { message: { content: { type: "text", text: "" } } },
    }) +
    event({
      type: "content-delta",
      index: 1,
      delta: { message: { content: { text: "Hello 🌎" } } },
    }) +
    event({
      type: "message-end",
      delta: {
        finish_reason: "COMPLETE",
        usage: {
          tokens: { input_tokens: 10, output_tokens: 2 },
          billed_units: { input_tokens: 8, output_tokens: 2 },
        },
      },
    }),
};

for (const provider of Object.keys(fixtures) as ProviderId[]) {
  test(`${provider}: exact model, server auth header, fragmented Unicode text and reported usage`, async () => {
    let calls = 0;
    let visible = "";
    const adapter = createProviderAdapter(async (url, init) => {
      calls++;
      assert.ok(!String(url).includes(key));
      const headers = new Headers(init?.headers);
      assert.equal(
        headers.get(
          provider === "gemini"
            ? "x-goog-api-key"
            : provider === "anthropic"
              ? "x-api-key"
              : "authorization",
        ),
        ["gemini", "anthropic"].includes(provider) ? key : `Bearer ${key}`,
      );
      const body = JSON.parse(String(init?.body));
      assert.ok(!String(init?.body).includes(key));
      if (provider === "gemini") {
        assert.equal(
          new URL(String(url)).pathname,
          "/v1beta/models/fixture-model:streamGenerateContent",
        );
        assert.equal(body.generationConfig.maxOutputTokens, 128);
      } else {
        assert.equal(body.model, "fixture-model");
        assert.equal(body.stream, true);
      }
      if (provider === "openai") {
        assert.equal(new URL(String(url)).pathname, "/v1/responses");
        assert.equal(body.store, false);
      }
      if (provider === "anthropic")
        assert.equal(headers.get("anthropic-version"), "2023-06-01");
      assert.equal(init?.redirect, "error");
      return stream(fixtures[provider], 1);
    });
    const output = await adapter.generate(
      input(provider, {
        onText: (text) => {
          visible += text;
        },
      }),
    );
    assert.equal(calls, 1);
    assert.equal(output.text, "Hello 🌎");
    assert.equal(visible, output.text);
    assert.deepEqual(output.usage, {
      inputTokens: 10,
      outputTokens: 2,
      totalTokens:
        provider === "gemini"
          ? 17
          : ["anthropic", "cohere"].includes(provider)
            ? null
            : 12,
    });
    assert.ok(!JSON.stringify(output).includes("private"));
  });
}

test("missing usage stays unavailable rather than estimated", async () => {
  const adapter = createProviderAdapter(async () =>
    stream(
      event({
        candidates: [
          { content: { parts: [{ text: "OK" }] }, finishReason: "STOP" },
        ],
      }),
    ),
  );
  assert.equal((await adapter.generate(input("gemini"))).usage, null);
});

for (const [status, code] of [
  [401, "invalid_key"],
  [404, "model_unavailable"],
  [429, "rate_limit"],
  [503, "provider_failure"],
] as const) {
  test(`HTTP ${status} becomes actionable safe ${code} with no retry`, async () => {
    let calls = 0;
    const adapter = createProviderAdapter(async () => {
      calls++;
      return Response.json({ error: { message: key } }, { status });
    });
    await assert.rejects(
      adapter.generate(input("openai")),
      (error: unknown) =>
        error instanceof ProviderError &&
        error.code === code &&
        !error.message.includes(key),
    );
    assert.equal(calls, 1);
  });
}
test("Gemini invalid-key reason with HTTP 400 is classified without exposing the error body", async () => {
  const adapter = createProviderAdapter(async () =>
    Response.json(
      { error: { message: key, details: [{ reason: "API_KEY_INVALID" }] } },
      { status: 400 },
    ),
  );
  await assert.rejects(adapter.generate(input("gemini")), {
    code: "invalid_key",
  });
});
test("connection exceptions never expose provider credentials", async () => {
  const adapter = createProviderAdapter(async () => {
    throw new Error(`failed request ${key}`);
  });
  await assert.rejects(
    adapter.generate(input("cohere")),
    (error: unknown) =>
      error instanceof ProviderError &&
      error.code === "network" &&
      !error.message.includes(key),
  );
});
test("truncated stream preserves delivered text but fails without a terminal event", async () => {
  let visible = "";
  const adapter = createProviderAdapter(async () =>
    stream(event({ type: "response.output_text.delta", delta: "partial" })),
  );
  await assert.rejects(
    adapter.generate(
      input("openai", {
        onText: (text) => {
          visible += text;
        },
      }),
    ),
    { code: "incomplete_response" },
  );
  assert.equal(visible, "partial");
});
test("provider output/token limits and refusals are failures, not successful sample output", async () => {
  for (const reason of ["MAX_TOKENS", "SAFETY"]) {
    const adapter = createProviderAdapter(async () =>
      stream(
        event({
          candidates: [
            { content: { parts: [{ text: "partial" }] }, finishReason: reason },
          ],
        }),
      ),
    );
    await assert.rejects(adapter.generate(input("gemini")), {
      code: reason === "SAFETY" ? "refusal" : "output_limit",
    });
  }
  const adapter = createProviderAdapter(async () =>
    stream(
      event({ type: "response.output_text.delta", delta: "a".repeat(24001) }),
    ),
  );
  await assert.rejects(adapter.generate(input("openai")), {
    code: "output_limit",
  });
});
test("cancel aborts transport and settles even while the response stream is waiting", async () => {
  const controller = new AbortController();
  let transportSignal: AbortSignal | null | undefined;
  let cancelled = false;
  const adapter = createProviderAdapter(async (_url, init) => {
    transportSignal = init?.signal;
    return new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  });
  const pending = adapter.generate(input("xai", { signal: controller.signal }));
  await new Promise((resolve) => setTimeout(resolve, 1));
  controller.abort();
  await assert.rejects(pending, { code: "cancelled" });
  assert.equal(transportSignal?.aborted, true);
  assert.equal(cancelled, true);
});
test("already cancelled requests do not contact a provider", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const adapter = createProviderAdapter(async () => {
    calls++;
    return stream("");
  });
  await assert.rejects(
    adapter.generate(input("gemini", { signal: controller.signal })),
    { code: "cancelled" },
  );
  assert.equal(calls, 0);
});
test("usage received before output truncation remains available on the safe error", async () => {
  const adapter = createProviderAdapter(async () =>
    stream(
      event({
        candidates: [
          {
            content: { parts: [{ text: "partial" }] },
            finishReason: "MAX_TOKENS",
          },
        ],
        usageMetadata: {
          promptTokenCount: 4,
          candidatesTokenCount: 2,
          totalTokenCount: 11,
        },
      }),
    ),
  );
  await assert.rejects(adapter.generate(input("gemini")), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "output_limit");
    assert.deepEqual(error.usage, {
      inputTokens: 4,
      outputTokens: 2,
      totalTokens: 11,
    });
    return true;
  });
});

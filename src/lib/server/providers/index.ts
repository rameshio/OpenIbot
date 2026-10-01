import type { ProviderId, Usage } from "../../../types";
import type {
  Fetcher,
  GenerateInput,
  GenerateResult,
  ProviderAdapter,
} from "./types";
import {
  cancellationError,
  ProviderError,
  providerResponseError,
} from "./errors";
import { consumeSSE, type ServerSentEvent } from "./sse";

export { ProviderError } from "./errors";
export type { ProviderAdapter, GenerateInput, GenerateResult } from "./types";

type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const string = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;

const endpoints: Record<Exclude<ProviderId, "gemini">, string> = {
  openai: "https://api.openai.com/v1/responses",
  anthropic: "https://api.anthropic.com/v1/messages",
  xai: "https://api.x.ai/v1/chat/completions",
  cohere: "https://api.cohere.com/v2/chat",
};

function requestFor(input: GenerateInput): {
  url: string;
  headers: Record<string, string>;
  body: ObjectValue;
} {
  if (!input.apiKey.trim() || /[\r\n]/.test(input.apiKey))
    throw new ProviderError("invalid_key");
  // IDs are opaque user choices, but cannot become paths, hosts, or query parameters.
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(input.modelId) ||
    input.modelId.includes("..")
  )
    throw new ProviderError("model_unavailable");
  if (
    !Number.isSafeInteger(input.maxOutputTokens) ||
    input.maxOutputTokens < 1 ||
    input.maxOutputTokens > 32_768
  )
    throw new ProviderError("output_limit");
  const system =
    input.system +
    (input.json
      ? "\nReturn exactly one valid JSON object. Do not wrap it in Markdown or include commentary."
      : "");
  const messages = [
    { role: "system", content: system },
    { role: "user", content: input.prompt },
  ];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (input.provider === "gemini") {
    headers["x-goog-api-key"] = input.apiKey;
    const model = input.modelId.startsWith("models/")
      ? input.modelId.slice(7)
      : input.modelId;
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      headers,
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          maxOutputTokens: input.maxOutputTokens,
          candidateCount: 1,
        },
      },
    };
  }
  if (!Object.hasOwn(endpoints, input.provider))
    throw new ProviderError("model_unavailable");
  if (input.provider === "anthropic") {
    headers["x-api-key"] = input.apiKey;
    headers["anthropic-version"] = "2023-06-01";
    return {
      url: endpoints.anthropic,
      headers,
      body: {
        model: input.modelId,
        system,
        messages: [{ role: "user", content: input.prompt }],
        max_tokens: input.maxOutputTokens,
        stream: true,
      },
    };
  }
  headers.Authorization = `Bearer ${input.apiKey}`;
  if (input.provider === "openai")
    return {
      url: endpoints.openai,
      headers,
      body: {
        model: input.modelId,
        instructions: system,
        input: input.prompt,
        max_output_tokens: input.maxOutputTokens,
        stream: true,
        store: false,
      },
    };
  if (input.provider === "xai")
    return {
      url: endpoints.xai,
      headers,
      body: {
        model: input.modelId,
        messages,
        max_tokens: input.maxOutputTokens,
        stream: true,
        stream_options: { include_usage: true },
      },
    };
  return {
    url: endpoints.cohere,
    headers,
    body: {
      model: input.modelId,
      messages,
      max_tokens: input.maxOutputTokens,
      stream: true,
    },
  };
}

function usageFrom(
  value: unknown,
  keys: [string, string, string?],
  previous: Usage | null = null,
): Usage | null {
  const data = object(value);
  const inputTokens = number(data[keys[0]]) ?? previous?.inputTokens ?? null;
  const outputTokens = number(data[keys[1]]) ?? previous?.outputTokens ?? null;
  const totalTokens =
    (keys[2] ? number(data[keys[2]]) : null) ?? previous?.totalTokens ?? null;
  return inputTokens === null && outputTokens === null && totalTokens === null
    ? null
    : { inputTokens, outputTokens, totalTokens };
}

function machineCode(value: unknown): string | undefined {
  const error = object(value);
  const details = array(error.details).map(object);
  // Google uses API_KEY_INVALID in google.rpc.ErrorInfo even when the HTTP status is 400.
  const detail = details.find((item) =>
    ["API_KEY_INVALID", "API_KEY_EXPIRED"].includes(string(item.reason) ?? ""),
  );
  return (
    string(detail?.reason) ??
    string(error.code) ??
    string(error.type) ??
    string(error.status)
  );
}

async function httpError(response: Response): Promise<ProviderError> {
  let parsed: unknown;
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let text = "";
    try {
      while (text.length <= 16_384) {
        const part = await reader.read();
        if (part.done) break;
        text += decoder.decode(part.value, { stream: true });
      }
      if (text.length <= 16_384) parsed = JSON.parse(text + decoder.decode());
    } catch {
      /* A provider error does not require a JSON body. */
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
  return providerResponseError(
    response.status,
    machineCode(object(parsed).error ?? parsed),
  );
}

function parser(input: GenerateInput) {
  let text = "";
  let usage: Usage | null = null;
  let finishReason = "";
  let terminal = false;
  const textBlocks = new Set<number>();
  function append(value: unknown) {
    if (typeof value !== "string" || !value) return;
    if (text.length + value.length > 24_000)
      throw new ProviderError("output_limit");
    text += value;
    input.onText?.(value);
  }
  function finish(reason: unknown, successful: string[]) {
    const actual = string(reason);
    if (!actual) throw new ProviderError("incomplete_response");
    if (
      [
        "MAX_TOKENS",
        "max_tokens",
        "length",
        "max_output_tokens",
        "model_context_window_exceeded",
      ].includes(actual)
    )
      throw new ProviderError("output_limit");
    if (
      [
        "SAFETY",
        "RECITATION",
        "BLOCKLIST",
        "PROHIBITED_CONTENT",
        "SPII",
        "IMAGE_SAFETY",
        "IMAGE_PROHIBITED_CONTENT",
        "IMAGE_RECITATION",
        "ESCALATION",
        "refusal",
        "content_filter",
        "ERROR_TOXIC",
      ].includes(actual)
    )
      throw new ProviderError("refusal");
    if (!successful.includes(actual))
      throw new ProviderError("provider_failure");
    finishReason = actual;
  }
  function onEvent(event: ServerSentEvent): boolean {
    if (event.data === "[DONE]") {
      if (input.provider !== "xai" || !finishReason)
        throw new ProviderError("incomplete_response");
      terminal = true;
      return true;
    }
    let value: unknown;
    try {
      value = JSON.parse(event.data);
    } catch {
      throw new ProviderError("incomplete_response");
    }
    const data = object(value);
    const type = string(data.type) ?? event.event;
    if (data.error || type === "error") {
      const error = object(data.error ?? data);
      throw providerResponseError(
        number(error.code) ?? undefined,
        machineCode(error),
      );
    }
    if (input.provider === "gemini") {
      const feedback = object(data.promptFeedback);
      if (
        feedback.blockReason &&
        feedback.blockReason !== "BLOCK_REASON_UNSPECIFIED"
      )
        throw new ProviderError("refusal");
      usage = usageFrom(
        data.usageMetadata,
        ["promptTokenCount", "candidatesTokenCount", "totalTokenCount"],
        usage,
      );
      const candidate = object(array(data.candidates)[0]);
      for (const part of array(object(candidate.content).parts).map(object))
        if (part.thought !== true) append(part.text);
      if (candidate.finishReason) {
        finish(candidate.finishReason, ["STOP"]);
        terminal = true;
      }
    } else if (input.provider === "openai") {
      if (type.startsWith("response.refusal."))
        throw new ProviderError("refusal");
      if (type === "response.output_text.delta") append(data.delta);
      if (type === "response.failed")
        throw providerResponseError(
          undefined,
          machineCode(object(data.response).error),
        );
      if (type === "response.incomplete") {
        const reason = object(object(data.response).incomplete_details).reason;
        if (reason === "max_output_tokens")
          throw new ProviderError("output_limit");
        if (reason === "content_filter") throw new ProviderError("refusal");
        throw new ProviderError("incomplete_response");
      }
      if (type === "response.completed") {
        const response = object(data.response);
        if (
          array(response.output)
            .map(object)
            .some((item) =>
              array(item.content)
                .map(object)
                .some((part) => part.type === "refusal"),
            )
        )
          throw new ProviderError("refusal");
        finish(response.status, ["completed"]);
        usage = usageFrom(response.usage, [
          "input_tokens",
          "output_tokens",
          "total_tokens",
        ]);
        terminal = true;
      }
    } else if (input.provider === "anthropic") {
      if (type === "message_start")
        usage = usageFrom(
          object(data.message).usage,
          ["input_tokens", "output_tokens"],
          usage,
        );
      if (type === "content_block_start") {
        const block = object(data.content_block);
        if (block.type === "text" && typeof data.index === "number") {
          textBlocks.add(data.index);
          append(block.text);
        }
      }
      if (type === "content_block_delta") {
        const delta = object(data.delta);
        if (
          delta.type === "text_delta" &&
          textBlocks.has(number(data.index) ?? -1)
        )
          append(delta.text);
      }
      if (type === "message_delta") {
        usage = usageFrom(data.usage, ["input_tokens", "output_tokens"], usage);
        if (object(data.delta).stop_reason)
          finish(object(data.delta).stop_reason, ["end_turn", "stop_sequence"]);
      }
      if (type === "message_stop") {
        if (!finishReason) throw new ProviderError("incomplete_response");
        terminal = true;
      }
    } else if (input.provider === "xai") {
      usage = usageFrom(
        data.usage,
        ["prompt_tokens", "completion_tokens", "total_tokens"],
        usage,
      );
      const choice = object(
        array(data.choices).find((item) => object(item).index === 0),
      );
      const delta = object(choice.delta);
      if (typeof delta.refusal === "string" && delta.refusal)
        throw new ProviderError("refusal");
      append(delta.content);
      if (choice.finish_reason) finish(choice.finish_reason, ["stop"]);
    } else {
      const delta = object(data.delta);
      const content = object(object(delta.message).content);
      if (
        type === "content-start" &&
        content.type === "text" &&
        typeof data.index === "number"
      ) {
        textBlocks.add(data.index);
        append(content.text);
      }
      if (
        type === "content-delta" &&
        textBlocks.has(number(data.index) ?? -1) &&
        (!content.type || content.type === "text")
      )
        append(content.text);
      if (type === "message-end") {
        usage = usageFrom(object(delta.usage).tokens, [
          "input_tokens",
          "output_tokens",
        ]);
        finish(delta.finish_reason, ["COMPLETE", "STOP_SEQUENCE"]);
        terminal = true;
      }
    }
    return terminal;
  }
  function result(): GenerateResult {
    if (!terminal || !finishReason)
      throw new ProviderError("incomplete_response");
    if (!text.trim()) throw new ProviderError("provider_failure");
    return { text, usage, finishReason };
  }
  return { onEvent, result, usage: () => usage };
}

/** Server-side only. Each invocation makes exactly one request to the selected provider. */
export function createProviderAdapter(
  fetcher: Fetcher = fetch,
): ProviderAdapter {
  return {
    async generate(input) {
      if (input.signal.aborted) throw cancellationError(input.signal);
      const request = requestFor(input);
      const controller = new AbortController();
      let parsedStream: ReturnType<typeof parser> | undefined;
      const cancel = () => controller.abort(input.signal.reason);
      input.signal.addEventListener("abort", cancel, { once: true });
      try {
        const response = await fetcher(request.url, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify(request.body),
          signal: controller.signal,
          redirect: "error",
          cache: "no-store",
        });
        if (controller.signal.aborted)
          throw cancellationError(controller.signal);
        if (!response.ok) throw await httpError(response);
        if (
          !response.body ||
          !response.headers
            .get("content-type")
            ?.toLowerCase()
            .includes("text/event-stream")
        ) {
          await response.body?.cancel().catch(() => undefined);
          throw new ProviderError("incomplete_response");
        }
        parsedStream = parser(input);
        await consumeSSE(
          response.body,
          controller.signal,
          parsedStream.onEvent,
        );
        return parsedStream.result();
      } catch (error) {
        if (error instanceof ProviderError) {
          error.usage = parsedStream?.usage();
          throw error;
        }
        if (controller.signal.aborted)
          throw cancellationError(controller.signal);
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "TimeoutError"
        )
          throw new ProviderError("timeout");
        throw new ProviderError("network");
      } finally {
        input.signal.removeEventListener("abort", cancel);
        controller.abort();
      }
    },
  };
}

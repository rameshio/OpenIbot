import { cancellationError, ProviderError } from "./errors";

export interface ServerSentEvent {
  event: string;
  data: string;
}

/** Parse fragmented UTF-8 SSE without retaining the full (possibly reasoning-heavy) stream. */
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onEvent: (event: ServerSentEvent) => boolean,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let totalBytes = 0;
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  function dispatch(block: string): boolean {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split(/\r\n|\r|\n/)) {
      if (line.startsWith(":")) continue;
      const separator = line.indexOf(":");
      const field = separator < 0 ? line : line.slice(0, separator);
      let value = separator < 0 ? "" : line.slice(separator + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") event = value;
      if (field === "data") data.push(value);
    }
    return data.length > 0 && onEvent({ event, data: data.join("\n") });
  }
  try {
    while (true) {
      if (signal.aborted) throw cancellationError(signal);
      const { value, done } = await reader.read();
      if (signal.aborted) throw cancellationError(signal);
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > 4_000_000) throw new ProviderError("output_limit");
      buffer += decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n|\r\r/.exec(buffer))) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (dispatch(block)) return;
      }
      if (buffer.length > 256_000) throw new ProviderError("output_limit");
    }
    buffer += decoder.decode();
    // An event without its blank-line delimiter is incomplete, even when its JSON parses.
    if (buffer.trim() && !buffer.trim().startsWith(":"))
      throw new ProviderError("incomplete_response");
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

import { isExactModelId, isProviderId } from "@/lib/models";
import { createProviderAdapter, ProviderError } from "@/lib/server/providers";
import {
  assertLocalRequest,
  environmentCredential,
  errorResponse,
  getSession,
  HttpError,
  noStoreJson,
  readJson,
  sessionIsActive,
  sessionMetadata,
} from "@/lib/server/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const session = getSession(request)!;
    const body = await readJson(request, 8192);
    if (!isProviderId(body.provider))
      throw new HttpError(400, "This provider is not implemented.");
    const provider = body.provider;
    if (body.action !== "test" && body.action !== "disconnect")
      throw new HttpError(400, "Unknown connection action.");
    if (body.action === "test" && session.activeRuns.size)
      throw new HttpError(
        409,
        "Stop the active run before changing connections.",
      );
    const version = (session.versions.get(provider) ?? 0) + 1;
    session.versions.set(provider, version);
    session.controllers.forEach((controller) => controller.abort());
    session.credentials.delete(provider);
    session.errors.delete(provider);
    if (body.action === "disconnect")
      return noStoreJson(sessionMetadata(session));
    if (!isExactModelId(body.modelId))
      throw new HttpError(
        400,
        "Enter an exact model ID from the provider's documentation.",
      );
    const modelId = body.modelId;
    const entered = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (entered.length > 4096 || /[\r\n]/.test(entered))
      throw new HttpError(400, "Enter a valid API key.");
    const source = entered ? ("session" as const) : ("environment" as const);
    const apiKey = entered || environmentCredential(provider, modelId);
    const controller = new AbortController();
    const timeout = setTimeout(
      () =>
        controller.abort(
          new DOMException("Connection test timed out", "TimeoutError"),
        ),
      20000,
    );
    session.controllers.add(controller);
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) controller.abort();
    try {
      await createProviderAdapter().generate({
        provider,
        modelId,
        apiKey,
        system: "Return only OK. Do not use tools or include reasoning.",
        prompt: "Connection test: reply OK.",
        maxOutputTokens: 512,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        !sessionIsActive(session) ||
        session.versions.get(provider) !== version
      )
        throw new HttpError(409, "Connection test interrupted. Test again.");
      session.credentials.set(provider, { apiKey, modelId, source });
      return noStoreJson(sessionMetadata(session));
    } catch (error) {
      const message =
        error instanceof ProviderError
          ? error.message
          : error instanceof HttpError
            ? error.message
            : "Connection test failed or timed out. Check the key and exact model, then retry.";
      if (
        sessionIsActive(session) &&
        session.versions.get(provider) === version
      )
        session.errors.set(provider, {
          provider,
          modelId,
          source,
          status: "error",
          error: message,
        });
      const status =
        error instanceof ProviderError &&
        error.status &&
        error.status >= 400 &&
        error.status <= 599
          ? error.status
          : 400;
      return noStoreJson(
        { ...sessionMetadata(session), error: message },
        status,
      );
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", abort);
      session.controllers.delete(controller);
    }
  } catch (error) {
    return errorResponse(error);
  }
}

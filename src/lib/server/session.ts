import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isExactModelId, PROVIDERS } from "../models";
import type { ModelRef, ProviderConnection, ProviderId } from "../../types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
interface Credential {
  apiKey: string;
  modelId: string;
  source: "session" | "environment";
}
export interface WorkspaceSession {
  id: string;
  expires: number;
  credentials: Map<ProviderId, Credential>;
  errors: Map<ProviderId, ProviderConnection>;
  controllers: Set<AbortController>;
  versions: Map<ProviderId, number>;
  usedRuns: Set<string>;
  activeRuns: Map<string, AbortController>;
}
interface Registry {
  sessions: Map<string, WorkspaceSession>;
  loginFailures: number;
  loginWindow: number;
}
const globalRegistry = globalThis as typeof globalThis & {
  __ibotServerSessions?: Registry;
};
const registry = (globalRegistry.__ibotServerSessions ??= {
  sessions: new Map(),
  loginFailures: 0,
  loginWindow: Date.now(),
});
export const COOKIE = "ibot_local_session";

/** Auth routes only accept same-origin loopback requests. CLI also binds to loopback. */
export function assertLocalRequest(request: Request) {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let base: URL;
  try {
    base = new URL(`http://${host}`);
  } catch {
    throw new HttpError(403, "Local workspace access only.");
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) ||
    base.username ||
    base.password
  )
    throw new HttpError(403, "Local workspace access only.");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new HttpError(403, "Open IBot directly on localhost.");
  const origin = request.headers.get("origin");
  if (origin) {
    let source: URL;
    try {
      source = new URL(origin);
    } catch {
      throw new HttpError(403, "Invalid request origin.");
    }
    if (source.host !== host || !["http:", "https:"].includes(source.protocol))
      throw new HttpError(403, "Cross-origin requests are not allowed.");
  } else if (request.method !== "GET")
    throw new HttpError(403, "A same-origin browser request is required.");
  if (request.headers.get("x-ibot-request") !== "1")
    throw new HttpError(403, "Use the IBot workspace to make this request.");
}
export async function readJson(
  request: Request,
  limit = 32768,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Send a JSON request.");
  if (Number(request.headers.get("content-length")) > limit)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON request.");
  } finally {
    reader.releaseLock();
  }
}
export function noStoreJson(
  value: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export function errorResponse(error: unknown) {
  return noStoreJson(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "The request failed. Please try again.",
    },
    error instanceof HttpError ? error.status : 500,
  );
}
function sweep() {
  for (const session of registry.sessions.values())
    if (session.expires <= Date.now()) destroySession(session);
}
export function destroySession(session: WorkspaceSession) {
  session.controllers.forEach((controller) => controller.abort());
  session.credentials.clear();
  session.errors.clear();
  registry.sessions.delete(session.id);
}
function newSession(): WorkspaceSession {
  sweep();
  if (registry.sessions.size >= 12)
    throw new HttpError(
      429,
      "Too many local sessions. Close or lock another workspace first.",
    );
  const session: WorkspaceSession = {
    id: randomBytes(32).toString("hex"),
    expires: Date.now() + 8 * 60 * 60 * 1000,
    credentials: new Map(),
    errors: new Map(),
    controllers: new Set(),
    versions: new Map(),
    usedRuns: new Set(),
    activeRuns: new Map(),
  };
  registry.sessions.set(session.id, session);
  return session;
}
export function login(password: unknown) {
  const expected = process.env.IBOT_LOCAL_PASSWORD;
  if (!expected || expected.length < 16)
    throw new HttpError(
      503,
      "Set IBOT_LOCAL_PASSWORD to at least 16 characters in .env.local, then restart IBot.",
    );
  if (Date.now() - registry.loginWindow > 60000) {
    registry.loginWindow = Date.now();
    registry.loginFailures = 0;
  }
  if (registry.loginFailures >= 10)
    throw new HttpError(
      429,
      "Too many unlock attempts. Wait one minute and try again.",
    );
  const supplied =
    typeof password === "string" && password.length <= 1024 ? password : "";
  if (
    !timingSafeEqual(
      createHash("sha256").update(supplied).digest(),
      createHash("sha256").update(expected).digest(),
    )
  ) {
    registry.loginFailures++;
    throw new HttpError(401, "Incorrect workspace password.");
  }
  registry.loginFailures = 0;
  return newSession();
}
export function getSession(
  request: Request,
  required = true,
): WorkspaceSession | undefined {
  sweep();
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  const session = token ? registry.sessions.get(token) : undefined;
  if (!session && required)
    throw new HttpError(
      401,
      "Unlock your local workspace in API Keys before continuing.",
    );
  return session;
}
export function rotateSession(session: WorkspaceSession) {
  destroySession(session);
  return newSession();
}
export function sessionCookie(
  session: WorkspaceSession | null,
  request: Request,
) {
  return `${COOKIE}=${session?.id ?? ""}; HttpOnly; SameSite=Strict; Path=/api; ${session ? "Max-Age=28800" : "Max-Age=0"}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function sessionIsActive(session: WorkspaceSession) {
  return (
    registry.sessions.get(session.id) === session &&
    session.expires > Date.now()
  );
}
export function sessionMetadata(session?: WorkspaceSession) {
  const environment = session
    ? PROVIDERS.flatMap((provider) => {
        const modelId = process.env[provider.envModel];
        return process.env[provider.envKey] && isExactModelId(modelId)
          ? [{ provider: provider.id, modelId }]
          : [];
      })
    : [];
  const connections: ProviderConnection[] = session
    ? [...session.credentials.entries()].map(([provider, credential]) => ({
        provider,
        modelId: credential.modelId,
        source: credential.source,
        status: "connected",
      }))
    : [];
  if (session) connections.push(...session.errors.values());
  return { unlocked: !!session, connections, environment };
}
export function resolveCredential(
  session: WorkspaceSession,
  model: ModelRef,
): { apiKey: string } {
  if (!sessionIsActive(session))
    throw new HttpError(
      401,
      "The session expired. Unlock the workspace again.",
    );
  const credential = session.credentials.get(model.provider);
  if (!credential || credential.modelId !== model.modelId)
    throw new HttpError(
      400,
      `Test and connect the exact ${model.provider} model in API Keys before starting.`,
    );
  return { apiKey: credential.apiKey };
}
export function environmentCredential(provider: ProviderId, modelId: string) {
  const spec = PROVIDERS.find((item) => item.id === provider)!;
  const key = process.env[spec.envKey];
  if (!key || process.env[spec.envModel] !== modelId)
    throw new HttpError(
      400,
      `Set ${spec.envKey} and ${spec.envModel}, or enter a session key.`,
    );
  return key;
}

import { parseModelKey } from "@/lib/models";
import { executeRun, validateRunRequest } from "@/lib/server/execution";
import { createProviderAdapter } from "@/lib/server/providers";
import {
  assertLocalRequest,
  errorResponse,
  getSession,
  HttpError,
  noStoreJson,
  readJson,
  resolveCredential,
} from "@/lib/server/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 190;
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const session = getSession(request)!;
    const body = await readJson(request, 49152);
    let run;
    try {
      run = validateRunRequest(body);
    } catch {
      throw new HttpError(
        400,
        "Invalid task configuration. Use at most four named agents with exact connected models and valid dependencies.",
      );
    }
    resolveCredential(session, run.lead);
    for (const member of run.team ?? []) {
      const ref = parseModelKey(member.model);
      if (!ref)
        throw new HttpError(
          400,
          "Choose an exact connected model for every agent.",
        );
      resolveCredential(session, ref);
    }
    if (session.activeRuns.size >= 1)
      throw new HttpError(
        409,
        "This session already has an active run. Stop it or wait for it to finish.",
      );
    if (session.usedRuns.has(run.runId))
      throw new HttpError(
        409,
        "This execution attempt already started. Use Retry for a new attempt.",
      );
    if (session.usedRuns.size >= 100)
      throw new HttpError(
        429,
        "Session run limit reached. Lock and unlock to start a new session.",
      );
    session.usedRuns.add(run.runId);
    const controller = new AbortController();
    session.controllers.add(controller);
    session.activeRuns.set(run.runId, controller);
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) controller.abort();
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        const heartbeat = setInterval(() => {
          if (!closed) {
            try {
              streamController.enqueue(encoder.encode(": heartbeat\n\n"));
            } catch {
              controller.abort();
            }
          }
        }, 10000);
        void executeRun(run, {
          generate: createProviderAdapter().generate,
          resolveModel: (ref) => resolveCredential(session, ref),
          signal: controller.signal,
          emit: (event) => {
            if (!closed) {
              try {
                streamController.enqueue(
                  encoder.encode(
                    `id: ${event.eventId}\ndata: ${JSON.stringify(event)}\n\n`,
                  ),
                );
              } catch {
                controller.abort();
              }
            }
          },
        })
          .catch(() => {
            /* No raw provider exception or credentials leave this boundary. */
          })
          .finally(() => {
            clearInterval(heartbeat);
            session.controllers.delete(controller);
            session.activeRuns.delete(run.runId);
            request.signal.removeEventListener("abort", abort);
            if (!closed) {
              closed = true;
              try {
                streamController.close();
              } catch {
                /* Client disconnected. */
              }
            }
          });
      },
      cancel() {
        closed = true;
        controller.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertLocalRequest(request);
    const session = getSession(request)!;
    const body = await readJson(request, 1024);
    if (typeof body.runId !== "string")
      throw new HttpError(400, "Execution attempt is required.");
    session.activeRuns.get(body.runId)?.abort();
    return noStoreJson({ stopped: true });
  } catch (error) {
    return errorResponse(error);
  }
}

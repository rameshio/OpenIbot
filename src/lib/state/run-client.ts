"use client";
import type { RunEvent, RunRequest, Task } from "../../types";
import { localApi } from "./connection-store";
import { parseRunEvent } from "./run-events";
import { getWorkspace, workspaceActions } from "./workspace-store";

const active = new Map<string, AbortController>();
export function createLiveTask(
  request: RunRequest,
  previousRunId?: string,
): Task {
  return {
    id: request.taskId,
    title: request.prompt.slice(0, 70),
    prompt: request.prompt,
    createdAt: Date.now(),
    startedAt: Date.now(),
    status: "running",
    phase: request.mode === "auto" ? "Planning" : "Creating agents",
    tick: 0,
    agents: [],
    files: [],
    result: "",
    model: `${request.lead.provider}:${request.lead.modelId}`,
    tools: [],
    mode: "live",
    runMode: request.mode,
    runId: request.runId,
    previousRunId,
    sequence: 0,
    usage: null,
    modelCalls: 0,
    context: request.context,
    requestedTeam: request.team,
  };
}
/** Handles fragmented SSE without replaying events. A missing terminal event is a failed run. */
export async function consumeRunStream(
  response: Response,
  onEvent: (event: RunEvent) => void,
  signal: AbortSignal,
) {
  if (
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  )
    throw new Error("The execution stream could not be opened. Try again.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let terminal = false;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (!terminal) {
      if (signal.aborted) throw new Error("Task stopped.");
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 1_000_000)
        throw new Error("The execution stream exceeded its event limit.");
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const event = parseRunEvent(JSON.parse(data));
        onEvent(event);
        if (event.type === "done") {
          terminal = true;
          break;
        }
      }
    }
    if (!terminal && !signal.aborted)
      throw new Error(
        "The connection was interrupted. Partial output has been kept; retry to start a new attempt.",
      );
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function executeClientRun(request: RunRequest) {
  const controller = new AbortController();
  active.set(request.runId, controller);
  const deadline = setTimeout(() => {
    workspaceActions.interrupt(
      request.runId,
      "The run timed out. Partial output has been kept.",
    );
    controller.abort();
    void localApi("/api/runs", { runId: request.runId }, "DELETE").catch(
      () => {},
    );
  }, 190_000);
  try {
    const response = await localApi(
      "/api/runs",
      request,
      "POST",
      controller.signal,
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : "Cannot start this run. Check your provider connection and retry.",
      );
    }
    await consumeRunStream(
      response,
      (event) => {
        if (event.taskId !== request.taskId || event.runId !== request.runId)
          return;
        workspaceActions.event(event);
      },
      controller.signal,
    );
    if (
      !controller.signal.aborted &&
      getWorkspace().tasks.find((task) => task.runId === request.runId)
        ?.status === "running"
    )
      throw new Error(
        "The run ended without a matching completion event. Partial output has been kept.",
      );
  } catch (error) {
    if (!controller.signal.aborted) {
      workspaceActions.interrupt(
        request.runId,
        error instanceof Error && error.name !== "TypeError"
          ? error.message
          : "Cannot reach the server. Check the connection; partial output has been kept.",
      );
      controller.abort();
      void localApi("/api/runs", { runId: request.runId }, "DELETE").catch(
        () => {},
      );
    }
  } finally {
    clearTimeout(deadline);
    active.delete(request.runId);
  }
}
export function cancelClientRun(task: Task) {
  if (!task.runId) return;
  workspaceActions.interrupt(
    task.runId,
    "Stopped by you. Partial output has been kept.",
    true,
  );
  active.get(task.runId)?.abort();
  void localApi("/api/runs", { runId: task.runId }, "DELETE").catch(() => {});
}
export function cancelAllRuns() {
  for (const task of getWorkspace().tasks)
    if (task.mode === "live" && task.status === "running")
      cancelClientRun(task);
}

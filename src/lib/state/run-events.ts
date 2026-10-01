import type { RunEvent, Task } from "../../types";
import {
  cleanAgent,
  cleanFile,
  count,
  isAgent,
  isTaskFile,
  isUsage,
  phases,
  record,
} from "./validation";
export function parseRunEvent(value: unknown): RunEvent {
  if (
    !record(value) ||
    typeof value.taskId !== "string" ||
    typeof value.runId !== "string" ||
    !Number.isSafeInteger(value.sequence) ||
    (value.sequence as number) < 1 ||
    value.eventId !== `${value.runId}:${value.sequence}` ||
    !count(value.timestamp)
  )
    throw new Error("Invalid execution event. Retry the task.");
  let valid = false;
  switch (value.type) {
    case "phase":
      valid =
        phases.includes(value.phase as string) &&
        typeof value.summary === "string";
      break;
    case "agents":
      valid =
        Array.isArray(value.agents) &&
        value.agents.length <= 4 &&
        value.agents.every(isAgent) &&
        new Set(value.agents.map((agent) => agent.id)).size ===
          value.agents.length;
      break;
    case "agent":
      valid = isAgent(value.agent);
      break;
    case "delta":
      valid =
        typeof value.target === "string" &&
        typeof value.text === "string" &&
        value.text.length <= 24_000;
      break;
    case "usage":
      valid = isUsage(value.usage) && count(value.modelCalls);
      break;
    case "files":
      valid =
        Array.isArray(value.files) &&
        value.files.length <= 6 &&
        value.files.every(isTaskFile);
      break;
    case "done":
      valid =
        ["completed", "failed", "stopped"].includes(value.status as string) &&
        (value.error === undefined || typeof value.error === "string");
      break;
  }
  if (!valid)
    throw new Error("Invalid execution update. Partial output has been kept.");
  return value as RunEvent;
}
export function applyRunEvent(task: Task, event: RunEvent): Task {
  if (
    task.mode !== "live" ||
    task.id !== event.taskId ||
    task.runId !== event.runId ||
    task.status !== "running" ||
    event.sequence <= (task.sequence ?? 0)
  )
    return task;
  if (event.sequence !== (task.sequence ?? 0) + 1)
    throw new Error(
      "Execution updates were interrupted. Partial output has been kept; retry to start a new attempt.",
    );
  const next = { ...task, sequence: event.sequence };
  switch (event.type) {
    case "phase":
      return { ...next, phase: event.phase, activity: event.summary };
    case "agents":
      return { ...next, agents: event.agents.map(cleanAgent) };
    case "agent": {
      if (!task.agents.some((agent) => agent.id === event.agent.id))
        throw new Error("Received an update for an unknown agent.");
      return {
        ...next,
        agents: task.agents.map((agent) =>
          agent.id === event.agent.id ? cleanAgent(event.agent) : agent,
        ),
      };
    }
    case "delta": {
      if (event.target === "result") {
        if (task.result.length + event.text.length > 24_000)
          throw new Error("Response output limit reached.");
        return { ...next, result: task.result + event.text };
      }
      const target = task.agents.find((agent) => agent.id === event.target);
      if (!target || target.output.length + event.text.length > 24_000)
        throw new Error("Invalid agent response update.");
      return {
        ...next,
        agents: task.agents.map((agent) =>
          agent.id === event.target
            ? { ...agent, output: agent.output + event.text }
            : agent,
        ),
      };
    }
    case "usage":
      return { ...next, usage: event.usage, modelCalls: event.modelCalls };
    case "files":
      return { ...next, files: event.files.map(cleanFile) };
    case "done":
      return {
        ...next,
        status: event.status,
        error: event.error,
        activity:
          event.status === "completed"
            ? "The response and generated files are ready."
            : (event.error ??
              `Execution ${event.status}. Partial output has been kept.`),
        finishedAt: event.timestamp,
        agents: task.agents.map((agent) =>
          ["waiting", "working"].includes(agent.status)
            ? {
                ...agent,
                status: event.status === "failed" ? "failed" : "stopped",
                activity: event.error ?? "Execution ended",
              }
            : agent,
        ),
      };
  }
}
export function interruptTask(
  task: Task,
  message: string,
  stopped = false,
): Task {
  if (task.status !== "running") return task;
  const status = stopped ? "stopped" : "failed";
  const files = new Map(task.files.map((file) => [file.id, file]));
  if (task.mode === "live") {
    const outputs = task.agents
      .filter((agent) => agent.output)
      .map((agent) => ({
        id: `${task.runId}-${agent.id}`,
        name: `${agent.id}${agent.status === "completed" ? "" : ".partial"}.md`,
        content: agent.output,
      }));
    if (task.result)
      outputs.push({
        id: `${task.runId}-result`,
        name: "final-response.partial.md",
        content: task.result,
      });
    for (const file of outputs)
      files.set(file.id, {
        ...file,
        language: "markdown",
        size: `${(new TextEncoder().encode(file.content).length / 1024).toFixed(1)} KB`,
      });
  }
  return {
    ...task,
    status,
    error: message,
    activity: message,
    finishedAt: Date.now(),
    files: [...files.values()],
    agents: task.agents.map((agent) =>
      agent.status === "working" || agent.status === "waiting"
        ? {
            ...agent,
            status: stopped ? "stopped" : "failed",
            activity: message,
          }
        : agent,
    ),
  };
}
export function followUpContext(task: Task): string {
  const result = task.result
    ? `Prior response:\n${task.result.slice(0, 7500)}`
    : "";
  const outputs = task.agents
    .filter((agent) => agent.output)
    .map((agent) => `${agent.name}: ${agent.output.slice(0, 1500)}`)
    .join("\n\n");
  return `Prior task: ${task.prompt.slice(0, 2000)}\nStatus: ${task.status}\n${result}\nContributions:\n${outputs}`.slice(
    0,
    12_000,
  );
}

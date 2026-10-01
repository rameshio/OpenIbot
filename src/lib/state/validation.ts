import { parseModelKey } from "../models";
import type { Agent, Task, TaskFile, TeamMember, Usage } from "../../types";
const models = ["Auto", "GPT", "Claude", "Gemini", "Grok", "Local Model"];
const roles = ["Planner", "Researcher", "Designer", "Developer", "Reviewer"];
export const phases = [
  "Planning",
  "Creating agents",
  "Agents working",
  "Reviewing",
  "Finalizing",
  "Completed",
];
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120_000;
}
export function count(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function choice(value: unknown, options: string[]) {
  return typeof value === "string" && options.includes(value);
}
function model(value: unknown) {
  return (
    typeof value === "string" &&
    (models.includes(value) || !!parseModelKey(value))
  );
}
export function isUsage(value: unknown): value is Usage | null {
  return (
    value === null ||
    (record(value) &&
      [value.inputTokens, value.outputTokens, value.totalTokens].every(
        (item) => item === null || count(item),
      ))
  );
}
export function isTeamMember(value: unknown): value is TeamMember {
  return (
    record(value) &&
    text(value.id) &&
    text(value.name) &&
    choice(value.role, roles) &&
    model(value.model) &&
    (value.dependsOn === undefined ||
      (Array.isArray(value.dependsOn) &&
        value.dependsOn.length <= 8 &&
        value.dependsOn.every(text)))
  );
}
export function isAgent(value: unknown): value is Agent {
  return (
    record(value) &&
    isTeamMember(value) &&
    text(value.goal) &&
    choice(value.status, [
      "waiting",
      "working",
      "completed",
      "stopped",
      "failed",
    ]) &&
    text(value.activity) &&
    count(value.progress) &&
    value.progress <= 100 &&
    count(value.toolCalls) &&
    count(value.elapsed) &&
    (value.tokens === null || count(value.tokens)) &&
    (value.usage === undefined || isUsage(value.usage)) &&
    (value.modelCalls === undefined || count(value.modelCalls)) &&
    text(value.output) &&
    Array.isArray(value.events) &&
    value.events.length <= 100 &&
    value.events.every(
      (event) =>
        record(event) &&
        text(event.id) &&
        text(event.label) &&
        text(event.time),
    )
  );
}
export function isTaskFile(value: unknown): value is TaskFile {
  return (
    record(value) &&
    text(value.id) &&
    text(value.name) &&
    text(value.language) &&
    text(value.content) &&
    text(value.size)
  );
}
export function isStoredTask(value: unknown): value is Task {
  return (
    record(value) &&
    text(value.id) &&
    text(value.title) &&
    text(value.prompt) &&
    count(value.createdAt) &&
    count(value.tick) &&
    choice(value.status, ["running", "completed", "stopped", "failed"]) &&
    choice(value.phase, phases) &&
    text(value.result) &&
    model(value.model) &&
    Array.isArray(value.tools) &&
    value.tools.every(text) &&
    Array.isArray(value.agents) &&
    value.agents.length <= 8 &&
    value.agents.every(isAgent) &&
    Array.isArray(value.files) &&
    value.files.length <= 12 &&
    value.files.every(isTaskFile) &&
    (value.mode === undefined || choice(value.mode, ["live", "demo"])) &&
    (value.runMode === undefined ||
      choice(value.runMode, ["single", "auto", "manual"])) &&
    (value.runId === undefined || text(value.runId)) &&
    (value.parentTaskId === undefined || text(value.parentTaskId)) &&
    (value.sequence === undefined || count(value.sequence)) &&
    (value.usage === undefined || isUsage(value.usage)) &&
    (value.error === undefined || text(value.error)) &&
    (value.context === undefined || text(value.context))
  );
}
export function cleanTeamMember(member: TeamMember): TeamMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    model: member.model,
    ...(member.dependsOn ? { dependsOn: [...member.dependsOn] } : {}),
  };
}
function cleanUsage(usage: Usage | null | undefined) {
  return usage
    ? {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      }
    : null;
}
export function cleanAgent(agent: Agent): Agent {
  return {
    ...cleanTeamMember(agent),
    goal: agent.goal,
    status: agent.status,
    activity: agent.activity,
    progress: agent.progress,
    toolCalls: agent.toolCalls,
    elapsed: agent.elapsed,
    tokens: agent.tokens,
    usage: cleanUsage(agent.usage),
    modelCalls: agent.modelCalls,
    mode: agent.mode === "live" ? "live" : "demo",
    error: typeof agent.error === "string" ? agent.error : undefined,
    events: agent.events.map((event) => ({
      id: event.id,
      label: event.label,
      time: event.time,
    })),
    output: agent.output,
  };
}
export function cleanFile(file: TaskFile): TaskFile {
  return {
    id: file.id,
    name: file.name,
    language: file.language,
    content: file.content,
    size: file.size,
  };
}
/** Explicit projection is intentional: credentials/unknown nested fields never enter persistence. */
export function cleanTask(task: Task): Task {
  return {
    id: task.id,
    title: task.title,
    prompt: task.prompt,
    createdAt: task.createdAt,
    status: task.status,
    phase: task.phase,
    activity: typeof task.activity === "string" ? task.activity : undefined,
    tick: task.tick,
    agents: task.agents.map(cleanAgent),
    files: task.files.map(cleanFile),
    result: task.result,
    model: task.model,
    tools: task.tools.filter((item) => typeof item === "string"),
    mode: task.mode === "live" ? "live" : "demo",
    runMode: task.runMode,
    runId: task.runId,
    previousRunId:
      typeof task.previousRunId === "string" ? task.previousRunId : undefined,
    parentTaskId:
      typeof task.parentTaskId === "string" ? task.parentTaskId : undefined,
    sequence: task.sequence,
    error: task.error,
    usage: cleanUsage(task.usage),
    modelCalls:
      typeof task.modelCalls === "number" ? task.modelCalls : undefined,
    startedAt: typeof task.startedAt === "number" ? task.startedAt : undefined,
    finishedAt:
      typeof task.finishedAt === "number" ? task.finishedAt : undefined,
    context: task.context,
    requestedTeam:
      Array.isArray(task.requestedTeam) &&
      task.requestedTeam.every(isTeamMember)
        ? task.requestedTeam.map(cleanTeamMember)
        : undefined,
  };
}
export function serializeWorkspace(value: {
  tasks: Task[];
  defaultModel: string;
  reducedMotion: boolean;
  savedTeam: TeamMember[] | null;
  executionMode: "live" | "demo";
}) {
  return JSON.stringify({
    version: 2,
    tasks: value.tasks.slice(0, 30).map(cleanTask),
    defaultModel: value.defaultModel,
    reducedMotion: value.reducedMotion,
    savedTeam: value.savedTeam?.map(cleanTeamMember) ?? null,
    executionMode: value.executionMode,
  });
}

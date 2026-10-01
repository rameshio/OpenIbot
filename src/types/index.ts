/** Live selections use provider:exact-model-id; legacy labels are demo-only. */
export type ModelId = string;
export type ProviderId = "gemini" | "openai" | "anthropic" | "xai" | "cohere";
export type ExecutionMode = "live" | "demo";
export type RunMode = "single" | "auto" | "manual";
export interface ModelRef {
  provider: ProviderId;
  modelId: string;
}
export interface Usage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}
export interface ProviderConnection {
  provider: ProviderId;
  modelId: string;
  status: "connected" | "error";
  source: "session" | "environment";
  error?: string;
}

export type AgentRole =
  "Planner" | "Researcher" | "Designer" | "Developer" | "Reviewer";

export interface TeamMember {
  id: string;
  name: string;
  role: AgentRole;
  model: ModelId;
  dependsOn?: string[];
}

export type AgentStatus =
  "waiting" | "working" | "completed" | "stopped" | "failed";

export interface ActivityEvent {
  id: string;
  label: string;
  time: string;
}

export interface Agent extends TeamMember {
  goal: string;
  status: AgentStatus;
  activity: string;
  progress: number;
  toolCalls: number;
  elapsed: number;
  tokens: number | null;
  usage?: Usage | null;
  modelCalls?: number;
  mode?: ExecutionMode;
  error?: string;
  events: ActivityEvent[];
  output: string;
}

export type TaskPhase =
  | "Planning"
  | "Creating agents"
  | "Agents working"
  | "Reviewing"
  | "Finalizing"
  | "Completed";
export type TaskStatus = "running" | "completed" | "stopped" | "failed";

export interface TaskFile {
  id: string;
  name: string;
  language: string;
  content: string;
  size: string;
}

export interface Task {
  id: string;
  title: string;
  prompt: string;
  createdAt: number;
  status: TaskStatus;
  phase: TaskPhase;
  tick: number;
  agents: Agent[];
  files: TaskFile[];
  result: string;
  model: ModelId;
  tools: string[];
  mode?: ExecutionMode;
  runMode?: RunMode;
  runId?: string;
  previousRunId?: string;
  parentTaskId?: string;
  activity?: string;
  sequence?: number;
  error?: string;
  usage?: Usage | null;
  modelCalls?: number;
  startedAt?: number;
  finishedAt?: number;
  context?: string;
  requestedTeam?: TeamMember[];
}

export interface PlanAgent extends TeamMember {
  goal: string;
  dependsOn: string[];
}
export interface TaskPlan {
  agents: PlanAgent[];
}
export interface RunRequest {
  taskId: string;
  runId: string;
  prompt: string;
  mode: RunMode;
  lead: ModelRef;
  team?: TeamMember[];
  context?: string;
}
export type RunEventPayload =
  | { type: "phase"; phase: TaskPhase; summary: string }
  | { type: "agents"; agents: Agent[] }
  | { type: "agent"; agent: Agent }
  | { type: "delta"; target: "result" | string; text: string }
  | { type: "usage"; usage: Usage | null; modelCalls: number }
  | { type: "files"; files: TaskFile[] }
  | { type: "done"; status: TaskStatus; error?: string };
export type RunEvent = RunEventPayload & {
  taskId: string;
  runId: string;
  eventId: string;
  sequence: number;
  timestamp: number;
};

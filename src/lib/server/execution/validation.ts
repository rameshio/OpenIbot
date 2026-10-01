import {
  isExactModelId,
  isProviderId,
  modelKey,
  parseModelKey,
} from "../../models";
import type {
  AgentRole,
  PlanAgent,
  RunRequest,
  TaskPlan,
  TeamMember,
} from "../../../types";

export const EXECUTION_LIMITS = Object.freeze({
  agents: 4,
  concurrency: 2,
  calls: 6,
  promptChars: 12_000,
  contextChars: 12_000,
  outputChars: 24_000,
  totalOutputChars: 120_000,
  timeoutMs: 180_000,
  planningTokens: 1_024,
  outputTokens: 2_048,
});
const roles: AgentRole[] = [
  "Planner",
  "Researcher",
  "Designer",
  "Developer",
  "Reviewer",
];
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

/** Only deliberately safe execution errors may be exposed to a client. */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly code = "validation",
    public readonly status: "failed" | "stopped" = "failed",
  ) {
    super(message);
    this.name = "ExecutionError";
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requiredText(value: unknown, limit: number, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new ExecutionError(
      `${label} must contain 1–${limit.toLocaleString()} characters.`,
    );
  return value.trim();
}
function identifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !idPattern.test(value))
    throw new ExecutionError(
      `${label} must be a valid identifier of at most 80 characters.`,
    );
  return value;
}
function member(value: unknown): TeamMember {
  if (!object(value))
    throw new ExecutionError(
      "Every agent must have a name, role, and exact model assignment.",
    );
  const id = identifier(value.id, "Agent ID");
  if (id === "result")
    throw new ExecutionError("The agent ID ‘result’ is reserved.");
  const name = requiredText(value.name, 40, "Agent name");
  if (!roles.includes(value.role as AgentRole))
    throw new ExecutionError("Every agent must have a supported role.");
  if (typeof value.model !== "string" || !parseModelKey(value.model))
    throw new ExecutionError(
      "Every agent needs an exact provider:model assignment.",
    );
  let dependsOn: string[] | undefined;
  if (value.dependsOn !== undefined) {
    if (
      !Array.isArray(value.dependsOn) ||
      value.dependsOn.length > EXECUTION_LIMITS.agents ||
      value.dependsOn.some((id) => typeof id !== "string")
    )
      throw new ExecutionError(
        "Agent dependencies must be a list of agent IDs.",
      );
    dependsOn = value.dependsOn as string[];
  }
  return {
    id,
    name,
    role: value.role as AgentRole,
    model: value.model,
    ...(dependsOn === undefined ? {} : { dependsOn: [...dependsOn] }),
  };
}

export function validatePlan(
  value: unknown,
  allowedModels: readonly string[],
): TaskPlan {
  if (
    !object(value) ||
    !Array.isArray(value.agents) ||
    value.agents.length < 1 ||
    value.agents.length > EXECUTION_LIMITS.agents
  )
    throw new ExecutionError("The plan must contain between 1 and 4 agents.");
  const allowed = new Set(allowedModels);
  const agents: PlanAgent[] = value.agents.map((raw) => {
    const parsed = member(raw);
    if (!object(raw) || !Array.isArray(raw.dependsOn))
      throw new ExecutionError(
        "Every planned agent must declare its dependencies.",
      );
    if (!allowed.has(parsed.model))
      throw new ExecutionError(
        "The plan requested a model that was not authorized for this run.",
      );
    return {
      ...parsed,
      goal: requiredText(raw.goal, 2_000, "Agent goal"),
      dependsOn: parsed.dependsOn ?? [],
    };
  });
  const byId = new Map<string, PlanAgent>();
  const names = new Set<string>();
  for (const agent of agents) {
    if (byId.has(agent.id))
      throw new ExecutionError("Every agent must have a unique ID.");
    if (names.has(agent.name.toLowerCase()))
      throw new ExecutionError("Every agent must have a unique name.");
    byId.set(agent.id, agent);
    names.add(agent.name.toLowerCase());
  }
  for (const agent of agents) {
    if (new Set(agent.dependsOn).size !== agent.dependsOn.length)
      throw new ExecutionError("An agent cannot repeat a dependency.");
    if (agent.dependsOn.includes(agent.id))
      throw new ExecutionError("An agent cannot depend on itself.");
    if (agent.dependsOn.some((dependency) => !byId.has(dependency)))
      throw new ExecutionError(
        "The plan references a missing agent dependency.",
      );
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new ExecutionError("Agent dependencies must not contain a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)!.dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const agent of agents) visit(agent.id);
  return { agents };
}

/** Manual assignments are preserved; only absent dependencies receive defaults. */
export function manualPlan(team: TeamMember[]): TaskPlan {
  const contributors = team
    .filter((agent) => agent.role !== "Reviewer")
    .map((agent) => agent.id);
  return validatePlan(
    {
      agents: team.map((agent) => ({
        ...agent,
        goal:
          agent.role === "Reviewer"
            ? "Review the supplied dependency outputs against the user's task. Identify issues and provide a clear reviewed deliverable."
            : `Contribute to the user's task in your assigned ${agent.role.toLowerCase()} role. Return a concrete deliverable.`,
        dependsOn:
          agent.dependsOn ?? (agent.role === "Reviewer" ? contributors : []),
      })),
    },
    team.map((agent) => agent.model),
  );
}

export function validateRunRequest(value: unknown): RunRequest {
  if (!object(value))
    throw new ExecutionError("A valid task request is required.");
  const taskId = identifier(value.taskId, "Task ID");
  const runId = identifier(value.runId, "Run ID");
  const prompt = requiredText(
    value.prompt,
    EXECUTION_LIMITS.promptChars,
    "Task prompt",
  );
  if (!["single", "auto", "manual"].includes(value.mode as string))
    throw new ExecutionError("Choose single, auto, or manual execution mode.");
  if (
    !object(value.lead) ||
    !isProviderId(value.lead.provider) ||
    !isExactModelId(value.lead.modelId)
  )
    throw new ExecutionError("Choose an exact provider and lead model ID.");
  const lead = { provider: value.lead.provider, modelId: value.lead.modelId };
  let context: string | undefined;
  if (value.context !== undefined) {
    if (
      typeof value.context !== "string" ||
      value.context.length > EXECUTION_LIMITS.contextChars
    )
      throw new ExecutionError(
        "Task context must be no more than 12,000 characters.",
      );
    context = value.context;
  }
  let team: TeamMember[] | undefined;
  if (value.mode === "manual") {
    if (
      !Array.isArray(value.team) ||
      !value.team.length ||
      value.team.length > EXECUTION_LIMITS.agents
    )
      throw new ExecutionError(
        "A manual team must contain between 1 and 4 agents.",
      );
    team = value.team.map(member);
    manualPlan(team);
  } else if (value.team !== undefined) {
    throw new ExecutionError(
      "Custom teams can only be supplied in manual mode.",
    );
  }
  // Re-parse through the shared model syntax so this validator and the resolver agree.
  if (!parseModelKey(modelKey(lead)))
    throw new ExecutionError("Choose a valid exact lead model.");
  return {
    taskId,
    runId,
    prompt,
    mode: value.mode as RunRequest["mode"],
    lead,
    ...(team ? { team } : {}),
    ...(context === undefined ? {} : { context }),
  };
}

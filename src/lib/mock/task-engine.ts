import type {
  ActivityEvent,
  Agent,
  AgentRole,
  ModelId,
  Task,
  TaskFile,
  TeamMember,
} from "../../types";

export const DEFAULT_TEAM: TeamMember[] = [
  { id: "planner", name: "Planner", role: "Planner", model: "Claude" },
  { id: "coder", name: "Coder", role: "Developer", model: "GPT" },
  { id: "researcher", name: "Researcher", role: "Researcher", model: "Gemini" },
  { id: "reviewer", name: "Reviewer", role: "Reviewer", model: "Grok" },
];

const AUTOMATIC_TEAM: TeamMember[] = [
  {
    id: "research",
    name: "Research Agent",
    role: "Researcher",
    model: "Claude",
  },
  { id: "design", name: "UI Designer", role: "Designer", model: "Gemini" },
  { id: "develop", name: "Developer", role: "Developer", model: "GPT" },
  { id: "review", name: "Reviewer", role: "Reviewer", model: "Grok" },
];

const MODELS: ModelId[] = [
  "Auto",
  "GPT",
  "Claude",
  "Gemini",
  "Grok",
  "Local Model",
];
const ROLES: AgentRole[] = [
  "Planner",
  "Researcher",
  "Designer",
  "Developer",
  "Reviewer",
];

const ROLE_CONTENT: Record<
  AgentRole,
  { goal: string; activities: string[]; output: string }
> = {
  Planner: {
    goal: "Turn the request into clear deliverables and a practical sequence of work.",
    activities: [
      "Mapping the requested deliverables",
      "Organizing the project milestones",
      "Preparing the handoff checklist",
    ],
    output:
      "Prepared a scoped brief, an ordered delivery plan, and acceptance criteria for the requested outcome.",
  },
  Researcher: {
    goal: "Identify the requirements, constraints, and useful context for the task.",
    activities: [
      "Organizing the task requirements",
      "Comparing possible approaches",
      "Preparing the requirements brief",
    ],
    output:
      "Organized the request into requirements, assumptions, and open decisions. No external research was performed in this demo.",
  },
  Designer: {
    goal: "Define a clear structure and presentation for the requested experience.",
    activities: [
      "Outlining the user experience",
      "Defining the visual hierarchy",
      "Preparing the presentation guidelines",
    ],
    output:
      "Outlined the primary user flow, content hierarchy, and responsive presentation. The plan is ready for visual exploration.",
  },
  Developer: {
    goal: "Translate the requirements into an actionable implementation plan.",
    activities: [
      "Mapping the implementation structure",
      "Preparing the core building blocks",
      "Packaging the sample deliverables",
    ],
    output:
      "Prepared an implementation outline and sample deliverables. Code has not been executed or deployed by this simulated agent.",
  },
  Reviewer: {
    goal: "Check the team deliverables against the original request and flag follow-up work.",
    activities: [
      "Checking the assembled deliverables",
      "Reviewing the acceptance checklist",
      "Preparing the final review notes",
    ],
    output:
      "Completed the simulated handoff review. The output is a starting point for review; no real code, factual, or security verification was performed.",
  },
};

function event(agentId: string, tick: number, label: string): ActivityEvent {
  return {
    id: `${agentId}-${tick}-${label.slice(0, 12)}`,
    label,
    time: `${String(Math.floor(tick / 60)).padStart(2, "0")}:${String(tick % 60).padStart(2, "0")}`,
  };
}

function titleFor(prompt: string): string {
  const firstLine =
    prompt
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? "Untitled task";
  return firstLine.length > 64
    ? `${firstLine.slice(0, 61).trimEnd()}…`
    : firstLine;
}

function makeAgent(member: TeamMember, prompt: string): Agent {
  const content = ROLE_CONTENT[member.role];
  return {
    ...member,
    name: member.name.trim(),
    goal: `${content.goal}\n\nTask: ${prompt}`,
    status: "waiting",
    activity:
      member.role === "Reviewer"
        ? "Waiting for team deliverables"
        : "Waiting for the task plan",
    progress: 0,
    toolCalls: 0,
    elapsed: 0,
    tokens: 0,
    events: [],
    output: "",
  };
}

export function validateTeam(team: TeamMember[]): string | null {
  if (team.length === 0) return "Add at least one agent to your team.";
  if (team.length > 8) return "A team can have up to 8 agents.";
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const member of team) {
    const name = member.name.trim();
    if (!name) return "Give every agent a name.";
    if (name.length > 40) return "Agent names must be 40 characters or fewer.";
    if (names.has(name.toLocaleLowerCase()))
      return "Give each agent a unique name.";
    if (!member.id || ids.has(member.id))
      return "Each agent needs a unique identifier.";
    if (!MODELS.includes(member.model))
      return "Select a supported model for every agent.";
    if (!ROLES.includes(member.role))
      return "Select a supported role for every agent.";
    names.add(name.toLocaleLowerCase());
    ids.add(member.id);
  }
  return null;
}

export function createTask(
  prompt: string,
  model: ModelId = "Auto",
  team?: TeamMember[],
  tools: string[] = [],
): Task {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) throw new Error("Describe a task before starting.");
  if (!MODELS.includes(model)) throw new Error("Select a supported model.");
  const members = team ?? AUTOMATIC_TEAM;
  const validation = validateTeam(members);
  if (validation) throw new Error(validation);
  return {
    id: crypto.randomUUID(),
    title: titleFor(trimmedPrompt),
    prompt: trimmedPrompt,
    createdAt: Date.now(),
    status: "running",
    phase: "Planning",
    tick: 0,
    agents: members.map((member) => makeAgent(member, trimmedPrompt)),
    files: [],
    result: "",
    model,
    tools: [...new Set(tools.map((tool) => tool.trim()).filter(Boolean))],
  };
}

function taskFocus(prompt: string): { deliverable: string; steps: string[] } {
  if (/dashboard|analytics|metrics/i.test(prompt)) {
    return {
      deliverable: "Dashboard experience",
      steps: [
        "Define the audience and the decisions the dashboard should support.",
        "Choose the key metrics, comparison periods, filters, and data states.",
        "Lay out an overview, trend charts, and a detailed records view.",
        "Check readable charts, keyboard access, and small-screen behavior.",
      ],
    };
  }
  if (/website|landing|portfolio|page|app|build|code|develop/i.test(prompt)) {
    return {
      deliverable: "Application implementation brief",
      steps: [
        "Extract the requested pages, audience, and primary action.",
        "Map the entry flow and the main content or interaction states.",
        "Define reusable components and their data requirements.",
        "Validate the primary flow, error states, accessibility, and responsive layout.",
      ],
    };
  }
  if (/research|compare|analy[sz]|report|study/i.test(prompt)) {
    return {
      deliverable: "Research and comparison brief",
      steps: [
        "Define the research question and the criteria for a useful answer.",
        "Identify primary sources to consult and facts that need verification.",
        "Organize a comparison using consistent criteria and explicit assumptions.",
        "Review the evidence gaps before making a recommendation.",
      ],
    };
  }
  if (/write|story|article|content|campaign|email|copy/i.test(prompt)) {
    return {
      deliverable: "Content development brief",
      steps: [
        "Identify the intended audience, voice, and desired response.",
        "Outline the main message and supporting sections.",
        "Prepare a first draft with a clear opening and next step.",
        "Review tone, factual claims, readability, and the requested format.",
      ],
    };
  }
  return {
    deliverable: "Task delivery brief",
    steps: [
      "Translate the supplied request into a concrete outcome.",
      "List the required inputs, constraints, and decisions.",
      "Break the work into focused deliverables with clear owners.",
      "Review each deliverable against the original request.",
    ],
  };
}

function file(
  id: string,
  name: string,
  language: string,
  content: string,
): TaskFile {
  const bytes = new TextEncoder().encode(content).length;
  return {
    id,
    name,
    language,
    content,
    size: `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`,
  };
}

function createFiles(task: Task): TaskFile[] {
  const focus = taskFocus(task.prompt);
  const slug =
    task.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "task";
  const brief = [
    `# ${task.title}`,
    "",
    "> Sample output · Generated by the local frontend demonstration. No model, external research, or code execution was used.",
    "",
    "## Original request",
    "",
    task.prompt,
    "",
    `## ${focus.deliverable}`,
    "",
    ...focus.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Assigned team",
    "",
    ...task.agents.map(
      (agent) => `- ${agent.name} · ${agent.model} · ${agent.role}`,
    ),
    "",
    "## Before production",
    "",
    "Confirm requirements, replace this illustrative outline with real deliverables, and perform appropriate validation.",
  ].join("\n");
  const plan = JSON.stringify(
    {
      sample: true,
      title: task.title,
      originalRequest: task.prompt,
      deliverable: focus.deliverable,
      leadModel: task.model,
      requestedTools: task.tools,
      milestones: focus.steps.map((description, index) => ({
        order: index + 1,
        description,
        status: "planned",
      })),
      team: task.agents.map(({ name, role, model }) => ({ name, role, model })),
    },
    null,
    2,
  );
  const review = [
    `# Review notes: ${task.title}`,
    "",
    "> Sample output · This is an illustrative review checklist, not evidence that real work was verified.",
    "",
    `Request: ${task.prompt}`,
    "",
    "## Handoff checklist",
    "",
    "- [ ] Confirm the brief covers every requirement in the original request.",
    `- [ ] Review the ${focus.deliverable.toLowerCase()} with the intended audience.`,
    "- [ ] Resolve assumptions and verify any factual claims.",
    "- [ ] Replace sample content and validate the actual deliverable.",
    "",
    "## Simulated team summaries",
    "",
    ...task.agents.flatMap((agent) => [
      `### ${agent.name} (${agent.model})`,
      "",
      agent.output,
      "",
    ]),
  ].join("\n");
  return [
    file(`${task.id}-brief`, `${slug}-brief.md`, "markdown", brief),
    file(`${task.id}-plan`, "delivery-plan.json", "json", plan),
    file(`${task.id}-review`, "review-notes.md", "markdown", review),
  ];
}

function updateAgent(
  agent: Agent,
  tick: number,
  startTick: number,
  duration: number,
  prompt: string,
): Agent {
  if (agent.status === "completed") return agent;
  if (tick < startTick) {
    if (tick === 3) {
      return {
        ...agent,
        events: [
          ...agent.events,
          event(agent.id, tick, `Assigned as ${agent.role.toLowerCase()}`),
        ],
      };
    }
    return agent;
  }
  const elapsed = Math.min(tick - startTick + 1, duration);
  const progress = Math.min(100, Math.round((elapsed / duration) * 100));
  const completed = progress === 100;
  const content = ROLE_CONTENT[agent.role];
  const activity = completed
    ? "Deliverable ready"
    : content.activities[Math.min(2, Math.floor(progress / 34))];
  const changed = agent.activity !== activity;
  return {
    ...agent,
    status: completed ? "completed" : "working",
    activity,
    elapsed,
    progress,
    toolCalls: Math.floor(progress / 17),
    tokens: Math.round(progress * (agent.role === "Developer" ? 32.6 : 18.4)),
    events: changed
      ? [...agent.events, event(agent.id, tick, activity)]
      : agent.events,
    output:
      progress < 35
        ? ""
        : `Sample output for “${titleFor(prompt)}”\n\n${content.output}`,
  };
}

/** One deterministic simulation second. Completed, stopped, and failed tasks are inert. */
export function advanceTask(task: Task): Task {
  if (task.status !== "running") return task;
  const tick = task.tick + 1;
  const contributors = task.agents.filter((agent) => agent.role !== "Reviewer");
  const hasReviewers = task.agents.some((agent) => agent.role === "Reviewer");
  const contributorEnd = contributors.length
    ? 6 + Math.min(contributors.length - 1, 3) + 16
    : 6;
  const reviewStart = contributorEnd + 1;
  const reviewEnd = hasReviewers ? reviewStart + 5 : contributorEnd;
  const completeAt = reviewEnd + 5;
  let contributorIndex = 0;
  const agents = task.agents.map((agent) => {
    if (agent.role === "Reviewer") {
      const updated = updateAgent(agent, tick, reviewStart, 6, task.prompt);
      return task.tools.length ? updated : { ...updated, toolCalls: 0 };
    }
    const start = 7 + Math.min(contributorIndex++, 3);
    const updated = updateAgent(agent, tick, start, 16, task.prompt);
    return task.tools.length ? updated : { ...updated, toolCalls: 0 };
  });
  const phase =
    tick >= completeAt
      ? "Completed"
      : tick > reviewEnd
        ? "Finalizing"
        : hasReviewers && tick >= reviewStart
          ? "Reviewing"
          : tick >= 7
            ? "Agents working"
            : tick >= 3
              ? "Creating agents"
              : "Planning";
  const next: Task = {
    ...task,
    tick,
    agents,
    phase,
    status: phase === "Completed" ? "completed" : "running",
  };
  if (tick > reviewEnd) {
    next.files = task.files.length ? task.files : createFiles(next);
  }
  if (phase === "Completed") {
    const focus = taskFocus(task.prompt);
    next.result = `Your team has prepared a ${focus.deliverable.toLowerCase()} for “${task.title}”.\n\nYou’ll find the project brief, a structured delivery plan, and review notes in Files. Open an agent to explore its contribution.\n\nThis is a simulated run with sample outputs. No external tools or AI providers were called.`;
  }
  return next;
}

export function stopTask(task: Task): Task {
  if (task.status !== "running") return task;
  return {
    ...task,
    status: "stopped",
    agents: task.agents.map((agent) =>
      agent.status === "completed"
        ? agent
        : {
            ...agent,
            status: "stopped",
            activity: "Stopped by you",
            events: [
              ...agent.events,
              event(agent.id, task.tick, "Stopped by you"),
            ],
          },
    ),
  };
}

export function retryTask(task: Task): Task {
  const team = task.agents.map(({ id, name, role, model }) => ({
    id,
    name,
    role,
    model,
  }));
  return {
    ...createTask(task.prompt, task.model, team, task.tools),
    id: task.id,
    createdAt: task.createdAt,
  };
}

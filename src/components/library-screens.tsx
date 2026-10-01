"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  Compass,
  GitBranch,
  Layers3,
  MessageSquare,
  Plus,
  Search,
  SlidersHorizontal,
  Users2,
} from "lucide-react";
import { DEFAULT_TEAM } from "@/lib/mock/task-engine";
import { ProviderMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { modelLabel, parseModelKey } from "@/lib/models";
import { useConnections } from "@/lib/state/connection-store";
import { cn } from "@/lib/utils";
import type { ExecutionMode, Task, TeamMember } from "@/types";

const FILTERS = ["All", "Active", "Completed", "Needs attention"] as const;
type HistoryFilter = (typeof FILTERS)[number];

function matchesFilter(task: Task, filter: HistoryFilter) {
  if (filter === "All") return true;
  if (filter === "Active") return task.status === "running";
  if (filter === "Completed") return task.status === "completed";
  return task.status === "failed" || task.status === "stopped";
}

function statusColor(status: Task["status"]) {
  if (status === "completed") return "bg-[#8caf9e]";
  if (status === "running") return "bg-[#d7bc83]";
  if (status === "failed") return "bg-[#d49a91]";
  return "bg-[#828a97]";
}

export function ChatsScreen({ tasks }: { tasks: Task[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("All");
  const filtered = tasks
    .filter(
      (task) =>
        matchesFilter(task, filter) &&
        (task.title + " " + task.prompt)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const isFiltered = !!query.trim() || filter !== "All";

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Task history</h1>
          <p>Your conversations, agent work, and generated files.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/">
            <Plus size={14} />
            New task
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 border-b border-[#252a33] pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div
          className="flex flex-wrap gap-1"
          aria-label="Filter task history"
          role="group"
        >
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={cn(
                "flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs transition-colors duration-200",
                filter === item
                  ? "bg-[#20242c] text-[#f2f3f5]"
                  : "text-[#a0a6b2] hover:bg-[#161a20] hover:text-[#f2f3f5]",
              )}
            >
              {item}
              <span className="text-[10px] tabular-nums text-[#858e9c]">
                {tasks.filter((task) => matchesFilter(task, item)).length}
              </span>
            </button>
          ))}
        </div>
        <label className="flex min-h-10 items-center gap-2.5 rounded-lg border border-[#252a33] bg-[#101318] px-3 xl:w-64">
          <Search size={14} className="shrink-0 text-[#858e9c]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks…"
            aria-label="Search conversations"
            className="min-w-0 flex-1 bg-transparent text-xs text-[#f2f3f5] outline-none placeholder:text-[#858e9c]"
          />
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.map((task) => {
          const needsAttention =
            task.status === "failed" || task.status === "stopped";
          return (
            <Link
              key={task.id}
              href={"/tasks/" + task.id}
              className="history-card group !items-start !gap-4 !rounded-xl !border-[#252a33] !bg-[#12151a] !p-4 transition-colors duration-200 hover:!border-[#414853] hover:!bg-[#171b22] sm:!p-5"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2b313b] bg-[#1b2028] text-[#a0a6b2]">
                {needsAttention ? (
                  <CircleAlert size={16} />
                ) : task.status === "completed" ? (
                  <Check size={16} />
                ) : (
                  <MessageSquare size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="min-w-0 break-words text-[13px] font-medium text-[#f2f3f5] [overflow-wrap:anywhere]">
                    {task.title}
                  </h2>
                  <span className="rounded border border-[#303640] px-1.5 py-0.5 text-[9px] text-[#a0a6b2]">
                    {task.mode === "live" ? "Live" : "Demo"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-[#a0a6b2] [overflow-wrap:anywhere]">
                  {task.error ||
                    task.activity ||
                    (task.status === "completed"
                      ? "Response ready. Open to review the work and files."
                      : task.status === "stopped"
                        ? "Stopped. Available partial output has been kept."
                        : task.phase)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-[#858e9c]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        statusColor(task.status),
                      )}
                    />
                    <span className="capitalize">{task.status}</span>
                  </span>
                  <span>{task.agents.length} agents</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={10} />
                    {new Date(task.finishedAt ?? task.createdAt).toLocaleString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </span>
                </div>
              </div>
              <ArrowUpRight
                size={15}
                className="mt-1 shrink-0 text-[#6e7785] transition-colors group-hover:text-[#d7bc83]"
              />
            </Link>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="empty-state !rounded-xl !border !border-dashed !border-[#252a33] !bg-[#101318]">
          <MessageSquare size={26} strokeWidth={1.25} />
          <h2>{isFiltered ? "No matching tasks" : "No tasks yet"}</h2>
          <p>
            {isFiltered
              ? "Try another search or show all statuses."
              : "Start a task to keep its conversation, team, and files here."}
          </p>
          {isFiltered ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilter("All");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                Start a task
                <ArrowRight size={13} />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

const TEAM_TEMPLATES: {
  name: string;
  description: string;
  icon: typeof Code2;
  members: TeamMember[];
}[] = [
  {
    name: "Implementation team",
    description:
      "Outline an approach, draft the code, and review the proposal.",
    icon: Code2,
    members: [
      { id: "planner", name: "Planner", role: "Planner", model: "Claude" },
      { id: "developer", name: "Developer", role: "Developer", model: "GPT" },
      { id: "reviewer", name: "Reviewer", role: "Reviewer", model: "Grok" },
    ],
  },
  {
    name: "Research team",
    description: "Compare ideas, examine tradeoffs, and prepare a clear brief.",
    icon: Compass,
    members: [
      {
        id: "researcher",
        name: "Researcher",
        role: "Researcher",
        model: "Gemini",
      },
      { id: "analyst", name: "Analyst", role: "Planner", model: "Claude" },
      { id: "reviewer", name: "Reviewer", role: "Reviewer", model: "Grok" },
    ],
  },
  {
    name: "Product team",
    description:
      "Define requirements, explore an interface, and refine the brief.",
    icon: Layers3,
    members: [
      {
        id: "planner",
        name: "Product planner",
        role: "Planner",
        model: "Claude",
      },
      { id: "designer", name: "Designer", role: "Designer", model: "Gemini" },
      { id: "reviewer", name: "Reviewer", role: "Reviewer", model: "Grok" },
    ],
  },
];

function editableTeam(team: TeamMember[], mode: ExecutionMode) {
  return team.map((member) => ({
    ...member,
    model: mode === "live" && !parseModelKey(member.model) ? "" : member.model,
  }));
}

export function AgentsScreen({
  savedTeam,
  onBuild,
  mode = "live",
}: {
  savedTeam: TeamMember[] | null;
  onBuild: (team: TeamMember[]) => void;
  mode?: ExecutionMode;
}) {
  const { connections } = useConnections();
  const team = savedTeam ?? DEFAULT_TEAM;
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Your team</h1>
          <p>
            Give each agent a role and choose the model that will do its work.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onBuild(editableTeam(DEFAULT_TEAM, mode))}
        >
          <Plus size={14} />
          Build a team
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#252a33] bg-[#12151a]">
        <div className="flex items-start gap-3 border-b border-[#252a33] p-5 sm:p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#39352e] bg-[#25221d] text-[#d7bc83]">
            <Users2 size={19} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#f2f3f5]">
              {savedTeam ? "Saved team" : "Starter team"}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-[#a0a6b2]">
              {savedTeam
                ? "Your last configuration, ready to adjust for the next task."
                : "A starting configuration. Edit the names, roles, and models before running."}
            </p>
          </div>
        </div>
        <div className="grid gap-px bg-[#252a33] sm:grid-cols-2">
          {team.map((member, index) => {
            const ref = parseModelKey(member.model);
            const connected =
              ref &&
              connections.some(
                (connection) =>
                  connection.provider === ref.provider &&
                  connection.modelId === ref.modelId &&
                  connection.status === "connected",
              );
            return (
              <div key={member.id} className="min-w-0 bg-[#12151a] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] tabular-nums text-[#737d8c]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="min-w-0 break-words text-[13px] font-medium text-[#e5e8ed] [overflow-wrap:anywhere]">
                    {member.name}
                  </h3>
                  <span className="ml-auto text-[10px] text-[#a0a6b2]">
                    {member.role}
                  </span>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-[#a0a6b2]">
                  <ProviderMark model={member.model} className="!h-4 !w-4" />
                  <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {mode === "live" && !ref
                      ? "Choose a connected model"
                      : modelLabel(member.model)}
                  </span>
                </div>
                <p className="mt-2 pl-6 text-[10px] text-[#858e9c]">
                  {mode === "demo"
                    ? "Demo assignment · no API request"
                    : !ref
                      ? "Model selection required"
                      : connected
                        ? "Connected for this session"
                        : "Reconnect this exact model before running"}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#252a33] px-5 py-4 sm:px-6">
          <span className="text-xs text-[#a0a6b2]">
            {team.length} agents ·{" "}
            {mode === "demo" ? "Demo" : "Manual configuration"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBuild(editableTeam(team, mode))}
          >
            <SlidersHorizontal size={13} />
            Customize & start
          </Button>
        </div>
      </section>

      <div className="mb-4 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-[#e5e8ed]">Team templates</h2>
        <span className="text-[10px] text-[#858e9c]">Roles you can edit</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {TEAM_TEMPLATES.map((template) => (
          <button
            key={template.name}
            onClick={() => onBuild(editableTeam(template.members, mode))}
            className="group flex flex-col rounded-xl border border-[#252a33] bg-[#12151a] p-5 text-left transition-colors duration-200 hover:border-[#414853] hover:bg-[#171b22]"
          >
            <div className="mb-5 flex w-full items-center justify-between text-[#a0a6b2]">
              <template.icon size={19} strokeWidth={1.5} />
              <ArrowUpRight
                size={14}
                className="text-[#727b88] group-hover:text-[#d7bc83]"
              />
            </div>
            <span className="text-[13px] font-medium text-[#e5e8ed]">
              {template.name}
            </span>
            <span className="mt-2 text-xs leading-6 text-[#a0a6b2]">
              {template.description}
            </span>
            <span className="mt-4 text-[10px] text-[#858e9c]">
              {template.members.length} agents · Configure models
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-start gap-3 text-xs leading-6 text-[#a0a6b2]">
        <GitBranch size={16} className="mt-1 shrink-0 text-[#d7bc83]" />
        <p>
          Start with Auto to let the lead model plan the assignments. Manual
          teams keep your exact model choices.{" "}
          <Link href="/" className="text-[#d7bc83] hover:underline">
            Start an automatic task{" "}
            <ArrowUpRight className="inline" size={12} />
          </Link>
        </p>
      </div>
    </div>
  );
}

const WORKFLOWS = [
  {
    name: "Idea to interface",
    category: "Design & build",
    description:
      "Turn a product idea into an interface brief and a draft implementation.",
    icon: Code2,
    prompt:
      "Draft a minimal analytics dashboard for a SaaS product, with key metrics, a revenue chart, and recent activity. Define the requirements, outline the interface, and provide an implementation proposal. Clearly distinguish generated code from code that has been executed or tested.",
    roles: ["Research", "Design", "Develop", "Review"],
    team: [
      {
        id: "research",
        name: "Research Agent",
        role: "Researcher",
        model: "Claude",
      },
      { id: "design", name: "UI Designer", role: "Designer", model: "Gemini" },
      { id: "code", name: "Developer", role: "Developer", model: "GPT" },
      { id: "review", name: "Reviewer", role: "Reviewer", model: "Grok" },
    ] as TeamMember[],
  },
  {
    name: "The deeper dive",
    category: "Research & strategy",
    description:
      "Compare approaches and bring the tradeoffs together in a decision brief.",
    icon: Compass,
    prompt:
      "Research and compare the best approaches to building a multi-model AI workspace. Create a concise comparison and recommendation using your available knowledge. Flag assumptions and facts that need external verification; do not imply you browsed the web.",
    roles: ["Research", "Analyze", "Review"],
    team: [
      {
        id: "research",
        name: "Researcher",
        role: "Researcher",
        model: "Gemini",
      },
      { id: "analysis", name: "Analyst", role: "Planner", model: "Claude" },
      { id: "review", name: "Reviewer", role: "Reviewer", model: "Grok" },
    ] as TeamMember[],
  },
  {
    name: "From zero to launch",
    category: "Planning & delivery",
    description:
      "Break a launch into milestones, responsibilities, and practical next steps.",
    icon: Layers3,
    prompt:
      "Create a practical launch plan for a new productivity app, from audience research to the first 100 users. Include milestones, draft responsibilities, assumptions to verify, and the next three actions. This is a written plan, not an executed launch.",
    roles: ["Plan", "Research", "Develop", "Review"],
    team: DEFAULT_TEAM,
  },
];

export function WorkflowsScreen({
  onUse,
  mode = "live",
}: {
  onUse: (prompt: string, team: TeamMember[]) => void;
  mode?: ExecutionMode;
}) {
  const [drafts, setDrafts] = useState(() =>
    WORKFLOWS.map((workflow) => workflow.prompt),
  );
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Playbooks</h1>
          <p>
            Reusable task briefs. Choose one, adjust the prompt, then start a
            run.
          </p>
        </div>
        <span className="rounded-lg border border-[#303640] px-3 py-2 text-[10px] text-[#a0a6b2]">
          {WORKFLOWS.length} templates
        </span>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {WORKFLOWS.map((workflow, index) => (
          <article
            key={workflow.name}
            className="flex min-w-0 flex-col rounded-2xl border border-[#252a33] bg-[#12151a] p-5 sm:p-6"
          >
            <div className="mb-7 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#34322b] bg-[#25221d] text-[#d7bc83]">
                <workflow.icon size={19} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] text-[#858e9c]">0{index + 1}</span>
            </div>
            <p className="text-[10px] text-[#d7bc83]">{workflow.category}</p>
            <h2 className="mt-2.5 text-base font-medium tracking-tight text-[#f2f3f5]">
              {workflow.name}
            </h2>
            <p className="mt-3 min-h-[72px] text-xs leading-6 text-[#a0a6b2]">
              {workflow.description}
            </p>
            <div className="mb-6 mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
              {workflow.roles.map((role, roleIndex) => (
                <span key={role} className="flex items-center gap-2">
                  {roleIndex > 0 && (
                    <ArrowRight size={10} className="text-[#68717f]" />
                  )}
                  <span className="text-[10px] text-[#a0a6b2]">{role}</span>
                </span>
              ))}
            </div>
            <details className="group/prompt mb-5 border-t border-[#252a33] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-[#c1c7d0] marker:content-none">
                Preview & edit prompt
                <ChevronDown
                  size={13}
                  className="transition-transform duration-200 group-open/prompt:rotate-180"
                />
              </summary>
              <textarea
                aria-label={workflow.name + " prompt"}
                className="mt-3 min-h-44 w-full resize-y rounded-lg border border-[#303640] bg-[#0d1015] p-3 text-xs leading-6 text-[#c1c7d0] outline-none focus:border-[#8c7e60]"
                value={drafts[index]}
                maxLength={12000}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((draft, draftIndex) =>
                      draftIndex === index ? event.target.value : draft,
                    ),
                  )
                }
              />
            </details>
            <Button
              variant="outline"
              className="mt-auto w-full text-xs"
              disabled={!drafts[index].trim()}
              onClick={() =>
                onUse(drafts[index].trim(), editableTeam(workflow.team, mode))
              }
            >
              Use workflow
              <ArrowUpRight size={13} />
            </Button>
          </article>
        ))}
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#252a33] bg-[#101318] p-4 text-xs leading-6 text-[#a0a6b2]">
        <GitBranch size={16} className="mt-1 shrink-0 text-[#858e9c]" />
        <p>
          Playbooks open in the composer for you to review and send. Runs start
          manually; scheduling is not available.
          {mode === "live"
            ? " Auto uses your configured default model to create the final assignments. Research uses model knowledge only."
            : " Demo runs use the template team and simulated outputs."}
        </p>
      </div>
    </div>
  );
}

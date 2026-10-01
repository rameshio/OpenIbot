"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Compass,
  FileText,
  Layers3,
  Plus,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { motion } from "framer-motion";
import { ChatInput } from "@/components/chat/chat-input";
import { useConnections } from "@/lib/state/connection-store";
import { useWorkspace } from "@/lib/state/workspace-store";
import { modelKey, modelLabel } from "@/lib/models";
import { DEFAULT_TEAM } from "@/lib/mock/task-engine";
import type { ExecutionMode, ModelId, TeamMember } from "@/types";

export const STARTERS = [
  {
    title: "Build a product",
    description: "Shape an idea into an implementation plan",
    prompt:
      "Build a minimal analytics dashboard for a SaaS product, with key metrics, a revenue chart, and recent activity.",
    icon: Code2,
  },
  {
    title: "Explore an idea",
    description: "Compare approaches and clarify the tradeoffs",
    prompt:
      "Research and compare the best approaches to building a multi-model AI workspace. Create a concise comparison and recommendation.",
    icon: Compass,
  },
  {
    title: "Plan a launch",
    description: "Turn a big goal into practical next steps",
    prompt:
      "Create a practical launch plan for a new productivity app, from audience research to the first 100 users.",
    icon: Layers3,
  },
];
const roles = [
  {
    name: "Planner",
    role: "Planner" as const,
    icon: Compass,
    detail: "Find the next step",
    color: "#b9a7df",
  },
  {
    name: "Researcher",
    role: "Researcher" as const,
    icon: FileText,
    detail: "Connect the dots",
    color: "#9fb9c9",
  },
  {
    name: "Developer",
    role: "Developer" as const,
    icon: Code2,
    detail: "Make it concrete",
    color: "#a4bd9f",
  },
  {
    name: "Reviewer",
    role: "Reviewer" as const,
    icon: ShieldCheck,
    detail: "Catch the gaps",
    color: "#d7bc83",
  },
];
export function HomeScreen({
  model,
  onModelChange,
  onSubmit,
  draft,
  composerKey,
  onExample,
  teamCount,
  onClearTeam,
  mode = "live",
  onBuildTeam,
}: {
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  onSubmit: (
    prompt: string,
    model: ModelId,
    tools: string[],
    autoMode: boolean,
  ) => boolean | void;
  draft: string;
  composerKey: number;
  onExample: (prompt: string) => void;
  teamCount?: number;
  onClearTeam: () => void;
  mode?: ExecutionMode;
  onBuildTeam?: (team: TeamMember[]) => void;
}) {
  const { connections, unlocked } = useConnections();
  const { tasks, defaultModel, savedTeam } = useWorkspace();
  const connected = connections.filter((item) => item.status === "connected");
  const ready = connected.some((item) => modelKey(item) === defaultModel);
  const recent = tasks.slice(0, 3);
  return (
    <div className="launch-layout">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="home-content launch-main"
      >
        <div className="launch-intro">
          <div className="launch-kicker">
            <span className="status-light" />
            YOUR PERSONAL WORKSPACE
          </div>
          <h1>What are we working on?</h1>
          <p>One conversation. The right minds for the job.</p>
          {mode === "live" && !ready && (
            <Link
              href="/api-keys"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#d7bc83] xl:hidden"
            >
              Connect a model to get started <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
        <section aria-label="Start a task" className="launch-compose">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[#a0a6b2]">
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#d7bc83]" />
              {teamCount
                ? `Workflow team ready · ${teamCount} specialists`
                : "Let your task bring the team together"}
            </span>
            {teamCount && (
              <button onClick={onClearTeam} className="shrink-0 text-[#d7bc83]">
                Use Auto instead
              </button>
            )}
          </div>
          <ChatInput
            key={composerKey}
            mode={mode}
            model={model}
            onModelChange={onModelChange}
            onSubmit={onSubmit}
            initialPrompt={draft}
          />
          <div className="launch-composer-foot">
            <span>
              {mode === "demo"
                ? "Demo mode · illustrative output, no API calls"
                : "You choose the models. Your team does the writing."}
            </span>
            <span className="hidden sm:block">
              Enter to send <span className="mx-1.5">·</span> ⇧ Enter for a new
              line
            </span>
          </div>
        </section>
        <div className="launch-prompts" aria-label="Task starters">
          {STARTERS.map((starter) => (
            <button
              key={starter.title}
              onClick={() => onExample(starter.prompt)}
            >
              <starter.icon size={14} />
              <span>{starter.title}</span>
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
        <section className="launch-team" aria-labelledby="launch-team-heading">
          <div className="launch-section-heading">
            <div>
              <h2 id="launch-team-heading">A specialist for every angle</h2>
              <p>Start with a role, or put your own team together.</p>
            </div>
            <button
              onClick={() => onBuildTeam?.(savedTeam ?? DEFAULT_TEAM)}
              className="text-link"
            >
              <Plus size={13} />
              Build a team
            </button>
          </div>
          <div className="launch-roles">
            {roles.map((role, index) => (
              <button
                key={role.name}
                onClick={() =>
                  onBuildTeam?.([
                    {
                      id: `specialist-${index}`,
                      name: role.name,
                      role: role.role,
                      model:
                        mode === "demo"
                          ? ["Claude", "Gemini", "GPT", "Grok"][index]
                          : "",
                    },
                  ])
                }
                className="role-tile"
              >
                <span className="role-tile-icon" style={{ color: role.color }}>
                  <role.icon size={20} strokeWidth={1.6} />
                </span>
                <span className="role-tile-title">{role.name}</span>
                <span className="role-tile-detail">{role.detail}</span>
                <ArrowUpRight className="role-tile-arrow" size={12} />
              </button>
            ))}
          </div>
        </section>
        <section
          className="launch-recent"
          aria-labelledby="launch-recent-heading"
        >
          <div className="launch-section-heading">
            <h2 id="launch-recent-heading">Pick up where you left off</h2>
            <Link href="/chats" className="text-link">
              All tasks <ArrowRight size={13} />
            </Link>
          </div>
          {recent.length ? (
            <div className="launch-task-list">
              {recent.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="launch-task-row"
                >
                  <span className={`task-state-dot ${task.status}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[#d8dce3]">
                      {task.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#7f8794]">
                      {task.activity ?? task.phase} ·{" "}
                      {task.mode === "live" ? "Live" : "Demo"}
                    </span>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="launch-empty-history">
              <Layers3 size={20} strokeWidth={1.4} />
              <p>
                Your work will collect here.
                <span>
                  Tasks, contributions, and deliverables stay together.
                </span>
              </p>
            </div>
          )}
        </section>
      </motion.div>
      <aside className="launch-aside" aria-label="Workspace guide">
        <div className="launch-aside-label">
          YOUR WORKSPACE{" "}
          <span className="rounded-full border border-[#30353f] px-2 py-0.5 text-[10px] normal-case tracking-normal">
            Local
          </span>
        </div>
        <section className="setup-card">
          <span className="setup-card-icon">
            <Layers3 size={20} strokeWidth={1.6} />
          </span>
          <h2>{ready ? "Ready when you are." : "Make the connection."}</h2>
          <p>
            {ready
              ? "Your default model is ready to plan, delegate, and review."
              : "Bring a model you trust. Start with one provider and grow from there."}
          </p>
          <div className="setup-model-status">
            <span
              className={`status-light ${ready ? "is-ready" : "is-waiting"}`}
            />
            <span
              className="min-w-0 truncate"
              title={ready ? defaultModel : undefined}
            >
              {ready
                ? modelLabel(defaultModel)
                : `${connected.length} models connected`}
            </span>
          </div>
          <Link href="/api-keys" className="setup-connect">
            {ready ? "Manage connections" : "Connect a model"}
            <ArrowUpRight size={15} />
          </Link>
        </section>
        <div className="launch-checklist">
          <p>GETTING STARTED</p>
          {[
            {
              label: "Connect your provider",
              done: connected.length > 0,
              href: "/api-keys",
            },
            { label: "Choose a default model", done: ready, href: "/models" },
            {
              label: "Give your team a task",
              done: tasks.length > 0,
              href: "/",
            },
          ].map((step, index) => (
            <Link href={step.href} key={step.label}>
              <span
                className={
                  step.done ? "step-number is-complete" : "step-number"
                }
              >
                {step.done ? <Check size={12} /> : index + 1}
              </span>
              <span>{step.label}</span>
              {step.done && (
                <span className="ml-auto text-[10px] text-[#7f9a83]">Done</span>
              )}
            </Link>
          ))}
        </div>
        <div className="launch-quiet-note">
          <Users2 size={16} />
          <div>
            <p>Built around your task</p>
            <span>
              Auto assembles specialists as they’re needed. You can see who’s
              doing what, and inspect every contribution.
            </span>
          </div>
        </div>
        <div className="launch-aside-bottom">
          <span className="status-light" />
          {mode === "demo"
            ? "Demo · no provider requests"
            : unlocked
              ? "Local session unlocked"
              : "Your keys stay on your server"}
        </div>
      </aside>
    </div>
  );
}

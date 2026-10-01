"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, ChevronDown, Plus, Trash2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { roleIcons } from "@/components/agents/agent-card";
import { DEFAULT_TEAM, validateTeam } from "@/lib/mock/task-engine";
import { modelKey, modelLabel, parseModelKey, PROVIDERS } from "@/lib/models";
import { useConnections } from "@/lib/state/connection-store";
import type { AgentRole, ExecutionMode, ModelId, TeamMember } from "@/types";

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
const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-[#303030] bg-[#181818] px-3 text-xs text-[#d4d4d4] outline-none transition-colors duration-200 placeholder:text-[#646464] hover:border-[#414141] focus:border-[#858585]";

export function AgentTeamBuilder({
  open,
  onOpenChange,
  onStart,
  initialTeam,
  executionMode = "live",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (prompt: string, team: TeamMember[]) => boolean | void;
  initialTeam?: TeamMember[];
  executionMode?: ExecutionMode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden rounded-2xl border-[#303030] bg-[#111111] p-0 sm:max-w-[700px]">
        {open && (
          <TeamBuilderForm
            initialTeam={initialTeam}
            executionMode={executionMode}
            onCancel={() => onOpenChange(false)}
            onStart={(prompt, team) => {
              const accepted = onStart(prompt, team);
              if (accepted !== false) onOpenChange(false);
              return accepted;
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamBuilderForm({
  initialTeam,
  onCancel,
  onStart,
  executionMode,
}: {
  initialTeam?: TeamMember[];
  onCancel: () => void;
  onStart: (prompt: string, team: TeamMember[]) => boolean | void;
  executionMode: ExecutionMode;
}) {
  const { connections } = useConnections();
  const isLive = executionMode === "live";
  const availableModels = isLive
    ? connections
        .filter((connection) => connection.status === "connected")
        .map(modelKey)
    : MODELS;
  const maxAgents = isLive ? 4 : 8;
  const [team, setTeam] = useState<TeamMember[]>(() =>
    (initialTeam ?? DEFAULT_TEAM).map((member) => ({
      ...member,
      model: isLive && !parseModelKey(member.model) ? "" : member.model,
    })),
  );
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function updateMember(id: string, changes: Partial<TeamMember>) {
    setTeam((current) =>
      current.map((member) =>
        member.id === id ? { ...member, ...changes } : member,
      ),
    );
    setError(null);
  }

  function addAgent() {
    const usedNames = new Set(team.map((member) => member.name.toLowerCase()));
    let index = team.length + 1;
    while (usedNames.has(`agent ${index}`)) index += 1;
    setTeam((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `Agent ${index}`,
        role: "Researcher",
        model: isLive ? "" : "Auto",
      },
    ]);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = team.map((member) => member.name.trim().toLowerCase());
    const message = !isLive
      ? validateTeam(team)
      : team.length < 1 || team.length > maxAgents
        ? "Choose between 1 and 4 agents."
        : names.some((name) => !name)
          ? "Give every agent a name."
          : new Set(names).size !== names.length
            ? "Use a unique name for each agent."
            : team.some((member) => !availableModels.includes(member.model))
              ? "Select an exact connected model for every agent. Connect models in API Keys first."
              : null;
    if (message) {
      setError(message);
      return;
    }
    if (!prompt.trim()) {
      setError("Give your team a task to work on.");
      return;
    }
    const accepted = onStart(
      prompt.trim(),
      team.map((member) => ({ ...member, name: member.name.trim() })),
    );
    if (accepted === false)
      setError(
        "The team has not started. Check your provider connection and configured default model, then try again.",
      );
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-h-[90dvh] flex-col">
      <div className="shrink-0 border-b border-[#252525] px-5 py-6 sm:px-7">
        <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-[#343434] bg-[#1c1c1c]">
          <Users className="size-[18px] text-[#c7c7c7]" aria-hidden="true" />
        </div>
        <DialogTitle className="text-xl font-medium tracking-tight text-[#f0f0f0]">
          Your task. Your team.
        </DialogTitle>
        <DialogDescription className="mt-2 max-w-[530px] text-[13px] leading-6 text-[#8b8b8b]">
          Bring the right minds together. Choose each agent’s role and model,
          then give them one shared task.
        </DialogDescription>
      </div>
      <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
        <section aria-label="Configure team members">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-medium tracking-[0.1em] text-[#858585] uppercase">
              Team members
            </h3>
            <span className="text-[11px] tabular-nums text-[#656565]">
              {team.length} / {maxAgents} agents
            </span>
          </div>
          <div className="space-y-2.5">
            {team.map((member, index) => {
              const Icon = roleIcons[member.role];
              return (
                <div
                  key={member.id}
                  className="grid grid-cols-[1fr_1fr_28px] gap-2 rounded-xl border border-[#252525] bg-[#141414] p-3 sm:grid-cols-[30px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_28px] sm:items-end"
                >
                  <span className="mb-3 hidden justify-center text-[#737373] sm:flex">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <label className="col-span-2 min-w-0 sm:col-span-1">
                    <span className="mb-1.5 block text-[10px] text-[#858585]">
                      Agent name
                    </span>
                    <input
                      className={fieldClass}
                      value={member.name}
                      maxLength={40}
                      onChange={(event) =>
                        updateMember(member.id, { name: event.target.value })
                      }
                      placeholder="Agent name"
                      aria-label={`Agent ${index + 1} name`}
                    />
                  </label>
                  <label className="col-start-1 min-w-0 sm:col-start-auto">
                    <span className="mb-1.5 block text-[10px] text-[#858585]">
                      Role
                    </span>
                    <div className="relative">
                      <select
                        className={`${fieldClass} appearance-none pr-7`}
                        value={member.role}
                        onChange={(event) =>
                          updateMember(member.id, {
                            role: event.target.value as AgentRole,
                          })
                        }
                        aria-label={`${member.name || `Agent ${index + 1}`} role`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute top-3.5 right-2.5 size-3 text-[#737373]"
                        aria-hidden="true"
                      />
                    </div>
                  </label>
                  <label className="min-w-0">
                    <span className="mb-1.5 block text-[10px] text-[#858585]">
                      Model
                    </span>
                    <div className="relative">
                      <select
                        className={`${fieldClass} appearance-none pr-7`}
                        value={member.model}
                        onChange={(event) =>
                          updateMember(member.id, {
                            model: event.target.value as ModelId,
                          })
                        }
                        aria-label={`${member.name || `Agent ${index + 1}`} model`}
                      >
                        {isLive && (
                          <option value="" disabled>
                            Select a model
                          </option>
                        )}
                        {isLive &&
                          member.model &&
                          !availableModels.includes(member.model) && (
                            <option value={member.model} disabled>
                              {modelLabel(member.model)} · unavailable
                            </option>
                          )}
                        {availableModels.map((model) => (
                          <option key={model} value={model}>
                            {isLive
                              ? `${PROVIDERS.find((provider) => provider.id === parseModelKey(model)?.provider)?.name} · ${modelLabel(model)}`
                              : model}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute top-3.5 right-2.5 size-3 text-[#737373]"
                        aria-hidden="true"
                      />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTeam((current) =>
                        current
                          .filter((item) => item.id !== member.id)
                          .map((item) => ({
                            ...item,
                            dependsOn: item.dependsOn?.filter(
                              (id) => id !== member.id,
                            ),
                          })),
                      );
                      setError(null);
                    }}
                    className="col-start-3 row-start-1 flex h-10 items-center justify-center self-end rounded-lg text-[#686868] transition-colors hover:bg-[#282020] hover:text-red-300 focus-visible:outline-2 focus-visible:outline-zinc-500 sm:col-start-auto sm:row-start-auto"
                    aria-label={`Remove ${member.name || `agent ${index + 1}`}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            {team.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#333] px-5 py-7 text-center text-xs leading-6 text-[#8a8a8a]">
                Your team is empty. Add an agent to get started.
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addAgent}
            disabled={team.length >= maxAgents}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#343434] text-xs text-[#9a9a9a] transition-colors hover:border-[#555] hover:bg-[#191919] hover:text-[#ddd] focus-visible:outline-2 focus-visible:outline-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add agent
          </button>
        </section>
        <div>
          <label
            htmlFor="team-task"
            className="mb-3 block text-[11px] font-medium tracking-[0.1em] text-[#858585] uppercase"
          >
            What should your team work on?
          </label>
          <textarea
            id="team-task"
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setError(null);
            }}
            maxLength={5000}
            rows={3}
            placeholder="Build a launch plan for my new product…"
            className="min-h-24 w-full resize-y rounded-xl border border-[#303030] bg-[#171717] p-3.5 text-[13px] leading-6 text-[#ddd] outline-none transition-colors placeholder:text-[#626262] focus:border-[#777]"
          />
          <p className="mt-2 text-[10px] text-[#676767]">
            {isLive
              ? "Your exact model assignments stay with each agent. The configured default model leads the team and reviews its contributions. Model requests may incur provider charges."
              : "Your selected models stay assigned to their agents. This starts a simulated task in Demo mode."}
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300/15 bg-red-300/5 px-3 py-2.5 text-xs text-red-200"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#262626] bg-[#141414] px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2.5 text-xs text-[#8c8c8c] transition-colors hover:bg-[#222] hover:text-[#ddd] focus-visible:outline-2 focus-visible:outline-zinc-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-5 rounded-xl bg-[#e8e8e2] px-5 py-3 text-xs font-medium text-[#171717] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400"
        >
          Start team
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

"use client";

import { Users } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import type { Agent } from "@/types";

export function AgentGrid({
  agents,
  onSelect,
  selectedId,
}: {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
}) {
  if (!agents.length)
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#2b2b2b] px-5 py-14 text-center">
        <Users className="mb-4 size-6 text-[#656565]" aria-hidden="true" />
        <p className="text-sm text-[#d1d1d1]">Your team is taking shape</p>
        <p className="mt-2 text-xs text-[#777777]">
          Specialists will appear here once the task has been planned.
        </p>
      </div>
    );
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Task agents"
    >
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          selected={selectedId === agent.id}
          onClick={() => onSelect(agent)}
        />
      ))}
    </div>
  );
}

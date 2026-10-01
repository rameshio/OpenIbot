"use client";

import {
  ArrowUpRight,
  Check,
  GitBranch,
  Layers3,
  Sparkles,
} from "lucide-react";
import {
  AgentStatus,
  modelColor,
  roleIcons,
} from "@/components/agents/agent-card";
import { modelLabel } from "@/lib/models";
import { cn } from "@/lib/utils";
import type { Agent, Task } from "@/types";

type GraphNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  detail: string;
  agent?: Agent;
  active?: boolean;
  complete?: boolean;
};

/** Levels express dependency depth; edges retain each exact handoff. */
function dependencyLevels(agents: Agent[], demo: boolean) {
  const known = new Set(agents.map((agent) => agent.id));
  const dependencies = new Map(
    agents.map((agent) => [
      agent.id,
      (
        agent.dependsOn ??
        (demo && agent.role === "Reviewer"
          ? agents
              .filter((other) => other.role !== "Reviewer")
              .map((other) => other.id)
          : [])
      ).filter((id) => known.has(id)),
    ]),
  );
  const levels: Agent[][] = [];
  const placed = new Set<string>();
  while (placed.size < agents.length) {
    const ready = agents.filter(
      (agent) =>
        !placed.has(agent.id) &&
        dependencies.get(agent.id)!.every((id) => placed.has(id)),
    );
    // Saved demo data may predate validation. Never loop on malformed history.
    if (!ready.length) {
      levels.push(agents.filter((agent) => !placed.has(agent.id)));
      break;
    }
    levels.push(ready);
    ready.forEach((agent) => placed.add(agent.id));
  }
  return { levels, dependencies };
}

export function TaskGraph({
  task,
  onSelectAgent,
}: {
  task: Task;
  onSelectAgent: (agent: Agent) => void;
}) {
  const demo = task.mode !== "live";
  const agents = demo && task.phase === "Planning" ? [] : task.agents;
  const { levels, dependencies } = dependencyLevels(agents, demo);
  const width = Math.max(300, ...levels.map((level) => level.length * 230));
  const nodeWidth = 208;
  const rowHeight = 174;
  const single = task.runMode === "single";
  const nodes: GraphNode[] = [];
  const edges: { from: string; to: string }[] = [];
  const add = (
    node: Omit<GraphNode, "x" | "y">,
    row: number,
    column = 0,
    count = 1,
  ) =>
    nodes.push({
      ...node,
      x: ((column + 0.5) * width) / count - nodeWidth / 2,
      y: row * rowHeight,
    });
  add(
    { id: "task", label: "User task", detail: task.title, complete: true },
    0,
  );
  let row = 1;
  if (!single) {
    add(
      {
        id: "orchestrator",
        label: "Orchestrator",
        detail:
          task.phase === "Planning" ? "Preparing assignments" : "Task plan",
        active:
          task.status === "running" &&
          ["Planning", "Creating agents"].includes(task.phase),
        complete: agents.length > 0,
      },
      row++,
    );
    edges.push({ from: "task", to: "orchestrator" });
  }
  levels.forEach((level) => {
    level.forEach((agent, index) => {
      add(
        {
          id: `agent:${agent.id}`,
          label: agent.name,
          detail: modelLabel(agent.model),
          agent,
        },
        row,
        index,
        level.length,
      );
      const parents = dependencies.get(agent.id)!;
      (parents.length
        ? parents.map((id) => `agent:${id}`)
        : [single ? "task" : "orchestrator"]
      ).forEach((from) => edges.push({ from, to: `agent:${agent.id}` }));
    });
    row++;
  });
  const referenced = new Set([...dependencies.values()].flat());
  const leaves = agents.filter((agent) => !referenced.has(agent.id));
  if (!single && agents.length) {
    add(
      {
        id: "lead-review",
        label: "Lead review",
        detail: "Combines completed contributions",
        active:
          task.status === "running" &&
          ["Reviewing", "Finalizing"].includes(task.phase) &&
          agents.every((agent) => agent.status === "completed"),
        complete: task.status === "completed",
      },
      row++,
    );
    agents.forEach((agent) =>
      edges.push({ from: `agent:${agent.id}`, to: "lead-review" }),
    );
  }
  add(
    {
      id: "result",
      label: "Final result",
      detail:
        task.status === "completed"
          ? `${task.files.length} generated files`
          : task.status === "stopped"
            ? "Stopped · partial work preserved"
            : task.status === "failed"
              ? "Execution failed"
              : "Waiting for response",
      complete: task.status === "completed",
      active: task.status === "running" && task.phase === "Finalizing",
    },
    row,
  );
  if (single)
    leaves.forEach((agent) =>
      edges.push({ from: `agent:${agent.id}`, to: "result" }),
    );
  else if (agents.length) edges.push({ from: "lead-review", to: "result" });
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#252525] bg-[#0f0f0f]"
      aria-label="Task execution graph"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-[#a4a4a4]">
          <GitBranch className="size-3.5 text-[#737373]" aria-hidden="true" />
          Task graph
        </div>
        <span className="text-[10px] text-[#686868]">
          {demo ? "Demo handoffs" : "Arrows show actual dependencies"} · Select
          an agent
        </span>
      </div>
      <div
        className="overflow-x-auto px-3 py-8 sm:px-5"
        style={{
          backgroundImage: "radial-gradient(#292929 0.6px, transparent 0.6px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          className="relative mx-auto"
          style={{ width, height: (row + 1) * rowHeight - 28 }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={width}
            height={(row + 1) * rowHeight}
            aria-label="Dependency handoffs"
            role="img"
          >
            <defs>
              <marker
                id="handoff-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 1 1 L 6 4 L 1 7" fill="none" stroke="#777b70" />
              </marker>
            </defs>
            {edges.map(({ from, to }) => {
              const start = byId.get(from)!;
              const end = byId.get(to)!;
              const sx = start.x + nodeWidth / 2,
                sy = start.y + 136,
                ex = end.x + nodeWidth / 2,
                ey = end.y - 5;
              const active = end.agent?.status === "working" || end.active;
              return (
                <path
                  key={`${from}-${to}`}
                  d={`M ${sx} ${sy} C ${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}`}
                  fill="none"
                  stroke={active ? "#888b7e" : "#3e413b"}
                  strokeWidth="1.2"
                  markerEnd="url(#handoff-arrow)"
                >
                  <title>
                    {start.label} → {end.label}
                  </title>
                </path>
              );
            })}
          </svg>
          {nodes.map((node) => {
            const agent = node.agent;
            const Icon = agent
              ? roleIcons[agent.role]
              : node.id === "result"
                ? node.complete
                  ? Check
                  : Sparkles
                : Layers3;
            const contents = (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] text-[#aaa]">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-medium text-[#d0d0d0]"
                      title={node.label}
                    >
                      {node.label}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#858585]">
                      {agent && (
                        <span
                          className={cn(
                            "size-1 shrink-0 rounded-full",
                            modelColor(agent.model),
                          )}
                        />
                      )}
                      <span className="truncate" title={node.detail}>
                        {node.detail}
                      </span>
                    </p>
                  </div>
                  {agent && (
                    <ArrowUpRight
                      className="size-3 shrink-0 text-[#666]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {agent ? (
                  <>
                    <div className="mt-3">
                      <AgentStatus status={agent.status} />
                    </div>
                    <p
                      className="mt-2 truncate text-[9px] text-[#777]"
                      title={
                        (dependencies.get(agent.id) ?? [])
                          .map((id) => byId.get(`agent:${id}`)?.label)
                          .join(", ") || "Task instructions"
                      }
                    >
                      From:{" "}
                      {(dependencies.get(agent.id) ?? [])
                        .map((id) => byId.get(`agent:${id}`)?.label)
                        .join(", ") || "Task instructions"}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-[10px] text-[#818477]">
                    {node.active
                      ? task.phase
                      : node.complete
                        ? "Ready"
                        : "Pending"}
                  </p>
                )}
              </>
            );
            const className = cn(
              "absolute h-[136px] rounded-xl border bg-[#151515] p-3.5 text-left",
              agent &&
                "transition-colors duration-200 hover:border-[#626262] hover:bg-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-500",
              agent?.status === "working" || node.active
                ? "border-[#65685c]"
                : agent?.status === "completed" || node.complete
                  ? "border-[#3d4638]"
                  : "border-[#2e2e2e]",
            );
            return agent ? (
              <button
                key={node.id}
                type="button"
                style={{ left: node.x, top: node.y, width: nodeWidth }}
                className={className}
                onClick={() => onSelectAgent(agent)}
                aria-label={`View ${agent.name} details, ${agent.status}`}
              >
                {contents}
              </button>
            ) : (
              <div
                key={node.id}
                style={{ left: node.x, top: node.y, width: nodeWidth }}
                className={className}
              >
                {contents}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-[#222] px-5 py-3 text-center text-[10px] leading-5 text-[#737373]">
        {single
          ? "One model request generates the response."
          : "A specialist starts when its dependencies complete. Independent calls use bounded concurrency."}
      </div>
    </section>
  );
}

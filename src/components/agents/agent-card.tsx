"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Code2,
  Compass,
  PenTool,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { modelLabel, parseModelKey } from "@/lib/models";
import type { Agent, AgentRole, ModelId } from "@/types";

export const roleIcons = {
  Planner: Compass,
  Researcher: Search,
  Designer: PenTool,
  Developer: Code2,
  Reviewer: ShieldCheck,
} satisfies Record<AgentRole, typeof Compass>;

export const modelColors: Record<ModelId, string> = {
  Auto: "bg-zinc-400",
  GPT: "bg-emerald-300/75",
  Claude: "bg-orange-300/80",
  Gemini: "bg-blue-300/80",
  Grok: "bg-zinc-300",
  "Local Model": "bg-violet-300/70",
};

export function modelColor(model: ModelId) {
  const provider = parseModelKey(model)?.provider;
  return (
    modelColors[model] ??
    ({
      openai: "bg-emerald-300/75",
      anthropic: "bg-orange-300/80",
      gemini: "bg-blue-300/80",
      xai: "bg-zinc-300",
      cohere: "bg-teal-300/70",
    }[provider ?? "openai"] ||
      "bg-zinc-400")
  );
}

export function formatElapsed(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return whole < 60 ? `${whole}s` : `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function AgentStatus({ status }: { status: Agent["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium capitalize",
        status === "working"
          ? "text-[#dededb]"
          : status === "completed"
            ? "text-emerald-300/80"
            : status === "failed"
              ? "text-red-300"
              : "text-[#747474]",
      )}
    >
      {status === "completed" ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full bg-current",
            status === "working" && "motion-safe:animate-pulse",
          )}
        />
      )}
      {status}
    </span>
  );
}

export function AgentCard({
  agent,
  onClick,
  selected = false,
}: {
  agent: Agent;
  onClick: () => void;
  selected?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = roleIcons[agent.role];
  return (
    <motion.button
      type="button"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      aria-label={`View ${agent.name} details, ${agent.status}`}
      aria-pressed={selected}
      className={cn(
        "group flex min-w-0 flex-col rounded-2xl border bg-[#111111] p-5 text-left shadow-[0_4px_20px_#00000012] transition-colors duration-200 hover:border-[#424242] hover:bg-[#141414] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-500",
        selected ? "border-[#626262]" : "border-[#262626]",
      )}
    >
      <div className="mb-5 flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#2b2b2b] bg-[#191919] text-[#b7b7b7]">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-medium text-[#ededed]">
              {agent.name}
            </h3>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-[#858585]">
              <span
                className={cn("size-1.5 rounded-full", modelColor(agent.model))}
              />
              <span className="truncate" title={agent.model}>
                {modelLabel(agent.model)}
              </span>
            </span>
          </div>
        </div>
        <ArrowUpRight
          className="size-3.5 shrink-0 text-[#515151] transition-colors group-hover:text-[#b1b1b1]"
          aria-hidden="true"
        />
      </div>
      <div className="mb-2">
        <AgentStatus status={agent.status} />
      </div>
      <p className="mb-5 min-h-9 w-full text-xs leading-[1.6] text-[#929292]">
        {agent.activity}
      </p>
      <div className="mt-auto w-full">
        <div
          role="progressbar"
          aria-label={`${agent.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            agent.mode === "live" && agent.status === "working"
              ? undefined
              : agent.progress
          }
          aria-valuetext={
            agent.mode === "live" ? agent.status : `${agent.progress}%`
          }
          className="mb-3 h-[3px] overflow-hidden rounded-full bg-[#252525]"
        >
          <div
            style={{
              width:
                agent.mode === "live" && agent.status === "working"
                  ? "100%"
                  : `${agent.progress}%`,
            }}
            className={cn(
              "h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
              agent.status === "completed" ? "bg-[#838c85]" : "bg-[#a5a5a2]",
              agent.mode === "live" &&
                agent.status === "working" &&
                "motion-safe:animate-pulse",
            )}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-[10px] text-[#666666]">
          <span className="flex items-center gap-1.5">
            <Wrench className="size-3" aria-hidden="true" />
            {agent.mode === "live"
              ? `${agent.modelCalls ?? 0} model calls`
              : `${agent.toolCalls} tool calls · demo`}
          </span>
          <span
            className="flex items-center gap-1.5"
            title={
              agent.mode === "live"
                ? "Elapsed request time at last update"
                : "Simulated elapsed time"
            }
          >
            <Clock3 className="size-3" aria-hidden="true" />
            {formatElapsed(agent.elapsed)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

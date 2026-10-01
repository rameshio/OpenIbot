"use client";

import {
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  Clock3,
  Cpu,
  FileText,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AgentStatus,
  formatElapsed,
  modelColor,
  roleIcons,
} from "@/components/agents/agent-card";
import { cn } from "@/lib/utils";
import { modelLabel } from "@/lib/models";
import type { Agent } from "@/types";

export function AgentDetailsPanel({
  agent,
  onClose,
}: {
  agent: Agent | null;
  onClose: () => void;
}) {
  const Icon = agent ? roleIcons[agent.role] : CircleDot;
  return (
    <Dialog
      open={Boolean(agent)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="inset-y-0 right-0 left-auto top-0 h-dvh w-full max-w-[430px] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-y-0 border-r-0 border-[#282828] bg-[#101010] p-0 max-sm:max-w-none sm:max-w-[430px]">
        {agent && (
          <div className="h-full overflow-y-auto">
            <div className="border-b border-[#242424] px-6 pt-7 pb-6">
              <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-[#303030] bg-[#1a1a1a] text-[#d0d0d0]">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle className="text-lg font-medium tracking-tight text-[#f0f0f0]">
                {agent.name}
              </DialogTitle>
              <DialogDescription className="mt-2 text-xs leading-relaxed text-[#858585]">
                {agent.mode === "live"
                  ? "Actual assignments, contributions, and activity summaries from this execution."
                  : "Demo specialist. Activity and usage are simulated."}
              </DialogDescription>
              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-[#a5a5a5]">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      modelColor(agent.model),
                    )}
                  />
                  <span className="max-w-44 truncate" title={agent.model}>
                    {modelLabel(agent.model)}
                  </span>
                  <span className="text-[#434343]">/</span>
                  {agent.role}
                </span>
                <AgentStatus status={agent.status} />
              </div>
            </div>
            <div className="space-y-7 px-6 py-6">
              <section>
                <PanelLabel>Assigned goal</PanelLabel>
                <p className="mt-3 text-[13px] leading-6 text-[#c2c2c2]">
                  {agent.goal}
                </p>
              </section>
              <div className="grid grid-cols-3 divide-x divide-[#272727] rounded-xl border border-[#272727] bg-[#141414] py-3.5">
                <Metric
                  icon={Wrench}
                  label="Tool calls"
                  value={String(agent.toolCalls)}
                />
                <Metric
                  icon={Clock3}
                  label={agent.mode === "live" ? "Elapsed" : "Time · demo"}
                  value={formatElapsed(agent.elapsed)}
                />
                <Metric
                  icon={Cpu}
                  label={
                    agent.mode === "live" ? "Total tokens" : "Tokens · demo"
                  }
                  value={
                    (agent.mode === "live"
                      ? agent.usage?.totalTokens
                      : agent.tokens
                    )?.toLocaleString() ?? "Unavailable"
                  }
                />
              </div>
              {agent.mode === "live" && (
                <p className="text-[11px] leading-5 text-[#797979]">
                  {agent.modelCalls ?? 0} model calls · Input tokens:{" "}
                  {agent.usage?.inputTokens?.toLocaleString() ?? "Unavailable"}{" "}
                  · Output tokens:{" "}
                  {agent.usage?.outputTokens?.toLocaleString() ?? "Unavailable"}
                  . Usage comes from the provider.
                </p>
              )}
              {agent.error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#453e30] bg-[#1b1813] p-4 text-xs leading-6 text-[#d2c7b3]"
                >
                  {agent.error}
                </p>
              )}
              <section>
                <PanelLabel>Activity timeline</PanelLabel>
                {agent.events.length ? (
                  <ol className="mt-4 space-y-0">
                    {agent.events.map((event, index) => (
                      <li
                        key={event.id}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {index !== agent.events.length - 1 && (
                          <span
                            className="absolute top-2 bottom-0 left-[4px] w-px bg-[#292929]"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={cn(
                            "relative mt-1.5 size-[9px] shrink-0 rounded-full border-2 border-[#101010]",
                            index === agent.events.length - 1 &&
                              agent.status === "working"
                              ? "bg-[#d0d0cc]"
                              : "bg-[#545454]",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-5 text-[#b2b2b2]">
                            {event.label}
                          </p>
                          <p className="mt-1 text-[10px] text-[#626262]">
                            {typeof event.time === "number"
                              ? `${formatElapsed(event.time)} into task`
                              : event.time}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-[#717171]">
                    Waiting for dependencies. Activity will appear when this
                    agent starts.
                  </p>
                )}
              </section>
              <section>
                <PanelLabel>Output preview</PanelLabel>
                <div className="mt-3 rounded-xl border border-[#292929] bg-[#141414] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[11px] text-[#878787]">
                    <FileText className="size-3.5" aria-hidden="true" />
                    {agent.status === "completed"
                      ? "Agent deliverable"
                      : agent.status === "failed" || agent.status === "stopped"
                        ? "Partial output"
                        : "Work in progress"}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs leading-6 text-[#b7b7b7]">
                    {agent.output ||
                      "This agent’s output will be available as work progresses."}
                  </p>
                </div>
              </section>
              <section>
                <details className="group rounded-xl border border-[#272727] bg-[#131313]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-xs text-[#adadad] focus-visible:outline-2 focus-visible:outline-zinc-500 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <Wrench className="size-3.5" aria-hidden="true" />
                      Tool activity{" "}
                      <span className="rounded bg-[#242424] px-1.5 py-0.5 text-[10px] text-[#8d8d8d]">
                        {agent.toolCalls}
                      </span>
                    </span>
                    <ChevronDown
                      className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="space-y-3 border-t border-[#242424] p-4">
                    {agent.mode !== "live" && agent.toolCalls > 0 ? (
                      <>
                        <p className="text-[11px] leading-5 text-[#747474]">
                          Representative activity summaries. No external tools
                          are connected in this demo.
                        </p>
                        {agent.events
                          .slice(-Math.min(agent.toolCalls, 3))
                          .map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-2 text-xs leading-5 text-[#aaa]"
                            >
                              <ArrowUpRight
                                className="mt-1 size-3 shrink-0 text-[#676767]"
                                aria-hidden="true"
                              />
                              <span>{event.label}</span>
                            </div>
                          ))}
                      </>
                    ) : (
                      <p className="text-xs text-[#747474]">
                        {agent.mode === "live"
                          ? "External tools are unavailable in this phase. This agent generates text through a model API; it cannot browse, run a terminal, test, or deploy code."
                          : "No tool calls yet."}
                      </p>
                    )}
                  </div>
                </details>
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-medium tracking-[0.12em] text-[#727272] uppercase">
      {children}
    </h3>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 text-center">
      <p className="text-sm font-medium tabular-nums text-[#d4d4d4]">{value}</p>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-[#707070]">
        <Icon className="size-2.5" aria-hidden="true" />
        {label}
      </p>
    </div>
  );
}

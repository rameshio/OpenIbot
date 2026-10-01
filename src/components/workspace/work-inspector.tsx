"use client";

import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  FileCode2,
  FileText,
  Loader2,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { roleIcons, formatElapsed } from "@/components/agents/agent-card";
import { modelLabel } from "@/lib/models";
import { cn } from "@/lib/utils";
import type { Agent, Task, TaskFile } from "@/types";

export function downloadTaskFile(file: TaskFile) {
  const url = URL.createObjectURL(
    new Blob([file.content], {
      type: file.language === "json" ? "application/json" : "text/markdown",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("File downloaded");
}

export function OutputFileRow({
  file,
  demo,
  onPreview,
}: {
  file: TaskFile;
  demo: boolean;
  onPreview: () => void;
}) {
  const Icon = file.language === "json" ? FileCode2 : FileText;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#292e37] bg-[#12151a] p-3 transition-colors hover:border-[#424957]">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onPreview}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#2c323c] bg-[#1a1e25] text-[#d7bc83]">
          <Icon size={17} strokeWidth={1.5} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] text-[#e2e5eb]">
            {file.name}
          </span>
          <span className="mt-1 block text-[11px] text-[#9199a6]">
            {file.size} · {demo ? "Sample " : ""}
            {file.language}
          </span>
        </span>
      </button>
      <button
        type="button"
        className="icon-button size-8 shrink-0"
        aria-label={`Download ${file.name}`}
        onClick={() => downloadTaskFile(file)}
      >
        <ArrowDownToLine size={15} />
      </button>
    </div>
  );
}

function AgentRow({ agent, onSelect }: { agent: Agent; onSelect: () => void }) {
  const Icon = roleIcons[agent.role];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`View ${agent.name} details`}
      className="group w-full rounded-xl border border-[#292e37] bg-[#15191f] p-3.5 text-left transition-colors duration-200 hover:border-[#49505c] hover:bg-[#191e25]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#303640] bg-[#1b2028] text-[#d0d6df]">
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[#eef0f4]">
            {agent.name}
          </span>
          <span
            className="mt-0.5 block truncate text-[11px] text-[#959eac]"
            title={agent.model}
          >
            {modelLabel(agent.model)}
          </span>
        </span>
        <ArrowUpRight
          size={13}
          className="shrink-0 text-[#6f7988] transition-colors group-hover:text-[#d7bc83]"
        />
      </div>
      <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#a8b0bd]">
        {agent.error || agent.activity}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#252b34] pt-2.5 text-[10px]">
        <span
          className={cn(
            "flex items-center gap-1.5 capitalize",
            agent.status === "working"
              ? "text-[#d7bc83]"
              : agent.status === "completed"
                ? "text-[#a9c7b2]"
                : agent.status === "failed"
                  ? "text-[#e2a5a5]"
                  : "text-[#969fad]",
          )}
        >
          {agent.status === "working" ? (
            <Loader2 size={11} className="motion-safe:animate-spin" />
          ) : agent.status === "completed" ? (
            <Check size={11} />
          ) : (
            <Circle size={9} />
          )}
          {agent.status}
        </span>
        <span className="text-[#8e97a5]">
          {agent.mode === "live" ? `${agent.modelCalls ?? 0} calls` : "Demo"} ·{" "}
          {formatElapsed(agent.elapsed)}
        </span>
      </div>
    </button>
  );
}

export function WorkInspector({
  task,
  agents,
  onSelectAgent,
  onPreview,
  onGraph,
}: {
  task: Task;
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
  onPreview: (file: TaskFile) => void;
  onGraph: () => void;
}) {
  const [view, setView] = useState<"team" | "activity" | "files">("team");
  const demo = task.mode !== "live";
  const tabs = [
    { id: "team", label: "Team", icon: Users2 },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "files", label: "Files", icon: FileText },
  ] as const;
  const completed = agents.filter(
    (agent) => agent.status === "completed",
  ).length;
  return (
    <div className="work-inspector flex min-h-full flex-col">
      <div className="border-b border-[#252a33] px-5 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[#e7eaf0]">Work panel</h2>
          <span className="text-[10px] text-[#939ca9]">
            {demo ? "Demo execution" : "Live execution"}
          </span>
        </div>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-[#252b34] bg-[#0d1015] p-1"
          role="group"
          aria-label="Work panel views"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] transition-colors duration-150",
                view === id
                  ? "bg-[#252b34] text-[#f2f3f5] shadow-sm"
                  : "text-[#949dab] hover:text-white",
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-5 py-5">
        {view === "team" && (
          <>
            <div className="mb-3.5 flex items-center justify-between text-[11px]">
              <span className="text-[#a6afbc]">
                {task.runMode === "single" ? "Assigned model" : "Task team"}
              </span>
              <span className="text-[#788392]">
                {completed}/{agents.length} complete
              </span>
            </div>
            {agents.length ? (
              <div className="space-y-2.5">
                {agents.map((agent) => (
                  <AgentRow
                    key={agent.id}
                    agent={agent}
                    onSelect={() => onSelectAgent(agent)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#303640] px-4 py-7 text-center">
                <Users2 size={20} className="mx-auto mb-3 text-[#929aa6]" />
                <p className="text-[12px] text-[#c2c8d1]">
                  {task.status === "running"
                    ? "Your team is taking shape"
                    : "No agents assigned"}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[#939ca9]">
                  Assignments appear after a validated plan is ready.
                </p>
              </div>
            )}
            {!!agents.length && (
              <button
                type="button"
                onClick={onGraph}
                className="mt-4 flex w-full items-center justify-between rounded-lg px-1 py-2 text-[11px] text-[#b4bfce] hover:text-[#f2f3f5]"
              >
                View dependencies
                <ChevronRight size={13} />
              </button>
            )}
          </>
        )}
        {view === "activity" && (
          <>
            <p className="mb-5 text-[11px] leading-5 text-[#949dab]">
              Reported activity, grouped by agent.
            </p>
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#3c372b] bg-[#1b1914] p-3 text-[12px] leading-5 text-[#d5c5a5]">
              <Activity size={14} className="mt-0.5 shrink-0" />
              <span>
                {task.activity ||
                  (task.status === "running"
                    ? task.phase
                    : `Task ${task.status}`)}
              </span>
            </div>
            {agents.map((agent) => (
              <section key={agent.id} className="mb-5 last:mb-0">
                <h3 className="mb-3 text-[12px] font-medium text-[#dce1e8]">
                  {agent.name}
                </h3>
                {agent.events.length ? (
                  <ol className="space-y-3 border-l border-[#2c323d] pl-3.5">
                    {agent.events.map((event) => (
                      <li key={event.id}>
                        <p className="text-[12px] leading-5 text-[#abb4c2]">
                          {event.label}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#788392]">
                          {event.time}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[11px] text-[#818c9b]">{agent.activity}</p>
                )}
              </section>
            ))}
          </>
        )}
        {view === "files" && (
          <>
            <div className="mb-4 flex items-center justify-between text-[11px]">
              <span className="text-[#a6afbc]">
                {demo ? "Sample deliverables" : "Generated outputs"}
              </span>
              <span className="text-[#788392]">{task.files.length} files</span>
            </div>
            {task.files.length ? (
              <div className="space-y-2.5">
                {task.files.map((file) => (
                  <OutputFileRow
                    key={file.id}
                    file={file}
                    demo={demo}
                    onPreview={() => onPreview(file)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#303640] px-4 py-7 text-center">
                <FileText size={21} className="mx-auto mb-3 text-[#929aa6]" />
                <p className="text-[12px] text-[#c2c8d1]">No files yet</p>
                <p className="mt-2 text-[11px] leading-5 text-[#939ca9]">
                  Completed contributions and the final response appear here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <div className="border-t border-[#252a33] px-5 py-4">
        <div className="mb-2 flex justify-between text-[11px]">
          <span className="text-[#8793a2]">Model calls</span>
          <span className="text-[#c8d0dc]">
            {demo ? "Simulated" : (task.modelCalls ?? 0)}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#8793a2]">Total tokens</span>
          <span className="text-[#c8d0dc]">
            {demo
              ? "Simulated"
              : (task.usage?.totalTokens?.toLocaleString() ?? "Unavailable")}
          </span>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-[#737f8f]">
          {demo
            ? "This run uses sample output. No provider requests are made."
            : "Usage is provider-reported. Activity contains concise action summaries."}
        </p>
      </div>
    </div>
  );
}

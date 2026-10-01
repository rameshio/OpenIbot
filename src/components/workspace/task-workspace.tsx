"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  FileText,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  PanelRight,
  RotateCcw,
  Square,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand";
import { AgentGrid } from "@/components/agents/agent-grid";
import { AgentDetailsPanel } from "@/components/agents/agent-details-panel";
import { TaskGraph } from "@/components/workspace/task-graph";
import {
  WorkspaceTabs,
  type WorkspaceTab,
} from "@/components/workspace/workspace-tabs";
import {
  WorkInspector,
  OutputFileRow,
  downloadTaskFile,
} from "@/components/workspace/work-inspector";
import { TaskOutput } from "@/components/workspace/task-output";
import { ChatInput } from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { modelLabel } from "@/lib/models";
import type { Agent, ModelId, Task, TaskFile } from "@/types";

export function TaskWorkspace({
  task,
  previousTask,
  onStop,
  onRetry,
  onFailure,
  onSubmit,
  model,
  onModelChange,
}: {
  task: Task;
  previousTask?: Task;
  onStop: () => void;
  onRetry: () => void;
  onFailure: () => void;
  onSubmit: (
    prompt: string,
    model: ModelId,
    tools: string[],
    autoMode: boolean,
  ) => void | boolean;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>("chat");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [preview, setPreview] = useState<TaskFile | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const selectedAgent =
    task.agents.find((agent) => agent.id === selectedAgentId) ?? null;
  const demo = task.mode !== "live";
  const visibleAgents = demo && task.phase === "Planning" ? [] : task.agents;
  const stopped = task.status === "stopped" || task.status === "failed";
  const running = task.status === "running";
  const summary = stopped
    ? "This execution has ended. Available contributions are preserved."
    : task.activity ||
      (task.phase === "Planning"
        ? "Preparing a task plan and specialist assignments."
        : task.status === "completed"
          ? "The response is ready."
          : `${task.phase}. Updates appear as the model responds.`);
  function selectAgent(agent: Agent) {
    setInspectorOpen(false);
    setSelectedAgentId(agent.id);
  }
  function previewFile(file: TaskFile) {
    setInspectorOpen(false);
    setPreview(file);
  }
  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  }
  const inspector = (
    <WorkInspector
      task={task}
      agents={visibleAgents}
      onSelectAgent={selectAgent}
      onPreview={previewFile}
      onGraph={() => {
        setInspectorOpen(false);
        setTab("graph");
      }}
    />
  );
  return (
    <div className="task-workspace workbench min-w-0 bg-[#0b0d10]">
      <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[#252a33] px-4 py-4 sm:px-7">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#939ca9]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                running
                  ? "bg-[#d7bc83]"
                  : stopped
                    ? "bg-[#d9a892]"
                    : "bg-[#a9c7b2]",
              )}
            />
            {running
              ? task.phase
              : task.status === "completed"
                ? "Completed"
                : task.status === "failed"
                  ? "Failed"
                  : "Stopped"}
            <span className="text-[#434b58]">/</span>
            <span>{demo ? "Demo · simulated run" : "Live execution"}</span>
          </div>
          <h1
            className="truncate text-[15px] font-medium tracking-[-.25px] text-[#f2f3f5] sm:text-base"
            title={task.title}
          >
            {task.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-[#9099a7] transition-colors hover:bg-[#252a33] hover:text-white xl:hidden"
            aria-label="Open work panel"
            onClick={() => setInspectorOpen(true)}
          >
            <PanelRight size={16} />
          </button>
          <Button
            onClick={running ? onStop : onRetry}
            variant="outline"
            size="sm"
            className="h-8 border-[#303641] bg-[#15191f] text-[11px] text-[#d2d8e2]"
          >
            {running ? <Square size={11} /> : <RotateCcw size={12} />}
            {running ? "Stop" : stopped ? "Retry task" : "Run again"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="icon-button size-8"
              aria-label="Task options"
            >
              <MoreHorizontal size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void copyText(task.prompt, "Task prompt copied")}
              >
                <Copy size={14} />
                Copy task prompt
              </DropdownMenuItem>
              {demo && (
                <DropdownMenuItem onClick={onFailure} disabled={!running}>
                  <FlaskConical size={14} />
                  Simulate a failed run
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="border-b border-[#252a33] px-4 sm:px-7 [&_.workspace-tabs]:border-0 [&_.workspace-tabs]:gap-6 [&_.workspace-tab]:text-xs">
        <WorkspaceTabs
          value={tab}
          onChange={setTab}
          agentCount={visibleAgents.length}
          fileCount={task.files.length}
        />
      </div>
      <div
        className={cn(
          "min-h-[calc(100dvh-190px)] min-w-0",
          tab === "chat" && "xl:grid xl:grid-cols-[minmax(0,1fr)_340px]",
        )}
      >
        <div className="flex min-h-[calc(100dvh-190px)] min-w-0 flex-col">
          <div
            id="workspace-content"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className={cn(
              "min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8",
              tab === "chat"
                ? "mx-auto w-full max-w-[880px]"
                : "mx-auto w-full max-w-[1200px]",
            )}
          >
            {stopped && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-[#493e30] bg-[#211c15] p-4"
              >
                <CircleAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[#d7bc83]"
                />
                <div>
                  <p className="text-[13px] leading-6 text-[#e0cfae]">
                    {task.error ??
                      (task.status === "failed"
                        ? demo
                          ? "This demo run encountered a simulated error."
                          : "This execution failed. Check your provider connection and try again."
                        : "This task has been stopped.")}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[#a6977e]">
                    Available partial output is preserved. Retry creates a
                    separate attempt from the beginning.
                    {task.status === "stopped" &&
                      " Runs also stop when the page is reloaded."}
                  </p>
                </div>
              </div>
            )}
            {tab === "chat" && (
              <div className="space-y-7">
                {previousTask && (
                  <details className="rounded-xl border border-[#2a3039] bg-[#11151b] px-4 py-3">
                    <summary className="cursor-pointer text-[12px] text-[#b3bdcc]">
                      Previous result · {previousTask.title}
                    </summary>
                    <div className="mt-4 border-t border-[#292f38] pt-4">
                      <Link
                        href={`/tasks/${previousTask.id}`}
                        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-[#d7bc83] hover:text-[#eee2c7]"
                      >
                        Open previous task <ArrowRight size={12} />
                      </Link>
                      <TaskOutput
                        text={
                          previousTask.result ||
                          "No completed response was received for the previous attempt."
                        }
                      />
                    </div>
                  </details>
                )}
                <div className="flex justify-end">
                  <div className="max-w-[92%] rounded-[14px] border border-[#2b313b] bg-[#1a1f27] px-4 py-3.5 sm:max-w-[87%]">
                    <div className="mb-2 text-[10px] font-medium text-[#838e9e]">
                      You
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPrompt(!showPrompt)}
                      className="flex w-full items-start gap-3 text-left text-[14px] leading-6 text-[#e3e7ee] [overflow-wrap:anywhere]"
                    >
                      <span
                        className={
                          showPrompt ? "whitespace-pre-wrap" : "line-clamp-4"
                        }
                      >
                        {task.prompt}
                      </span>
                      {task.prompt.length > 150 && (
                        <ChevronDown
                          size={13}
                          className={cn(
                            "mt-1.5 shrink-0 text-[#8f9aab]",
                            showPrompt && "rotate-180",
                          )}
                        />
                      )}
                    </button>
                  </div>
                </div>
                <article className="min-w-0 pb-3">
                  <div className="mb-5 flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg border border-[#393b35] bg-[#23231d]">
                      <BrandMark className="size-5 text-[#d7bc83]" />
                    </span>
                    <span className="text-[13px] font-medium text-[#f2f3f5]">
                      IBot
                    </span>
                    <span
                      className="max-w-48 truncate rounded border border-[#292f39] bg-[#11151b] px-1.5 py-0.5 text-[10px] text-[#929dab]"
                      title={task.model}
                    >
                      {task.runMode === "single"
                        ? modelLabel(task.model)
                        : "Orchestrator"}
                    </span>
                  </div>
                  <div
                    role="status"
                    className="mb-6 flex items-start gap-2.5 rounded-lg border border-[#2b3036] bg-[#11161b] px-3.5 py-3 text-[12px] leading-5 text-[#aeb8c6]"
                  >
                    {running ? (
                      <Loader2
                        size={14}
                        className="mt-0.5 shrink-0 text-[#d7bc83] motion-safe:animate-spin"
                      />
                    ) : stopped ? (
                      <CircleAlert
                        size={14}
                        className="mt-0.5 shrink-0 text-[#c6a47e]"
                      />
                    ) : (
                      <Check
                        size={14}
                        className="mt-0.5 shrink-0 text-[#a9c7b2]"
                      />
                    )}
                    <span>{summary}</span>
                  </div>
                  {!!visibleAgents.length && (
                    <button
                      type="button"
                      onClick={() => setInspectorOpen(true)}
                      className="mb-6 flex w-full items-center justify-between rounded-xl border border-[#303640] px-3.5 py-3 text-[12px] text-[#c3ccda] xl:hidden"
                    >
                      <span className="flex items-center gap-2">
                        <Users2 size={14} />
                        {visibleAgents.length}{" "}
                        {visibleAgents.length === 1 ? "agent" : "agents"}{" "}
                        assigned
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-[#d7bc83]">
                        View work
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  )}
                  {task.result ? (
                    <div aria-busy={running}>
                      <TaskOutput text={task.result} />
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#252b34] pt-3.5">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-[11px] text-[#9da8b8] hover:text-white"
                          onClick={() =>
                            void copyText(task.result, "Result copied")
                          }
                        >
                          <Copy size={12} />
                          Copy result
                        </button>
                        <span className="text-[10px] text-[#7e8999]">
                          {running
                            ? "Writing response…"
                            : stopped
                              ? "Partial response"
                              : "Response complete"}
                        </span>
                      </div>
                    </div>
                  ) : running ? (
                    <div className="py-3 text-[13px] leading-6 text-[#8592a4]">
                      <p>
                        {task.phase === "Planning"
                          ? "The lead model is organizing the work. Your team and its progress will appear in the work panel."
                          : task.runMode === "single"
                            ? "Waiting for the model’s response."
                            : "Your specialists are working. You can inspect their contributions while the final response is prepared."}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] leading-6 text-[#8f9aab]">
                      No final response was received. Check the team’s
                      contributions for any partial work.
                    </p>
                  )}
                  {!!task.files.length && (
                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-[11px] font-medium text-[#a1adbc]">
                          {demo ? "Sample deliverables" : "Deliverables"}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setTab("files")}
                          className="text-[11px] text-[#bfae8c] hover:text-[#e4cca0]"
                        >
                          View all
                        </button>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {task.files.slice(0, 4).map((file) => (
                          <OutputFileRow
                            key={file.id}
                            file={file}
                            demo={demo}
                            onPreview={() => previewFile(file)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {!demo && (
                    <p className="mt-6 text-[10px] leading-5 text-[#788495]">
                      Input tokens:{" "}
                      {task.usage?.inputTokens?.toLocaleString() ??
                        "Unavailable"}{" "}
                      · Output tokens:{" "}
                      {task.usage?.outputTokens?.toLocaleString() ??
                        "Unavailable"}
                      . Usage is provider-reported. Generated code has not been
                      executed, tested, or deployed by IBot.
                    </p>
                  )}
                </article>
              </div>
            )}
            {tab === "agents" && (
              <>
                <div className="mb-6">
                  <h2 className="text-base font-medium text-[#e9edf3]">
                    Your task team
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[#9ba7b8]">
                    Assigned goals, model contributions, and progress. Select an
                    agent to inspect its work.
                  </p>
                </div>
                {visibleAgents.length ? (
                  <AgentGrid
                    agents={visibleAgents}
                    onSelect={selectAgent}
                    selectedId={selectedAgentId ?? undefined}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-[#303640] px-6 py-16 text-center">
                    <Users2 size={24} className="mx-auto mb-4 text-[#9aa5b4]" />
                    <h2 className="text-sm text-[#d7dee8]">
                      {stopped
                        ? "Team creation was interrupted."
                        : "Your team is coming together."}
                    </h2>
                    <p className="mt-2 text-xs text-[#8996a8]">
                      {stopped
                        ? "Retry the task to assemble your team."
                        : "Agents will appear as soon as the initial plan is ready."}
                    </p>
                  </div>
                )}
              </>
            )}
            {tab === "graph" && (
              <TaskGraph task={task} onSelectAgent={selectAgent} />
            )}
            {tab === "files" && (
              <>
                <div className="mb-6">
                  <h2 className="text-base font-medium text-[#e9edf3]">
                    Task deliverables
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[#9ba7b8]">
                    Preview and download{" "}
                    {demo
                      ? "sample deliverables"
                      : "generated Markdown and JSON outputs"}{" "}
                    from this run.
                  </p>
                </div>
                {task.files.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {task.files.map((file) => (
                      <OutputFileRow
                        key={file.id}
                        file={file}
                        demo={demo}
                        onPreview={() => previewFile(file)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#303640] px-6 py-16 text-center">
                    <FileText
                      size={25}
                      className="mx-auto mb-4 text-[#9aa5b4]"
                    />
                    <h2 className="text-sm text-[#d7dee8]">
                      No deliverables yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-[#8996a8]">
                      {demo
                        ? "Sample deliverables appear when the team starts finalizing."
                        : stopped
                          ? "No completed file outputs were received. Partial contributions may still be available in Agents."
                          : "Files appear when model-generated outputs are ready."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="workbench-composer sticky bottom-0 z-10 mt-auto border-t border-[#232933] bg-[#0b0d10]/95 px-4 pt-4 pb-3 backdrop-blur-xl sm:px-7">
            <div className="mx-auto max-w-[824px]">
              <ChatInput
                model={model}
                mode={demo ? "demo" : "live"}
                onModelChange={onModelChange}
                onSubmit={onSubmit}
                disabled={running}
                compact
              />
              <p className="mt-2 text-center text-[10px] leading-4 text-[#778496]">
                {running
                  ? "Your task is running. Stop it to make a new request."
                  : demo
                    ? "Follow-ups create a separate demo task."
                    : "Follow-ups use relevant prior results and start a separate execution."}
              </p>
            </div>
          </div>
        </div>
        {tab === "chat" && (
          <aside
            aria-label="Task work panel"
            className="sticky top-0 hidden max-h-[calc(100dvh-190px)] min-h-[calc(100dvh-190px)] self-start overflow-y-auto border-l border-[#252a33] bg-[#101318] xl:block"
          >
            {inspector}
          </aside>
        )}
      </div>
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <SheetContent className="w-[min(100vw,380px)] gap-0 overflow-y-auto border-[#252a33] bg-[#101318] p-0">
          <SheetHeader className="border-b border-[#252a33] px-5 pt-5 pb-4">
            <SheetTitle className="text-sm">Task activity</SheetTitle>
            <SheetDescription className="text-xs">
              Inspect your team, activity, and deliverables.
            </SheetDescription>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>
      <AgentDetailsPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
      />
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col border-[#303743] bg-[#11151b] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-5 text-sm">{preview?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {demo ? "Sample artifact" : "Generated output"} · {preview?.size}{" "}
              · {preview?.language}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#2b323e] bg-[#0b0d10] p-5">
            {preview?.language === "json" ? (
              <pre className="font-mono text-xs leading-6 text-[#bdc8d7]">
                <code>{preview.content}</code>
              </pre>
            ) : (
              <TaskOutput text={preview?.content ?? ""} />
            )}
          </div>
          <Button
            variant="outline"
            className="self-end text-xs"
            onClick={() => preview && downloadTaskFile(preview)}
          >
            <ArrowDownToLine size={14} />
            {demo ? "Download sample" : "Download file"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

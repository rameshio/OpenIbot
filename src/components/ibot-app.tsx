"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNavigation } from "@/components/layout/top-navigation";
import { HomeScreen } from "@/components/home-screen";
import {
  AgentsScreen,
  ChatsScreen,
  WorkflowsScreen,
} from "@/components/library-screens";
import { ConnectionsScreen } from "@/components/providers/connections-screen";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { AgentTeamBuilder } from "@/components/agents/agent-team-builder";
import { TaskWorkspace } from "@/components/workspace/task-workspace";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createTask, DEFAULT_TEAM, stopTask } from "@/lib/mock/task-engine";
import {
  hydrateWorkspace,
  useWorkspace,
  workspaceActions,
} from "@/lib/state/workspace-store";
import { cn } from "@/lib/utils";
import {
  getConnections,
  initializeConnections,
} from "@/lib/state/connection-store";
import {
  cancelAllRuns,
  cancelClientRun,
  createLiveTask,
  executeClientRun,
} from "@/lib/state/run-client";
import { followUpContext } from "@/lib/state/run-events";
import { modelKey, parseModelKey } from "@/lib/models";
import type {
  ExecutionMode,
  ModelId,
  RunRequest,
  Task,
  TeamMember,
} from "@/types";

export function IBotApp() {
  const pathname = usePathname();
  const router = useRouter();
  const state = useWorkspace();
  const [selectedModel, setSelectedModel] = useState<ModelId>("Auto");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftTeam, setDraftTeam] = useState<TeamMember[] | undefined>();
  const [composerKey, setComposerKey] = useState(0);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderTeam, setBuilderTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [builderKey, setBuilderKey] = useState(0);
  const taskId = pathname.startsWith("/tasks/")
    ? pathname.split("/")[2]
    : undefined;
  const task = state.tasks.find((item) => item.id === taskId);
  const titles: Record<string, string> = {
    "/": "Workspace",
    "/chats": "Task history",
    "/agents": "Your team",
    "/workflows": "Playbooks",
    "/models": "Models",
    "/api-keys": "API Keys",
    "/settings": "Settings",
  };
  const title = task ? "Task workspace" : (titles[pathname] ?? "Workspace");
  useEffect(() => {
    hydrateWorkspace();
    void initializeConnections();
    const timer = setInterval(workspaceActions.tick, 1000);
    window.addEventListener("pagehide", cancelAllRuns);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", cancelAllRuns);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      state.reducedMotion,
    );
  }, [state.reducedMotion]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDraft("");
        setDraftTeam(undefined);
        setComposerKey((key) => key + 1);
        router.push("/");
        setTimeout(() => document.getElementById("task-prompt")?.focus(), 100);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
  function startTask(
    prompt: string,
    model: ModelId,
    tools: string[],
    autoMode = true,
    team?: TeamMember[],
    context?: string,
    executionMode: ExecutionMode = state.executionMode,
    previousRunId?: string,
    parentTaskId?: string,
  ) {
    try {
      if (!prompt.trim() || prompt.length > 12000)
        throw new Error("Enter a task of 1–12,000 characters.");
      let created: Task;
      if (executionMode === "demo") {
        const demoModel = [
          "Auto",
          "GPT",
          "Claude",
          "Gemini",
          "Grok",
          "Local Model",
        ].includes(model)
          ? model
          : "Auto";
        const selectedTeam =
          team ??
          (autoMode
            ? draftTeam
            : [
                {
                  id: "solo",
                  name: "Task Agent",
                  role: "Developer" as const,
                  model: demoModel === "Auto" ? "GPT" : demoModel,
                },
              ]);
        created = {
          ...createTask(prompt, demoModel, selectedTeam, tools),
          mode: "demo",
          runId: crypto.randomUUID(),
          previousRunId,
          parentTaskId,
        };
      } else {
        const connections = getConnections();
        if (!connections.ready || !connections.unlocked)
          throw new Error(
            "Unlock your local workspace and test a provider in API Keys first.",
          );
        if (
          state.tasks.some(
            (item) => item.mode === "live" && item.status === "running",
          )
        )
          throw new Error(
            "Stop or finish the active live task before starting another.",
          );
        const lead = parseModelKey(
          model === "Auto" ? state.defaultModel : model,
        );
        if (!lead)
          throw new Error(
            "Choose a tested model, or set the default model for Auto in Models.",
          );
        const selectedTeam = team ?? (autoMode ? draftTeam : undefined);
        const assigned = selectedTeam?.map((member) => member.model) ?? [];
        for (const key of [modelKey(lead), ...assigned]) {
          const ref = parseModelKey(key);
          if (
            !ref ||
            !connections.connections.some(
              (connection) =>
                connection.status === "connected" &&
                connection.provider === ref.provider &&
                connection.modelId === ref.modelId,
            )
          )
            throw new Error(
              "Every assigned model must be tested and connected in API Keys before the task starts.",
            );
        }
        if (
          selectedTeam &&
          (selectedTeam.length < 1 ||
            selectedTeam.length > 4 ||
            selectedTeam.some((member) => !member.name.trim()) ||
            new Set(
              selectedTeam.map((member) => member.name.trim().toLowerCase()),
            ).size !== selectedTeam.length)
        )
          throw new Error(
            "Use 1–4 agents with unique names and exact model assignments.",
          );
        const request: RunRequest = {
          taskId: crypto.randomUUID(),
          runId: crypto.randomUUID(),
          prompt: prompt.trim(),
          mode: selectedTeam ? "manual" : autoMode ? "auto" : "single",
          lead,
          ...(selectedTeam ? { team: selectedTeam } : {}),
          ...(context ? { context } : {}),
        };
        created = createLiveTask(request, previousRunId);
        created.parentTaskId = parentTaskId;
        workspaceActions.addTask(created);
        void executeClientRun(request);
      }
      if (executionMode === "demo") workspaceActions.addTask(created);
      router.push(`/tasks/${created.id}`);
      setDraft("");
      setDraftTeam(undefined);
      setComposerKey((key) => key + 1);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start the task",
      );
      return false;
    }
  }
  function rerun(task: Task) {
    startTask(
      task.prompt,
      task.model,
      task.tools,
      task.runMode !== "single",
      task.mode === "live"
        ? task.requestedTeam
        : task.agents.map(({ id, name, role, model, dependsOn }) => ({
            id,
            name,
            role,
            model,
            dependsOn,
          })),
      task.context,
      task.mode ?? "demo",
      task.runId,
      task.parentTaskId,
    );
  }
  function chooseExample(prompt: string, team?: TeamMember[]) {
    setDraftTeam(state.executionMode === "demo" ? team : undefined);
    setDraft(prompt);
    setComposerKey((key) => key + 1);
    router.push("/");
    setTimeout(() => document.getElementById("task-prompt")?.focus(), 100);
  }
  function buildTeam(team: TeamMember[]) {
    setBuilderTeam(team);
    setBuilderKey((key) => key + 1);
    setBuilderOpen(true);
  }
  function navigate() {
    setMobileOpen(false);
  }
  return (
    <MotionConfig reducedMotion={state.reducedMotion ? "always" : "user"}>
      <TooltipProvider>
        <div className={cn("app-shell", collapsed && "sidebar-collapsed")}>
          <aside className="desktop-sidebar">
            <Sidebar
              pathname={pathname}
              tasks={state.tasks}
              onNavigate={navigate}
              onCollapse={() => setCollapsed(true)}
              onNewTask={() => {
                setDraft("");
                setDraftTeam(undefined);
                setComposerKey((key) => key + 1);
              }}
            />
          </aside>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="w-[264px] border-[#252525] bg-[#111111] p-0"
              showCloseButton={false}
            >
              <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Browse your tasks, teams, and settings.
              </SheetDescription>
              <Sidebar
                pathname={pathname}
                tasks={state.tasks}
                onNavigate={navigate}
                onCollapse={() => setMobileOpen(false)}
                onNewTask={() => {
                  setDraft("");
                  setDraftTeam(undefined);
                  setComposerKey((key) => key + 1);
                }}
              />
            </SheetContent>
          </Sheet>
          <div className="main-shell">
            <TopNavigation
              mode={task?.mode ?? state.executionMode}
              onModeChange={(mode) => {
                workspaceActions.setExecutionMode(mode);
                setSelectedModel("Auto");
                setDraftTeam(undefined);
                router.push("/");
              }}
              title={title}
              sidebarCollapsed={collapsed}
              onToggleSidebar={() => {
                if (window.innerWidth < 1024) setMobileOpen(true);
                else setCollapsed(!collapsed);
              }}
            />
            <main className="main-content">
              {pathname === "/" && (
                <HomeScreen
                  onBuildTeam={buildTeam}
                  mode={state.executionMode}
                  model={selectedModel}
                  onModelChange={setSelectedModel}
                  onSubmit={startTask}
                  draft={draft}
                  composerKey={composerKey}
                  onExample={chooseExample}
                  teamCount={draftTeam?.length}
                  onClearTeam={() => setDraftTeam(undefined)}
                />
              )}
              {pathname === "/chats" && <ChatsScreen tasks={state.tasks} />}
              {pathname === "/agents" && (
                <AgentsScreen
                  mode={state.executionMode}
                  savedTeam={state.savedTeam}
                  onBuild={buildTeam}
                />
              )}
              {pathname === "/workflows" && (
                <WorkflowsScreen
                  mode={state.executionMode}
                  onUse={chooseExample}
                />
              )}
              {(pathname === "/models" || pathname === "/api-keys") && (
                <ConnectionsScreen
                  view={pathname === "/models" ? "models" : "api-keys"}
                  defaultModel={state.defaultModel}
                  onDefaultModelChange={workspaceActions.setDefaultModel}
                />
              )}
              {pathname === "/settings" && (
                <SettingsScreen
                  defaultModel={state.defaultModel}
                  onDefaultModelChange={workspaceActions.setDefaultModel}
                  reducedMotion={state.reducedMotion}
                  onReducedMotionChange={workspaceActions.setReducedMotion}
                  onClearHistory={() => {
                    cancelAllRuns();
                    workspaceActions.clearHistory();
                    toast("Conversation history cleared");
                  }}
                />
              )}
              {task && (
                <TaskWorkspace
                  key={task.id}
                  task={task}
                  previousTask={state.tasks.find(
                    (item) => item.id === task.parentTaskId,
                  )}
                  model={selectedModel}
                  onModelChange={setSelectedModel}
                  onSubmit={(prompt, model, tools, autoMode) =>
                    startTask(
                      prompt,
                      model,
                      tools,
                      autoMode,
                      undefined,
                      followUpContext(task),
                      task.mode ?? "demo",
                      undefined,
                      task.id,
                    )
                  }
                  onStop={() => {
                    if (task.mode === "live") cancelClientRun(task);
                    else workspaceActions.updateTask(stopTask(task));
                    toast("Task stopped");
                  }}
                  onRetry={() => {
                    rerun(task);
                  }}
                  onFailure={() =>
                    workspaceActions.updateTask({
                      ...task,
                      status: "failed",
                      agents: task.agents.map((agent) =>
                        agent.status === "completed"
                          ? agent
                          : {
                              ...agent,
                              status: "failed",
                              activity: "Simulated tool unavailable",
                            },
                      ),
                    })
                  }
                />
              )}
              {!titles[pathname] && !task && state.hydrated && (
                <div className="empty-state py-32">
                  <h1 className="text-xl text-[#ddd]">This task isn’t here.</h1>
                  <p>
                    It may have been cleared, or created in another browser.
                  </p>
                  <Button variant="outline" onClick={() => router.push("/")}>
                    <ArrowLeft size={14} />
                    Back to your workspace
                  </Button>
                </div>
              )}
            </main>
          </div>
          <AgentTeamBuilder
            executionMode={state.executionMode}
            key={builderKey}
            open={builderOpen}
            onOpenChange={setBuilderOpen}
            initialTeam={builderTeam}
            onStart={(prompt, team) => {
              const accepted = startTask(prompt, "Auto", [], false, team);
              if (accepted) {
                workspaceActions.saveTeam(team);
                setBuilderOpen(false);
              }
              return accepted;
            }}
          />
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

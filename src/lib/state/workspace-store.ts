"use client";
import { useSyncExternalStore } from "react";
import { advanceTask } from "../mock/task-engine";
import type {
  ExecutionMode,
  ModelId,
  RunEvent,
  Task,
  TeamMember,
} from "../../types";
import {
  cleanTask,
  cleanTeamMember,
  isStoredTask,
  isTeamMember,
  serializeWorkspace,
} from "./validation";
import { applyRunEvent, interruptTask } from "./run-events";
import { parseModelKey } from "../models";
type WorkspaceState = {
  tasks: Task[];
  defaultModel: ModelId;
  reducedMotion: boolean;
  savedTeam: TeamMember[] | null;
  executionMode: ExecutionMode;
  hydrated: boolean;
};
const INITIAL_STATE: WorkspaceState = {
  tasks: [],
  defaultModel: "Auto",
  reducedMotion: false,
  savedTeam: null,
  executionMode: "live",
  hydrated: false,
};
let state = INITIAL_STATE;
const listeners = new Set<() => void>();
const STORAGE_KEY = "ibot-workspace-v1";
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeWorkspace(state));
  } catch {
    /* Browser storage may be disabled or full; the session remains usable. */
  }
}
function emit(streaming = false) {
  listeners.forEach((listener) => listener());
  if (streaming) {
    saveTimer ??= setTimeout(() => {
      saveTimer = undefined;
      persist();
    }, 250);
  } else {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = undefined;
    persist();
  }
}
export function hydrateWorkspace() {
  if (state.hydrated) return;
  const restored: Partial<WorkspaceState> = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const raw = saved && saved.length <= 15_000_000 ? JSON.parse(saved) : null;
    if (raw && typeof raw === "object") {
      if (Array.isArray(raw.tasks))
        restored.tasks = raw.tasks
          .filter(isStoredTask)
          .slice(0, 30)
          .map((value: Task) =>
            interruptTask(
              cleanTask(value),
              "Interrupted by a reload. Partial output was kept; rerun to start a new attempt.",
              true,
            ),
          );
      if (
        typeof raw.defaultModel === "string" &&
        parseModelKey(raw.defaultModel)
      )
        restored.defaultModel = raw.defaultModel;
      if (typeof raw.reducedMotion === "boolean")
        restored.reducedMotion = raw.reducedMotion;
      if (raw.executionMode === "demo") restored.executionMode = "demo";
      if (
        Array.isArray(raw.savedTeam) &&
        raw.savedTeam.length > 0 &&
        raw.savedTeam.length <= 8 &&
        raw.savedTeam.every(isTeamMember)
      )
        restored.savedTeam = raw.savedTeam.map(cleanTeamMember);
    }
  } catch {
    /* Ignore malformed snapshots. */
  }
  state = { ...INITIAL_STATE, ...restored, hydrated: true };
  emit(); // Also removes obsolete demo provider metadata from older snapshots.
}
export function getWorkspace() {
  return state;
}
export const workspaceActions = {
  addTask(task: Task) {
    state = { ...state, tasks: [cleanTask(task), ...state.tasks].slice(0, 30) };
    emit();
  },
  updateTask(task: Task) {
    state = {
      ...state,
      tasks: state.tasks.map((item) =>
        item.id === task.id ? cleanTask(task) : item,
      ),
    };
    emit();
  },
  event(event: RunEvent) {
    state = {
      ...state,
      tasks: state.tasks.map((task) => applyRunEvent(task, event)),
    };
    emit(event.type !== "done");
  },
  interrupt(runId: string, message: string, stopped = false) {
    state = {
      ...state,
      tasks: state.tasks.map((task) =>
        task.runId === runId ? interruptTask(task, message, stopped) : task,
      ),
    };
    emit();
  },
  tick() {
    if (
      !state.tasks.some(
        (task) => task.mode !== "live" && task.status === "running",
      )
    )
      return;
    state = {
      ...state,
      tasks: state.tasks.map((task) =>
        task.mode === "live" ? task : advanceTask(task),
      ),
    };
    emit();
  },
  setDefaultModel(defaultModel: ModelId) {
    state = { ...state, defaultModel };
    emit();
  },
  setExecutionMode(executionMode: ExecutionMode) {
    state = { ...state, executionMode };
    emit();
  },
  setReducedMotion(reducedMotion: boolean) {
    state = { ...state, reducedMotion };
    emit();
  },
  saveTeam(savedTeam: TeamMember[]) {
    state = { ...state, savedTeam: savedTeam.map(cleanTeamMember) };
    emit();
  },
  clearHistory() {
    state = { ...state, tasks: [] };
    emit();
  },
};
export function useWorkspace() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => INITIAL_STATE,
  );
}

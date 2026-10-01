"use client";
import { Check, Circle, Loader2 } from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
const teamPhases = [
  "Planning",
  "Creating agents",
  "Agents working",
  "Reviewing",
  "Finalizing",
  "Completed",
];
export function TaskStatus({ task }: { task: Task }) {
  const phases =
    task.runMode === "single"
      ? ["Creating agents", "Agents working", "Finalizing", "Completed"]
      : task.runMode === "manual"
        ? teamPhases.slice(1)
        : teamPhases;
  const current = phases.indexOf(task.phase);
  return (
    <div
      className="task-status-strip"
      aria-label={`Task status: ${task.status === "running" ? task.phase : task.status}`}
    >
      <div className="flex min-w-max items-center gap-2 sm:gap-3">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center gap-2 sm:gap-3">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-3 sm:w-5",
                  current >= index ? "bg-[#575b4e]" : "bg-[#292929]",
                )}
              />
            )}
            <span
              className={cn(
                "flex items-center gap-1.5 text-[10px] sm:text-[11px]",
                index === current
                  ? "text-[#e3e5d9]"
                  : current > index
                    ? "text-[#969d89]"
                    : "text-[#626262]",
              )}
            >
              {current > index ||
              (task.status === "completed" && index === current) ? (
                <Check size={12} />
              ) : current === index && task.status === "running" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Circle size={10} />
              )}{" "}
              {phase}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

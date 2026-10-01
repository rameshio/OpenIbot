"use client";
import { File, GitBranch, MessageSquare, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
export type WorkspaceTab = "chat" | "agents" | "graph" | "files";
export function WorkspaceTabs({
  value,
  onChange,
  agentCount,
  fileCount,
}: {
  value: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  agentCount: number;
  fileCount: number;
}) {
  const tabs = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "agents", label: "Agents", icon: Users2, count: agentCount },
    { id: "graph", label: "Graph", icon: GitBranch },
    { id: "files", label: "Files", icon: File, count: fileCount },
  ] as const;
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Task views">
      {tabs.map((tab) => (
        <button
          role="tab"
          id={`tab-${tab.id}`}
          aria-controls="workspace-content"
          aria-selected={value === tab.id}
          tabIndex={value === tab.id ? 0 : -1}
          onKeyDown={(event) => {
            const index = tabs.findIndex((item) => item.id === value);
            const next =
              event.key === "ArrowRight"
                ? (index + 1) % tabs.length
                : event.key === "ArrowLeft"
                  ? (index - 1 + tabs.length) % tabs.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? tabs.length - 1
                      : -1;
            if (next >= 0) {
              event.preventDefault();
              onChange(tabs[next].id);
              document.getElementById(`tab-${tabs[next].id}`)?.focus();
            }
          }}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "workspace-tab",
            value === tab.id && "workspace-tab-active",
          )}
        >
          <tab.icon size={14} />
          {tab.label}
          {"count" in tab && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

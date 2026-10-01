"use client";
import Link from "next/link";
import {
  ChevronRight,
  CircleHelp,
  Menu,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";
import type { ExecutionMode } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function TopNavigation({
  title,
  sidebarCollapsed,
  onToggleSidebar,
  mode,
  onModeChange,
}: {
  title: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
}) {
  return (
    <header className="top-navigation">
      <div className="flex min-w-0 items-center gap-3">
        <button
          className={`icon-button h-8 w-8 ${sidebarCollapsed ? "" : "mobile-nav-toggle"}`}
          onClick={onToggleSidebar}
          aria-label="Open navigation"
        >
          <Menu size={18} className="lg:hidden" />
          <PanelLeftOpen size={17} className="hidden lg:block" />
        </button>
        <span className="hidden text-[12px] text-[#747d8b] sm:inline">
          Personal workspace
        </span>
        <ChevronRight size={12} className="hidden text-[#474747] sm:inline" />
        <span className="truncate text-[12px] text-[#b7b7b7]">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/api-keys"
          className="hidden items-center gap-1.5 text-[11px] text-[#84918b] md:flex"
        >
          <ShieldCheck size={13} />
          Local session
        </Link>
        <select
          aria-label="Execution mode"
          value={mode}
          onChange={(event) =>
            onModeChange(event.target.value as ExecutionMode)
          }
          className="demo-badge cursor-pointer outline-none"
        >
          <option value="live">Live · your API</option>
          <option value="demo">Demo · simulation</option>
        </select>
        <Dialog>
          <DialogTrigger
            className="icon-button h-7 w-7 text-[#757575]"
            aria-label="About this workspace"
          >
            <CircleHelp size={16} />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your workspace, explained</DialogTitle>
              <DialogDescription>
                A local workspace for your AI models and specialist teams.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                In Live mode, connect and test your provider in API Keys, then
                choose a default model. Auto uses that model to plan, delegate,
                and review. Manual teams keep your exact assignments. Calls may
                incur provider charges.
              </p>
              <p>
                Browser control, terminal execution, plugins, scheduled jobs,
                and teaching by demonstration are future capabilities.
                Attachments show local metadata only; models do not receive
                their contents. Generated code is not built, tested, or deployed
                by IBot.
              </p>
              <p>
                Demo mode runs a labeled simulation without API calls. Task
                history and preferences stay in this browser; entered API keys
                stay in server memory until reload, disconnect, or session
                expiry. Press Ctrl/⌘ K for a new task.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}

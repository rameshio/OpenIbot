"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Box,
  ChevronDown,
  CircleHelp,
  GitBranch,
  KeyRound,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  Users2,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { useConnections } from "@/lib/state/connection-store";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
export const NAV_ITEMS = [
  { label: "Chats", href: "/chats", icon: MessageSquare },
  { label: "Agents", href: "/agents", icon: Users2 },
  { label: "Workflows", href: "/workflows", icon: GitBranch },
  { label: "Models", href: "/models", icon: Box },
  { label: "API Keys", href: "/api-keys", icon: KeyRound },
];
export function Sidebar({
  pathname,
  tasks,
  onNavigate,
  onCollapse,
  onNewTask,
}: {
  pathname: string;
  tasks: Task[];
  onNavigate?: () => void;
  onCollapse: () => void;
  onNewTask?: () => void;
}) {
  const [query, setQuery] = useState("");
  const { connections } = useConnections();
  const connected = connections.filter(
    (item) => item.status === "connected",
  ).length;
  const matching = tasks.filter((task) =>
    `${task.title} ${task.prompt}`.toLowerCase().includes(query.toLowerCase()),
  );
  const activeCount = tasks.filter((task) => task.status === "running").length;
  return (
    <div className="ibot-sidebar">
      <div className="sidebar-brand">
        <Link href="/" onClick={onNavigate} aria-label="IBot home">
          <span className="sidebar-brand-icon">
            <BrandMark className="size-6" />
          </span>
          <span>
            ibot<span className="brand-dot">.</span>
          </span>
        </Link>
        <button
          onClick={onCollapse}
          className="icon-button size-8"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <Link
        href="/"
        className="new-task-button"
        onClick={() => {
          onNewTask?.();
          onNavigate?.();
        }}
      >
        <Plus size={16} />
        <span className="flex-1">New task</span>
        <kbd>⌘ K</kbd>
      </Link>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {NAV_ITEMS.map((item, index) => (
          <Link
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            className={cn(
              "nav-link",
              pathname === item.href && "nav-link-active",
              index === 3 && "mt-4",
            )}
            aria-label={item.label}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            <item.icon size={17} strokeWidth={1.7} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/chats" && activeCount > 0 && (
              <span className="sidebar-count">{activeCount}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-history-heading">
        <span>RECENT TASKS</span>
        <Link href="/chats" onClick={onNavigate} aria-label="View all tasks">
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <label className="sidebar-search">
        <Search size={13} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a task…"
          aria-label="Search recent tasks"
        />
      </label>
      <div className="sidebar-task-list">
        {matching.length ? (
          matching.slice(0, 12).map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              onClick={onNavigate}
              className={cn(
                "sidebar-task",
                pathname.endsWith(task.id) && "sidebar-task-selected",
              )}
              aria-current={pathname.endsWith(task.id) ? "page" : undefined}
            >
              <span className={cn("task-state-dot", task.status)} />
              <span className="min-w-0 flex-1">
                <span className="sidebar-task-title">{task.title}</span>
                <span className="sidebar-task-detail">
                  {task.mode === "live" ? "Live" : "Demo"} <span>·</span>{" "}
                  {task.status === "running" ? task.phase : task.status}
                </span>
              </span>
            </Link>
          ))
        ) : (
          <div className="sidebar-empty">
            <MessageSquare size={18} strokeWidth={1.4} />
            <p>{query ? "No matching tasks" : "A fresh page for your ideas"}</p>
            <span>
              {query
                ? "Try another search."
                : "Your conversations will appear here."}
            </span>
          </div>
        )}
      </div>
      <div className="sidebar-bottom">
        <Link
          href="/api-keys"
          onClick={onNavigate}
          className="sidebar-connection"
        >
          <span
            className={`status-light ${connected ? "is-ready" : "is-waiting"}`}
          />
          <span>
            {connected
              ? `${connected} provider${connected === 1 ? "" : "s"} connected`
              : "Connect your first model"}
          </span>
          <ArrowUpRight size={13} />
        </Link>
        <div className="sidebar-bottom-links">
          <Link href="/settings" className="nav-link" onClick={onNavigate}>
            <Settings2 size={16} />
            Settings
          </Link>
          <Link
            href="/settings"
            className="icon-button size-8"
            aria-label="Workspace preferences"
            onClick={onNavigate}
          >
            <CircleHelp size={16} />
          </Link>
        </div>
        <Link href="/settings" onClick={onNavigate} className="sidebar-profile">
          <span className="workspace-avatar">W</span>
          <span className="flex-1">
            <strong>Personal workspace</strong>
            <small>Local · your models, your work</small>
          </span>
          <ChevronDown size={13} />
        </Link>
      </div>
    </div>
  );
}

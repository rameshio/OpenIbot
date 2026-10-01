"use client";
import { useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  Paperclip,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ModelSelector } from "./model-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ExecutionMode, ModelId } from "@/types";

interface ChatInputProps {
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  onSubmit: (
    prompt: string,
    model: ModelId,
    tools: string[],
    autoMode: boolean,
  ) => boolean | void;
  mode?: ExecutionMode;
  initialPrompt?: string;
  compact?: boolean;
  disabled?: boolean;
}
const availableTools = [
  { name: "Browser control", icon: Globe2 },
  { name: "Terminal execution", icon: Terminal },
  { name: "Plugins", icon: SlidersHorizontal },
  { name: "Scheduled jobs", icon: Zap },
  { name: "Teaching by demonstration", icon: Sparkles },
];
export function ChatInput({
  model,
  onModelChange,
  onSubmit,
  initialPrompt = "",
  compact,
  disabled,
  mode = "live",
}: ChatInputProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: number }[]
  >([]);
  const [autoMode, setAutoMode] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  function submit() {
    if (!prompt.trim() || disabled) return;
    const accepted = onSubmit(prompt.trim(), model, [], autoMode);
    if (accepted === false) return;
    setPrompt("");
    setAttachments([]);
  }
  return (
    <div className={cn("composer group", compact && "composer-compact")}>
      <label htmlFor="task-prompt" className="sr-only">
        Describe your task
      </label>
      <textarea
        id="task-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={disabled}
        placeholder={
          compact
            ? "Continue the conversation…"
            : "Describe a task. A goal, a question, a work-in-progress…"
        }
        rows={compact ? 2 : 3}
        maxLength={12000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full resize-none bg-transparent text-[15px] leading-7 text-[#eee] outline-none placeholder:text-[#696969] disabled:opacity-50"
      />
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file) => (
            <span
              key={file.id}
              className="flex max-w-full items-center gap-2 rounded-md border border-[#303030] bg-[#1c1c1c] px-2 py-1 text-xs text-[#b1b1b1]"
            >
              <FileText size={12} />
              <span className="max-w-44 truncate">{file.name}</span>
              <button
                onClick={() =>
                  setAttachments((files) =>
                    files.filter((item) => item.id !== file.id),
                  )
                }
                aria-label={`Remove ${file.name}`}
                className="p-1 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <button
            className="icon-button h-8 w-8"
            aria-label="Attach files"
            title="Attach files locally"
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
          >
            <Plus size={20} />
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            aria-label="Choose attachments"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setAttachments((items) =>
                [
                  ...items,
                  ...files.map((file) => ({
                    id: crypto.randomUUID(),
                    name: file.name,
                    size: file.size,
                  })),
                ].slice(0, 6),
              );
              if (files.length)
                toast("Attachment added locally", {
                  description:
                    "Only the filename is shown here. The model will not receive the file or its contents.",
                });
              e.target.value = "";
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="composer-control"
              aria-label="Task tools"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden min-[400px]:inline">Tools</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Future capabilities · unavailable
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTools.map((tool) => (
                <DropdownMenuItem key={tool.name} disabled>
                  <tool.icon size={15} />
                  <span className="flex-1">{tool.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mx-0.5 h-4 w-px bg-[#303030]" />
          <ModelSelector value={model} onChange={onModelChange} mode={mode} />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="composer-control px-1 sm:px-2"
              aria-label={`Team mode: ${autoMode ? "Auto" : "Single agent"}`}
            >
              <Zap
                size={13}
                className={autoMode ? "text-[#c4c4a3]" : "text-[#777]"}
              />
              <span className="hidden sm:inline">
                {autoMode ? "Auto team" : "Single agent"}
              </span>
              <ChevronDown size={12} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                How your team comes together
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAutoMode(true)}>
                <Sparkles size={16} />
                <span className="flex-1">Auto · assemble a team</span>
                {autoMode && <Check size={14} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAutoMode(false)}>
                <Paperclip size={16} />
                <span className="flex-1">Single agent</span>
                {!autoMode && <Check size={14} />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            className="send-button"
            disabled={!prompt.trim() || disabled}
            onClick={submit}
            aria-label="Send task"
          >
            <ArrowUp size={19} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  Accessibility,
  ChevronDown,
  Database,
  Network,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useConnections } from "@/lib/state/connection-store";
import { modelKey, modelLabel } from "@/lib/models";
import type { ModelId } from "@/types";

type SettingsScreenProps = {
  defaultModel: ModelId;
  onDefaultModelChange: (value: ModelId) => void;
  reducedMotion: boolean;
  onReducedMotionChange: (value: boolean) => void;
  onClearHistory: () => void;
};

export function SettingsScreen({
  defaultModel,
  onDefaultModelChange,
  reducedMotion,
  onReducedMotionChange,
  onClearHistory,
}: SettingsScreenProps) {
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false);
  const [historyCleared, setHistoryCleared] = useState(false);
  const clearHistoryButtonRef = useRef<HTMLButtonElement>(null);
  const { connections } = useConnections();
  const modelOptions = connections
    .filter((connection) => connection.status === "connected")
    .map(modelKey);

  function clearHistory() {
    onClearHistory();
    setClearHistoryOpen(false);
    setHistoryCleared(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-11 lg:px-12">
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#777777]">
          <Settings2 className="size-3.5" />
          Preferences
        </div>
        <h1 className="text-[27px] font-medium tracking-[-0.045em] text-[#f5f5f5] sm:text-[32px]">
          Make room for your work.
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-[#8a8a8a]">
          A few thoughtful defaults for your workspace.
        </p>
      </div>

      <div className="space-y-7">
        <section aria-labelledby="settings-model-heading">
          <h2
            id="settings-model-heading"
            className="mb-3 flex items-center gap-2 text-xs font-medium text-[#b0b0b0]"
          >
            <Network className="size-3.5 text-[#727272]" />
            Models
          </h2>
          <div className="flex flex-col gap-4 rounded-2xl border border-[#242424] bg-[#111111] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <label
                htmlFor="settings-default-model"
                className="text-[13px] font-medium text-[#e7e7e7]"
              >
                Default model
              </label>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-[#8a8a8a]">
                Auto uses this exact model for planning, specialists, and
                review. Connect and test a model in API Keys first. IBot never
                switches paid providers automatically.
              </p>
            </div>
            <div className="relative shrink-0">
              <select
                id="settings-default-model"
                value={modelOptions.includes(defaultModel) ? defaultModel : ""}
                onChange={(event) =>
                  onDefaultModelChange(event.target.value as ModelId)
                }
                className="h-10 w-full max-w-72 appearance-none rounded-lg border border-[#353535] bg-[#1b1b1b] py-2 pl-3 pr-9 text-xs text-[#e0e0e0] outline-none transition-colors duration-200 hover:border-[#505050] focus-visible:ring-2 focus-visible:ring-white/30 sm:w-56"
              >
                <option value="" disabled>
                  {modelOptions.length
                    ? "Choose default model"
                    : "Connect a model first"}
                </option>
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {modelLabel(model)} · {model.split(":")[0]}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3.5 size-3 text-[#8a8a8a]"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-accessibility-heading">
          <h2
            id="settings-accessibility-heading"
            className="mb-3 flex items-center gap-2 text-xs font-medium text-[#b0b0b0]"
          >
            <Accessibility className="size-3.5 text-[#727272]" />
            Accessibility
          </h2>
          <div className="flex items-center justify-between gap-6 rounded-2xl border border-[#242424] bg-[#111111] p-5 sm:p-6">
            <div>
              <label
                htmlFor="settings-reduced-motion"
                className="cursor-pointer text-[13px] font-medium text-[#e7e7e7]"
              >
                Reduce motion
              </label>
              <p
                id="settings-reduced-motion-description"
                className="mt-1.5 text-xs leading-5 text-[#8a8a8a]"
              >
                Keep the workspace still with fewer animated transitions.
              </p>
            </div>
            <Switch
              id="settings-reduced-motion"
              checked={reducedMotion}
              onCheckedChange={onReducedMotionChange}
              aria-describedby="settings-reduced-motion-description"
              className="shrink-0 data-[state=checked]:bg-[#e5e5e5] data-[state=unchecked]:bg-[#353535]"
            />
          </div>
        </section>

        <section aria-labelledby="settings-data-heading">
          <h2
            id="settings-data-heading"
            className="mb-3 flex items-center gap-2 text-xs font-medium text-[#b0b0b0]"
          >
            <Database className="size-3.5 text-[#727272]" />
            Workspace data
          </h2>
          <div className="flex flex-col gap-5 rounded-2xl border border-[#242424] bg-[#111111] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="text-[13px] font-medium text-[#e7e7e7]">
                Conversation history
              </h3>
              <p className="mt-1.5 max-w-md text-xs leading-5 text-[#8a8a8a]">
                Prompts, generated outputs, and preferences are saved in this
                browser. API keys are excluded. Clear history to remove saved
                conversations.
              </p>
            </div>
            <Button
              ref={clearHistoryButtonRef}
              variant="outline"
              className="shrink-0 gap-2 rounded-lg border-[#363030] bg-transparent text-xs font-normal text-[#c5aaaa] hover:border-[#624444] hover:bg-[#211919] hover:text-[#e2c5c5]"
              onClick={() => setClearHistoryOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Clear history
            </Button>
          </div>
          <p
            aria-live="polite"
            className="mt-2 min-h-5 text-[11px] text-[#a2aaa3]"
          >
            {historyCleared ? "Conversation history cleared." : ""}
          </p>
        </section>
      </div>

      <div className="mt-7 border-t border-[#202020] pt-5">
        <p className="text-[11px] leading-5 text-[#666666]">
          Live mode uses your connected provider. Demo mode is simulated.
          Entered API keys stay in server memory for this session and are
          cleared on reload or disconnect; environment credentials remain on
          your server.
        </p>
      </div>

      <Dialog open={clearHistoryOpen} onOpenChange={setClearHistoryOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            clearHistoryButtonRef.current?.focus();
          }}
          className="rounded-2xl border-[#292929] bg-[#111111] text-[#f5f5f5] sm:max-w-md"
        >
          <DialogHeader className="text-left">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-[#3b2d2d] bg-[#211919]">
              <Trash2 className="size-[18px] text-[#c7a3a3]" />
            </div>
            <DialogTitle className="text-lg font-medium tracking-tight">
              Clear conversation history?
            </DialogTitle>
            <DialogDescription className="text-xs leading-5 text-[#8a8a8a]">
              All saved conversations in this browser will be removed. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 gap-2">
            <Button
              variant="outline"
              className="border-[#303030] bg-transparent text-xs hover:bg-white/[0.04]"
              onClick={() => setClearHistoryOpen(false)}
            >
              Keep conversations
            </Button>
            <Button
              className="border border-[#624141] bg-[#392525] text-xs text-[#f0d0d0] hover:bg-[#493030]"
              onClick={clearHistory}
            >
              Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderMark } from "@/components/brand";
import { modelKey, modelLabel, parseModelKey, PROVIDERS } from "@/lib/models";
import { useConnections } from "@/lib/state/connection-store";
import type { ExecutionMode, ModelId } from "@/types";

export const MODELS: ModelId[] = [
  "Auto",
  "GPT",
  "Claude",
  "Gemini",
  "Grok",
  "Local Model",
];
const descriptions: Record<string, string> = {
  Auto: "Uses your configured default model",
  GPT: "Reasoning, code, and everyday tasks",
  Claude: "Thoughtful writing and analysis",
  Gemini: "Research and multimodal tasks",
  Grok: "Fresh perspectives and review",
  "Local Model": "Your own local model",
};
export function ModelSelector({
  value,
  onChange,
  mode = "live",
}: {
  value: ModelId;
  onChange: (value: ModelId) => void;
  mode?: ExecutionMode;
}) {
  const { connections } = useConnections();
  const choices =
    mode === "demo"
      ? MODELS
      : [
          "Auto",
          ...connections
            .filter((connection) => connection.status === "connected")
            .map(modelKey),
        ];
  const unavailable = !choices.includes(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="composer-control min-w-0 max-w-[180px] text-[#d3d3d3] sm:max-w-[240px]"
        aria-label={`Lead model: ${value}`}
        title={
          unavailable
            ? `${modelLabel(value)} · not connected`
            : modelLabel(value)
        }
      >
        <ProviderMark model={value} />
        <span className="min-w-0 truncate">
          {modelLabel(value)}
          {unavailable ? " · unavailable" : ""}
        </span>
        <ChevronDown size={12} className="shrink-0 text-[#737373]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-32px)] rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-2 text-[11px] font-normal uppercase tracking-wider text-muted-foreground">
          Lead model · {mode === "demo" ? "Demo" : "Live"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {choices.map((model) => (
          <DropdownMenuItem
            key={model}
            onClick={() => onChange(model)}
            className="gap-3 rounded-lg px-2.5 py-2.5"
          >
            <ProviderMark model={model} className="h-7 w-7 text-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm" title={model}>
                {modelLabel(model)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {mode === "demo"
                  ? model === "Auto"
                    ? "Simulated model routing"
                    : descriptions[model]
                  : model === "Auto"
                    ? descriptions.Auto
                    : PROVIDERS.find(
                        (provider) =>
                          provider.id === parseModelKey(model)?.provider,
                      )?.name}
              </p>
            </div>
            {value === model && <Check size={15} />}
          </DropdownMenuItem>
        ))}
        {mode === "live" && choices.length === 1 && (
          <p className="px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            Connect and test a provider in API Keys, then choose a default
            model.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

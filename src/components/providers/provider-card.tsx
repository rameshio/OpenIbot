"use client";

import { ArrowUpRight, Check, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Provider = {
  id: string;
  name: string;
  description: string;
  monogram: string;
  color: string;
  connected: boolean;
  models: string[];
  unavailable?: boolean;
  error?: string;
  source?: "session" | "environment";
};
export function ProviderCard({
  provider,
  onConnect,
  onManage,
}: {
  provider: Provider;
  onConnect: (id: string) => void;
  onManage: (id: string) => void;
}) {
  const status = provider.unavailable
    ? "Unavailable"
    : provider.connected
      ? "Connected"
      : provider.error
        ? "Connection error"
        : "Not connected";
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-[#242424] bg-[#111111] p-5 transition-colors duration-200 hover:border-[#363636] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] font-mono text-xl font-medium"
          style={{ color: provider.color }}
        >
          {provider.monogram}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${provider.connected ? "border-white/10 bg-white/[0.035] text-[#c8c8c8]" : provider.error ? "border-red-300/15 text-red-200" : "border-transparent text-[#777777]"}`}
        >
          {provider.connected ? (
            <Check className="size-3" />
          ) : (
            <span className="size-1.5 rounded-full bg-current opacity-60" />
          )}
          {status}
        </span>
      </div>
      <h3 className="mt-5 text-[15px] font-medium tracking-[-0.02em] text-[#f5f5f5]">
        {provider.name}
      </h3>
      <p className="mt-1.5 min-h-10 text-xs leading-5 text-[#8a8a8a]">
        {provider.description}
      </p>
      <div
        className="mt-4 flex min-h-6 flex-wrap gap-1.5"
        aria-label={`${provider.name} models`}
      >
        {provider.models.map((model) => (
          <span
            key={model}
            title={model}
            className="max-w-full truncate rounded-md border border-[#292929] px-2 py-1 text-[10px] leading-none text-[#a4a4a4]"
          >
            {model}
          </span>
        ))}
      </div>
      {provider.error && (
        <p className="mt-3 text-[11px] leading-5 text-red-200">
          {provider.error}
        </p>
      )}
      <div className="mt-auto pt-6">
        <div className="flex items-center justify-between gap-3 border-t border-[#242424] pt-4">
          <div className="flex min-w-0 items-center gap-2 text-[#777777]">
            <KeyRound className="size-3.5 shrink-0" />
            <span className="truncate text-[10px]">
              {provider.connected
                ? `•••• •••• · ${provider.source === "environment" ? "Server environment" : "Session only"}`
                : provider.unavailable
                  ? "Coming later"
                  : "No tested connection"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={provider.unavailable}
            onClick={() =>
              provider.connected
                ? onManage(provider.id)
                : onConnect(provider.id)
            }
            aria-label={`${provider.unavailable ? "Unavailable" : provider.connected ? "Manage" : "Connect"} ${provider.name}`}
            className="h-8 shrink-0 gap-1.5 rounded-lg border-[#303030] bg-transparent px-3 text-xs font-normal text-[#dddddd] hover:border-[#484848] hover:bg-white/[0.05]"
          >
            {provider.unavailable
              ? "Unavailable"
              : provider.connected
                ? "Manage"
                : "Connect"}
            {!provider.unavailable &&
              (provider.connected ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <Plus className="size-3" />
              ))}
          </Button>
        </div>
      </div>
    </article>
  );
}

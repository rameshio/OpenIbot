"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Check,
  CircleHelp,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Network,
  PlugZap,
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
import {
  ProviderCard,
  type Provider,
} from "@/components/providers/provider-card";
import {
  connectionActions,
  useConnections,
} from "@/lib/state/connection-store";
import {
  PROVIDERS,
  isExactModelId,
  isProviderId,
  modelKey,
  modelLabel,
} from "@/lib/models";
import type { ModelId, ProviderId } from "@/types";

const presentation: Record<
  ProviderId,
  { description: string; monogram: string; color: string }
> = {
  gemini: {
    description: "Planning and writing with Google's text models.",
    monogram: "✦",
    color: "#a9bce1",
  },
  openai: {
    description: "Model-generated analysis, writing, and code.",
    monogram: "O",
    color: "#eeeeee",
  },
  anthropic: {
    description: "Writing and analysis with your Claude model.",
    monogram: "A",
    color: "#cfb6a4",
  },
  xai: {
    description: "Planning and review with your Grok model.",
    monogram: "𝕏",
    color: "#eeeeee",
  },
  cohere: {
    description: "Text generation with your Cohere model.",
    monogram: "C",
    color: "#b7c9ba",
  },
};
const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-[#303030] bg-[#181818] px-3 text-xs text-[#d4d4d4] outline-none transition-colors placeholder:text-[#646464] focus:border-[#858585]";
const safeError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The connection could not be completed. Try again.";

export function ConnectionsScreen({
  view,
  defaultModel,
  onDefaultModelChange,
}: {
  view: "models" | "api-keys";
  defaultModel: ModelId;
  onDefaultModelChange: (model: ModelId) => void;
}) {
  const state = useConnections();
  const [activeProviderId, setActiveProviderId] = useState<ProviderId | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const connected = state.connections.filter(
    (connection) => connection.status === "connected",
  );
  const models = connected.map(modelKey);
  const isModelsView = view === "models";
  const providers: Provider[] = PROVIDERS.map((provider) => {
    const connection = state.connections.find(
      (item) => item.provider === provider.id,
    );
    return {
      id: provider.id,
      name: provider.name,
      ...presentation[provider.id],
      connected: connection?.status === "connected",
      models: connection ? [connection.modelId] : [],
      error: connection?.error,
      source: connection?.source,
    };
  });
  providers.push(
    {
      id: "openrouter",
      name: "OpenRouter",
      description: "Multi-provider routing is planned for a later release.",
      monogram: "↗",
      color: "#bfb3d7",
      connected: false,
      models: [],
      unavailable: true,
    },
    {
      id: "local",
      name: "Local Model",
      description: "Connections to local inference servers are planned.",
      monogram: "L",
      color: "#b7c9ba",
      connected: false,
      models: [],
      unavailable: true,
    },
  );
  function openProvider(id: string) {
    if (!isProviderId(id)) return;
    dialogTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setActiveProviderId(id);
  }
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const enteredPassword = password;
    setPassword("");
    try {
      await connectionActions.unlock(enteredPassword);
    } catch (error) {
      setError(safeError(error));
    } finally {
      setBusy(false);
    }
  }
  async function lock() {
    setBusy(true);
    setError(null);
    try {
      await connectionActions.lock();
    } catch (error) {
      setError(safeError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-11 lg:px-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#777777]">
            {isModelsView ? (
              <Network className="size-3.5" />
            ) : (
              <KeyRound className="size-3.5" />
            )}
            {isModelsView ? "Model library" : "Connections"}
          </div>
          <h1 className="text-[27px] font-medium leading-tight tracking-[-0.045em] text-[#f5f5f5] sm:text-[32px]">
            {isModelsView ? "Your models" : "Provider connections"}
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#8a8a8a]">
            Connect your provider and choose the exact model your agents will
            use.
          </p>
        </div>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#292929] bg-[#111111] px-3 py-1.5 text-[10px] text-[#8a8a8a]">
          <LockKeyhole className="size-3" />
          Local workspace
        </span>
      </div>
      {!state.unlocked ? (
        <form
          onSubmit={unlock}
          className="mb-8 space-y-4 rounded-2xl border border-[#292929] bg-[#111111] p-5 sm:p-6"
        >
          <h2 className="text-sm text-[#ededed]">
            Unlock provider connections
          </h2>
          <p className="text-xs leading-5 text-[#8a8a8a]">
            Set <code>IBOT_LOCAL_PASSWORD</code> in <code>.env.local</code> to
            at least 16 characters, restart the server, then enter it here. This
            protects access to your local provider credentials.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Local workspace password</span>
              <input
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength={1024}
                className={fieldClass}
                placeholder="Local workspace password"
              />
            </label>
            <Button
              disabled={busy || !state.ready || !password}
              type="submit"
              className="bg-[#eeeeee] text-xs text-[#111111] hover:bg-white"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}Unlock
              workspace
            </Button>
          </div>
        </form>
      ) : (
        <section
          className="mb-8 flex flex-col gap-5 rounded-2xl border border-[#292929] bg-gradient-to-r from-[#171717] to-[#111111] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          aria-labelledby="default-model-title"
        >
          <div className="max-w-sm">
            <h2
              id="default-model-title"
              className="text-[13px] font-medium text-[#ededed]"
            >
              Default model for Auto
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#8a8a8a]">
              Auto uses your configured default model. It never switches to
              another provider. Only successfully tested models are available.
            </p>
          </div>
          <div className="min-w-0 space-y-3 sm:max-w-64">
            <label
              htmlFor="connections-default-model"
              className="block text-[10px] text-[#8a8a8a]"
            >
              Default model
            </label>
            <select
              id="connections-default-model"
              value={models.includes(defaultModel) ? defaultModel : ""}
              onChange={(event) => onDefaultModelChange(event.target.value)}
              className={fieldClass}
            >
              <option value="" disabled>
                Select a connected model
              </option>
              {connected.map((connection) => (
                <option key={modelKey(connection)} value={modelKey(connection)}>
                  {
                    PROVIDERS.find(
                      (provider) => provider.id === connection.provider,
                    )?.name
                  }{" "}
                  · {connection.modelId}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={lock}
              disabled={busy}
              className="text-[11px] text-[#a4a4a4] underline underline-offset-4 hover:text-white disabled:opacity-50"
            >
              Lock and disconnect all
            </button>
          </div>
        </section>
      )}
      {(error || state.error) && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-300/15 bg-red-300/5 px-4 py-3 text-xs leading-5 text-red-200"
        >
          {error || state.error}
        </p>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium text-[#b9b9b9]">
          {isModelsView ? "Available providers" : "Provider connections"}
        </h2>
        <span aria-live="polite" className="text-[11px] text-[#737373]">
          {connected.length} of {PROVIDERS.length} connected
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onConnect={openProvider}
            onManage={openProvider}
          />
        ))}
      </div>
      <div className="mt-6 flex items-start gap-2.5 text-[11px] leading-5 text-[#737373]">
        <CircleHelp className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Entered keys are held in server memory for this session and cleared on
          reload, disconnect, or lock. They are never saved in browser storage
          or task history. Environment keys stay on your server; reconnect and
          test them after reloading. Test connection makes a small billable
          model request.
        </p>
      </div>
      <Dialog
        open={activeProviderId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveProviderId(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            dialogTriggerRef.current?.focus();
          }}
          className="max-h-[90dvh] overflow-y-auto rounded-2xl border-[#292929] bg-[#111111] text-[#f5f5f5] sm:max-w-md"
        >
          {activeProviderId && (
            <ConnectionForm
              key={activeProviderId}
              provider={activeProviderId}
              onProviderChange={setActiveProviderId}
              onClose={() => setActiveProviderId(null)}
              defaultModel={defaultModel}
              onDefaultModelChange={onDefaultModelChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConnectionForm({
  provider,
  onProviderChange,
  onClose,
  defaultModel,
  onDefaultModelChange,
}: {
  provider: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  onClose: () => void;
  defaultModel: string;
  onDefaultModelChange: (model: string) => void;
}) {
  const state = useConnections();
  const spec = PROVIDERS.find((item) => item.id === provider)!;
  const connection = state.connections.find(
    (item) => item.provider === provider,
  );
  const environment = state.environment.find(
    (item) => item.provider === provider,
  );
  const [modelId, setModelId] = useState(
    connection?.modelId ?? environment?.modelId ?? "",
  );
  const [source, setSource] = useState<"session" | "environment">(
    connection?.source ?? (environment ? "environment" : "session"),
  );
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState(false);
  async function test(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTested(false);
    if (!isExactModelId(modelId.trim())) {
      setError(
        "Enter an exact text model ID from the provider's documentation.",
      );
      return;
    }
    if (source === "session" && !apiKey.trim()) {
      setError("Enter your API key to test this model.");
      return;
    }
    setBusy(true);
    const enteredKey = apiKey.trim();
    setApiKey("");
    setShowKey(false);
    try {
      await connectionActions.test(
        provider,
        modelId.trim(),
        source === "session" ? enteredKey : undefined,
      );
      setTested(true);
    } catch (error) {
      setError(safeError(error));
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setApiKey("");
    setShowKey(false);
    setBusy(true);
    setError(null);
    try {
      await connectionActions.disconnect(provider);
      onClose();
    } catch (error) {
      setError(safeError(error));
    } finally {
      setBusy(false);
    }
  }
  const testedModel =
    connection?.status === "connected" ? modelKey(connection) : null;
  return (
    <form onSubmit={test} className="space-y-5">
      <DialogHeader className="text-left">
        <DialogTitle className="text-lg font-medium tracking-tight">
          {connection?.status === "connected" ? "Manage" : "Connect"}{" "}
          {spec.name}
        </DialogTitle>
        <DialogDescription className="text-xs leading-5 text-[#8a8a8a]">
          Use your own provider account. Requests run on your local server.
        </DialogDescription>
      </DialogHeader>
      <label className="block space-y-2 text-xs text-[#9b9b9b]">
        Provider
        <select
          aria-label="Provider"
          className={fieldClass}
          disabled={busy}
          value={provider}
          onChange={(event) => {
            if (isProviderId(event.target.value))
              onProviderChange(event.target.value);
          }}
        >
          {PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-xs text-[#9b9b9b]">
        Exact model ID
        <input
          aria-label="Exact model ID"
          className={fieldClass}
          value={modelId}
          onChange={(event) => {
            setModelId(event.target.value);
            setTested(false);
          }}
          maxLength={160}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Paste the provider's exact model ID"
          disabled={busy}
        />
      </label>
      <a
        href={spec.docs}
        target="_blank"
        rel="noreferrer"
        className="block text-[11px] text-[#bdbdbd] underline underline-offset-4"
      >
        View official {spec.name} model IDs
      </a>
      {environment && (
        <label className="block space-y-2 text-xs text-[#9b9b9b]">
          Credential source
          <select
            aria-label="Credential source"
            className={fieldClass}
            value={source}
            disabled={busy}
            onChange={(event) => {
              setSource(event.target.value as "session" | "environment");
              setApiKey("");
              setShowKey(false);
              setTested(false);
            }}
          >
            <option value="session">Enter a session-only key</option>
            <option value="environment">Server environment</option>
          </select>
        </label>
      )}
      {source === "session" ? (
        <div>
          <label
            htmlFor="provider-api-key"
            className="mb-2 block text-xs text-[#9b9b9b]"
          >
            API key
          </label>
          <div className="relative">
            <input
              id="provider-api-key"
              className={`${fieldClass} pr-11`}
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={4096}
              placeholder={
                connection?.status === "connected"
                  ? "•••• •••• · enter key again to retest"
                  : "Enter your API key"
              }
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              aria-label={showKey ? "Hide API key" : "Show API key"}
              aria-pressed={showKey}
              onClick={() => setShowKey(!showKey)}
              className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-[#8a8a8a] hover:bg-white/5 hover:text-white"
            >
              {showKey ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-[#292929] bg-[#171717] p-3 text-xs leading-5 text-[#9b9b9b]">
          Uses <code>{spec.envKey}</code> on your server, configured for{" "}
          <span className="break-all text-[#dddddd]">
            {environment?.modelId}
          </span>
          . To change the environment model, update <code>{spec.envModel}</code>{" "}
          and restart.
        </p>
      )}
      <p className="text-[11px] leading-5 text-[#8a8a8a]">
        Keys entered here are session-only. Reloading, disconnecting, or locking
        clears them. Connection tests may incur a small provider charge.
        Changing models requires a new test.
      </p>
      {!state.unlocked && (
        <p role="alert" className="text-xs leading-5 text-red-200">
          Unlock the local workspace on the connections page first.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300/15 bg-red-300/5 p-3 text-xs leading-5 text-red-200"
        >
          {error}
        </p>
      )}
      {(tested || testedModel) && (
        <div className="space-y-2 rounded-lg border border-[#303a31] bg-[#172018] p-3 text-[11px] leading-5 text-[#b8c7b9]">
          <p className="flex items-center gap-2">
            <Check className="size-3 shrink-0" />
            Connected: {modelLabel(testedModel ?? "")}
          </p>
          {testedModel && defaultModel !== testedModel && (
            <button
              type="button"
              onClick={() => onDefaultModelChange(testedModel)}
              className="underline underline-offset-4"
            >
              Use this as my default model
            </button>
          )}
          {testedModel === defaultModel && <p>Default model for Auto</p>}
        </div>
      )}
      <DialogFooter className="flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-[#303030] bg-transparent text-xs hover:bg-white/5"
        >
          Close
        </Button>
        {connection && (
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            disabled={busy}
            className="border-[#463231] bg-[#241a1a] text-xs text-[#dbb5b2] hover:bg-[#332222]"
          >
            Disconnect
          </Button>
        )}
        <Button
          type="submit"
          disabled={busy || !state.unlocked}
          className="bg-[#eeeeee] text-xs text-[#111111] hover:bg-white"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <PlugZap className="size-3.5" />
          )}
          Test connection
        </Button>
      </DialogFooter>
    </form>
  );
}

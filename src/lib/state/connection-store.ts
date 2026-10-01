"use client";
import { useSyncExternalStore } from "react";
import { isProviderId, isExactModelId } from "../models";
import type { ProviderConnection, ProviderId } from "../../types";

type ConnectionState = {
  ready: boolean;
  unlocked: boolean;
  connections: ProviderConnection[];
  environment: { provider: ProviderId; modelId: string }[];
  error?: string;
};
const INITIAL: ConnectionState = {
  ready: false,
  unlocked: false,
  connections: [],
  environment: [],
};
let state = INITIAL;
let initialization: Promise<void> | undefined;
const listeners = new Set<() => void>();
function publish(next: ConnectionState) {
  state = next;
  listeners.forEach((listener) => listener());
}
function metadata(raw: Record<string, unknown>) {
  const connections = Array.isArray(raw.connections)
    ? raw.connections
        .filter(
          (entry): entry is ProviderConnection =>
            !!entry &&
            isProviderId(entry.provider) &&
            isExactModelId(entry.modelId) &&
            ["connected", "error"].includes(entry.status) &&
            ["session", "environment"].includes(entry.source),
        )
        .map((entry) => ({
          provider: entry.provider,
          modelId: entry.modelId,
          status: entry.status,
          source: entry.source,
          ...(typeof entry.error === "string" ? { error: entry.error } : {}),
        }))
    : [];
  const environment = Array.isArray(raw.environment)
    ? raw.environment
        .filter(
          (entry) =>
            !!entry &&
            isProviderId(entry.provider) &&
            isExactModelId(entry.modelId),
        )
        .map((entry) => ({
          provider: entry.provider as ProviderId,
          modelId: entry.modelId as string,
        }))
    : [];
  publish({
    ready: true,
    unlocked: raw.unlocked === true,
    connections,
    environment,
    ...(typeof raw.error === "string" ? { error: raw.error } : {}),
  });
}
export async function localApi(
  path: string,
  body?: unknown,
  method = "POST",
  signal?: AbortSignal,
) {
  return fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "x-ibot-request": "1",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
}
async function action(path: string, body?: unknown, method = "POST") {
  const response = await localApi(path, body, method);
  const raw = (await response.json()) as Record<string, unknown>;
  if ("unlocked" in raw) metadata(raw);
  if (!response.ok) {
    const message =
      typeof raw.error === "string"
        ? raw.error
        : "The connection request failed. Try again.";
    if (response.status === 401 && raw.unlocked !== true)
      publish({ ...INITIAL, ready: true, error: message });
    else publish({ ...state, ready: true, error: message });
    throw new Error(message);
  }
  return raw;
}
/** Runs once per document, including React strict-mode remounts. No credentials are persisted. */
export function initializeConnections() {
  initialization ??= (async () => {
    try {
      const response = await localApi("/api/session", undefined, "GET");
      const raw = (await response.json()) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(
          typeof raw.error === "string"
            ? raw.error
            : "Cannot reach the local workspace.",
        );
      // A full reload invalidates session keys and aborts any previous execution.
      if (raw.unlocked) await action("/api/session", { action: "refresh" });
      else metadata(raw);
    } catch (error) {
      publish({
        ...INITIAL,
        ready: true,
        error:
          error instanceof Error
            ? error.message
            : "Cannot reach the local server.",
      });
    }
  })();
  return initialization;
}
export const connectionActions = {
  async unlock(password: string) {
    await initializeConnections();
    await action("/api/session", { action: "unlock", password });
  },
  async test(provider: ProviderId, modelId: string, apiKey?: string) {
    await initializeConnections();
    await action("/api/connections", {
      action: "test",
      provider,
      modelId,
      ...(apiKey ? { apiKey } : {}),
    });
  },
  async disconnect(provider: ProviderId) {
    await action("/api/connections", { action: "disconnect", provider });
  },
  async lock() {
    await action("/api/session", { action: "lock" });
  },
};
export function getConnections() {
  return state;
}
export function useConnections() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => state,
    () => INITIAL,
  );
}

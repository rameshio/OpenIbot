import type { ModelRef, ProviderId } from "../types";
export const PROVIDERS: {
  id: ProviderId;
  name: string;
  envKey: string;
  envModel: string;
  docs: string;
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    envModel: "GEMINI_MODEL",
    docs: "https://ai.google.dev/gemini-api/docs/models",
  },
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    envModel: "OPENAI_MODEL",
    docs: "https://developers.openai.com/api/docs/models",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    envModel: "ANTHROPIC_MODEL",
    docs: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  {
    id: "xai",
    name: "xAI",
    envKey: "XAI_API_KEY",
    envModel: "XAI_MODEL",
    docs: "https://docs.x.ai/docs/models",
  },
  {
    id: "cohere",
    name: "Cohere",
    envKey: "COHERE_API_KEY",
    envModel: "COHERE_MODEL",
    docs: "https://docs.cohere.com/docs/models",
  },
];
export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((provider) => provider.id === value);
}
export function isExactModelId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(value)
  );
}
export function modelKey(ref: ModelRef) {
  return `${ref.provider}:${ref.modelId}`;
}
export function parseModelKey(key: string): ModelRef | null {
  const split = key.indexOf(":");
  const provider = key.slice(0, split);
  const modelId = key.slice(split + 1);
  return split > 0 && isProviderId(provider) && isExactModelId(modelId)
    ? { provider, modelId }
    : null;
}
export function modelLabel(key: string) {
  const ref = parseModelKey(key);
  return ref ? ref.modelId : key;
}

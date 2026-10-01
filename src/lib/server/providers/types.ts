import type { ProviderId, Usage } from "../../../types";
export interface GenerateInput {
  provider: ProviderId;
  modelId: string;
  apiKey: string;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  signal: AbortSignal;
  onText?: (text: string) => void;
  json?: boolean;
}
export interface GenerateResult {
  text: string;
  usage: Usage | null;
  finishReason: string;
}
export interface ProviderAdapter {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
export type Fetcher = typeof fetch;

import type { Usage } from "../../../types";

export type ProviderErrorCode =
  | "invalid_key"
  | "model_unavailable"
  | "rate_limit"
  | "timeout"
  | "cancelled"
  | "network"
  | "provider_failure"
  | "output_limit"
  | "refusal"
  | "incomplete_response";

const messages: Record<ProviderErrorCode, string> = {
  invalid_key:
    "The provider rejected the API credential or its permissions. Check the connection.",
  model_unavailable:
    "The requested model is unavailable for this provider or account. Check the exact model ID.",
  rate_limit:
    "The provider rate limit or account quota was reached. Try again after checking your account.",
  timeout: "The provider request timed out. You can start another attempt.",
  cancelled: "The provider request was cancelled.",
  network:
    "The provider could not be reached. Check the connection and try again.",
  provider_failure:
    "The provider could not complete this request. Check the selected model and try again.",
  output_limit:
    "The response reached an output limit before it could finish. Narrow the task and try again.",
  refusal:
    "The provider declined this request. Review the task before trying again.",
  incomplete_response:
    "The provider stream ended without a complete response. You can start another attempt.",
};

/** Only fixed messages cross the API boundary. Never attach provider bodies or causes. */
export class ProviderError extends Error {
  /** Safe provider-reported accounting, when received before a failure. */
  usage?: Usage | null;
  readonly code: ProviderErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  constructor(code: ProviderErrorCode, status?: number) {
    super(messages[code]);
    this.name = "ProviderError";
    this.code = code;
    this.status = status;
    this.retryable = [
      "network",
      "rate_limit",
      "timeout",
      "provider_failure",
      "incomplete_response",
    ].includes(code);
  }
}

export function cancellationError(signal: AbortSignal): ProviderError {
  const reason: unknown = signal.reason;
  return new ProviderError(
    reason &&
      typeof reason === "object" &&
      "name" in reason &&
      reason.name === "TimeoutError"
      ? "timeout"
      : "cancelled",
  );
}

export function providerResponseError(
  status?: number,
  machineCode?: string,
): ProviderError {
  if (
    [401, 403, 498].includes(status ?? 0) ||
    [
      "invalid_api_key",
      "authentication_error",
      "API_KEY_INVALID",
      "API_KEY_EXPIRED",
      "UNAUTHENTICATED",
      "PERMISSION_DENIED",
    ].includes(machineCode ?? "")
  )
    return new ProviderError("invalid_key", status);
  if (
    status === 404 ||
    [
      "model_not_found",
      "model_not_available",
      "not_found_error",
      "NOT_FOUND",
    ].includes(machineCode ?? "")
  )
    return new ProviderError("model_unavailable", status);
  if (
    status === 429 ||
    [
      "rate_limit_error",
      "rate_limit_exceeded",
      "insufficient_quota",
      "RESOURCE_EXHAUSTED",
    ].includes(machineCode ?? "")
  )
    return new ProviderError("rate_limit", status);
  if ([408, 504].includes(status ?? 0) || machineCode === "DEADLINE_EXCEEDED")
    return new ProviderError("timeout", status);
  return new ProviderError("provider_failure", status);
}

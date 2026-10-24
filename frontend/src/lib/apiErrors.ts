import { ApiError } from "../api/client";
import type { TranslationKey } from "../i18n/en";

/**
 * Map a thrown error to a banner message key.
 *
 * The server's own prose is never shown: it is English-only, written for
 * developers, and occasionally leaks implementation detail. Every case the
 * user can actually see has a translated string of its own.
 */
export function apiErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return "error.unknown";

  switch (error.kind) {
    case "offline":
      return "error.offline";
    case "timeout":
      return "error.timeout";
    case "network":
      return "error.network";
    case "server":
      return "error.server";
    case "rate_limited":
      return "error.rateLimited";
    case "conflict":
      return "error.emailTaken";
    case "validation":
      return "error.validation";
    case "unauthorized":
      return "error.invalidCredentials";
    default:
      return "error.unknown";
  }
}

/** True when a Retry button should be offered alongside the message. */
export function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && error.isRetryable;
}

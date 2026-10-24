/**
 * Fetch wrapper for the LegalDocReader API.
 *
 * Every failure — HTTP, network, offline or timeout — leaves this module as an
 * `ApiError` with a `kind` the UI can translate. No raw server prose is ever
 * surfaced: `message` is kept for logs and as a last-resort fallback only.
 *
 * The backend wraps errors in `{ "error": { code, message, details } }`. Raw
 * FastAPI `{ "detail": [...] }` is also parsed, so the client keeps working if
 * a route is ever added without the custom handler.
 */

import type { ValidationCode } from "../lib/validation";

/**
 * Where the API lives.
 *
 * Defaults to a **relative** path, i.e. the same origin the page was served
 * from. In development, Vite proxies `/api` to the backend (see
 * `vite.config.ts`); in production, a reverse proxy does the same. Same-origin
 * is what makes port forwarding work without hard-coding a tunnel URL, and it
 * takes CORS out of the picture entirely.
 *
 * Set `VITE_API_BASE_URL` in `.env.local` only to point at a *different* host.
 * An empty or whitespace value falls back to the default rather than producing
 * requests to `undefined/...`.
 */
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const API_BASE_URL: string =
  configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : "/api/v1";

/** Requests that outlive this are treated as a timeout, not a hang. */
export const REQUEST_TIMEOUT_MS = 15_000;

export type ApiErrorKind =
  | "offline"
  | "timeout"
  | "network"
  | "server"
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "unknown";

/** Form field names as the UI knows them (not the API's snake_case). */
export type FieldErrors = Partial<Record<string, ValidationCode>>;

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** Per-field codes from a 422, keyed by the UI's field names. */
  readonly fieldErrors?: FieldErrors;
  /** Backend error code (`invalid_credentials`, …). Diagnostic only. */
  readonly code?: string;

  constructor(init: {
    status: number;
    kind: ApiErrorKind;
    message?: string;
    fieldErrors?: FieldErrors;
    code?: string;
  }) {
    super(init.message ?? init.kind);
    this.name = "ApiError";
    this.status = init.status;
    this.kind = init.kind;
    this.fieldErrors = init.fieldErrors;
    this.code = init.code;
  }

  /** True for the cases a Retry button can plausibly fix. */
  get isRetryable(): boolean {
    return (
      this.kind === "offline" ||
      this.kind === "timeout" ||
      this.kind === "network" ||
      this.kind === "server"
    );
  }
}

// ------------------------------------------------------------------- token

/** The in-memory token. `sessionStorage` only mirrors it so a reload survives. */
let accessToken: string | null = null;

/** Called when a request that *carried* a token comes back 401. */
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// -------------------------------------------------------- error translation

const SNAKE_TO_FIELD: Record<string, string> = {
  full_name: "fullName",
  email: "email",
  password: "password",
};

/**
 * Map one server validation failure onto a `ValidationCode`.
 *
 * Returns null for fields the forms do not own, so the caller can fall back to
 * a generic banner rather than attaching an error to nothing.
 */
export function toValidationCode(field: string, type: string): ValidationCode | null {
  const kind = (type || "").toLowerCase();
  const missing = kind.includes("missing") || kind.includes("required");
  const tooShort = kind.includes("too_short");
  const tooLong = kind.includes("too_long");

  switch (field) {
    case "fullName":
      if (missing) return "name_required";
      if (tooShort) return "name_too_short";
      if (tooLong) return "name_too_long";
      return "name_invalid_chars";
    case "email":
      if (missing) return "email_required";
      if (tooLong) return "email_too_long";
      return "email_invalid";
    case "password":
      if (missing) return "password_required";
      if (tooLong) return "password_too_long";
      return "password_too_short";
    default:
      return null;
  }
}

interface EnvelopeDetail {
  field?: string;
  type?: string;
  loc?: unknown[];
}

/** Read both the custom envelope's `details` and FastAPI's raw `detail`. */
function extractFieldErrors(body: unknown): FieldErrors | undefined {
  if (body === null || typeof body !== "object") return undefined;

  const record = body as Record<string, unknown>;
  const envelope = record.error as Record<string, unknown> | undefined;
  const rawList = (envelope?.details ?? record.detail) as unknown;
  if (!Array.isArray(rawList)) return undefined;

  const result: FieldErrors = {};
  for (const entry of rawList as EnvelopeDetail[]) {
    if (entry === null || typeof entry !== "object") continue;

    // Custom envelope gives `field`; FastAPI gives `loc: ["body", "email"]`.
    const rawField =
      typeof entry.field === "string" && entry.field.length > 0
        ? entry.field
        : Array.isArray(entry.loc) && entry.loc.length > 0
          ? String(entry.loc[entry.loc.length - 1])
          : "";
    if (!rawField) continue;

    const field = SNAKE_TO_FIELD[rawField] ?? rawField;
    const code = toValidationCode(field, typeof entry.type === "string" ? entry.type : "");
    // First error per field wins; later ones are usually less specific.
    if (code && !(field in result)) result[field] = code;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  return "unknown";
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined; // Non-JSON body (proxy error page, empty response).
  }

  const envelope =
    body !== null && typeof body === "object"
      ? ((body as Record<string, unknown>).error as Record<string, unknown> | undefined)
      : undefined;

  return new ApiError({
    status: response.status,
    kind: kindForStatus(response.status),
    message: typeof envelope?.message === "string" ? envelope.message : response.statusText,
    code: typeof envelope?.code === "string" ? envelope.code : undefined,
    fieldErrors: response.status === 422 ? extractFieldErrors(body) : undefined,
  });
}

// ----------------------------------------------------------------- request

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Send the bearer token with this request. */
  auth?: boolean;
  /** Caller-owned cancellation, combined with the internal timeout. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = false,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const sentWithToken = auth && accessToken !== null;
  if (sentWithToken) headers.Authorization = `Bearer ${accessToken}`;

  // One controller for both the timeout and the caller's signal, so whichever
  // fires first aborts the fetch and we can tell the two apart afterwards.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError({ status: 0, kind: "timeout", message: "Request timed out." });
    }
    // A caller-driven abort (component unmounted) is not an error to report.
    if (signal?.aborted) throw error;

    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    throw new ApiError({
      status: 0,
      kind: offline ? "offline" : "network",
      message: "Could not reach the server.",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (response.status === 401 && sentWithToken) {
    // The token is gone, expired or revoked. Drop it before anything else runs.
    // Login's own 401 never lands here, because login sends no token.
    onUnauthorized?.();
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export { API_BASE_URL };

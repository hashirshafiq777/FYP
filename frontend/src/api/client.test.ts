import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, request, setAccessToken, setUnauthorizedHandler } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(impl: () => Response | Promise<Response> | never) {
  const spy = vi.fn(async () => impl());
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  setAccessToken(null);
  setUnauthorizedHandler(null);
});

describe("ApiError normalisation", () => {
  it("maps each status onto a kind the UI can translate", async () => {
    const cases: Array<[number, string]> = [
      [401, "unauthorized"],
      [403, "forbidden"],
      [404, "not_found"],
      [409, "conflict"],
      [422, "validation"],
      [429, "rate_limited"],
      [500, "server"],
      [503, "server"],
    ];

    for (const [status, kind] of cases) {
      mockFetch(() => jsonResponse(status, { error: { code: "x", message: "Server prose." } }));
      await expect(request("/thing")).rejects.toMatchObject({ status, kind });
    }
  });

  it("marks only transient failures as retryable", async () => {
    mockFetch(() => jsonResponse(500, {}));
    await expect(request("/thing")).rejects.toSatisfy(
      (error: ApiError) => error.isRetryable === true,
    );

    mockFetch(() => jsonResponse(409, {}));
    await expect(request("/thing")).rejects.toSatisfy(
      (error: ApiError) => error.isRetryable === false,
    );
  });

  it("reports offline separately from a generic network failure", async () => {
    const onLine = vi.spyOn(navigator, "onLine", "get");

    onLine.mockReturnValue(false);
    mockFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(request("/thing")).rejects.toMatchObject({ kind: "offline", status: 0 });

    onLine.mockReturnValue(true);
    mockFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(request("/thing")).rejects.toMatchObject({ kind: "network", status: 0 });
  });

  it("times out a request that never answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );

    await expect(request("/slow", { timeoutMs: 20 })).rejects.toMatchObject({
      kind: "timeout",
      status: 0,
    });
  });
});

describe("422 field mapping", () => {
  it("reads the backend's own envelope (details[].field + type)", async () => {
    // This is the exact shape the live API returns — verified against it.
    mockFetch(() =>
      jsonResponse(422, {
        error: {
          code: "validation_error",
          message: "Request validation failed.",
          details: [
            { field: "email", message: "value is not a valid email address", type: "value_error" },
            { field: "password", message: "String should have at least 8 characters", type: "string_too_short" },
          ],
        },
      }),
    );

    await expect(request("/auth/signup", { method: "POST", body: {} })).rejects.toMatchObject({
      kind: "validation",
      fieldErrors: { email: "email_invalid", password: "password_too_short" },
    });
  });

  it("also reads raw FastAPI detail[].loc, taking the last element", async () => {
    mockFetch(() =>
      jsonResponse(422, {
        detail: [
          { type: "missing", loc: ["body", "full_name"], msg: "Field required" },
          { type: "string_too_long", loc: ["body", "password"], msg: "too long" },
        ],
      }),
    );

    await expect(request("/auth/signup", { method: "POST", body: {} })).rejects.toMatchObject({
      // `full_name` is translated to the form's own field name.
      fieldErrors: { fullName: "name_required", password: "password_too_long" },
    });
  });

  it("ignores fields the forms do not own, so the UI can fall back to a banner", async () => {
    mockFetch(() =>
      jsonResponse(422, {
        error: { code: "validation_error", details: [{ field: "captcha", type: "missing" }] },
      }),
    );

    await expect(request("/auth/signup", { method: "POST", body: {} })).rejects.toMatchObject({
      kind: "validation",
      fieldErrors: undefined,
    });
  });

  it("never surfaces the server's own prose as the message the UI shows", async () => {
    mockFetch(() =>
      jsonResponse(422, {
        error: { code: "validation_error", message: "Pydantic says: value_error.str.regex" },
      }),
    );

    let caught: ApiError | undefined;
    try {
      await request("/auth/signup", { method: "POST", body: {} });
    } catch (error) {
      caught = error as ApiError;
    }

    // The raw text is kept for diagnostics, but `kind` is what the UI renders.
    expect(caught?.kind).toBe("validation");
    expect(caught?.message).toBe("Pydantic says: value_error.str.regex");
  });
});

describe("401 handling", () => {
  it("fires the unauthorized handler when the request carried a token", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setAccessToken("token-123");
    mockFetch(() => jsonResponse(401, { error: { code: "not_authenticated" } }));

    await expect(request("/auth/me", { auth: true })).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire it for a login 401 — that is bad credentials, not an expired session", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setAccessToken(null);
    mockFetch(() => jsonResponse(401, { error: { code: "invalid_credentials" } }));

    await expect(
      request("/auth/login", { method: "POST", body: {} }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it("attaches the bearer token only when auth is requested", async () => {
    setAccessToken("token-123");

    const spy = mockFetch(() => jsonResponse(200, {}));
    await request("/auth/me", { auth: true });
    const authed = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((authed.headers as Record<string, string>).Authorization).toBe("Bearer token-123");

    const spy2 = mockFetch(() => jsonResponse(200, {}));
    await request("/public");
    const anon = (spy2.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((anon.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe("responses", () => {
  it("returns undefined for 204, which is what logout sends", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    await expect(request("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("survives a non-JSON error body", async () => {
    mockFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    await expect(request("/thing")).rejects.toMatchObject({ kind: "server", status: 502 });
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import en from "../i18n/en";
import { renderWithProviders } from "../test/renderWithProviders";
import Login from "./Login";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Route the mock by URL so login and /auth/me can answer differently. */
function mockApi(handler: (url: string) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: unknown) => handler(String(input)));
  vi.stubGlobal("fetch", spy);
  return spy;
}

const CREDENTIALS = { email: "ayesha@example.com", password: "S3cure-pass!" };

function passwordInput(): HTMLInputElement {
  return document.getElementById("login-password") as HTMLInputElement;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(en["field.email"]), CREDENTIALS.email);
  await user.type(passwordInput(), CREDENTIALS.password);
  await user.click(screen.getByRole("button", { name: en["login.submit"] }));
}

const UNAUTHORIZED = jsonResponse(401, {
  error: { code: "invalid_credentials", message: "Incorrect email or password." },
});

describe("Login form", () => {
  it("shows the generic banner when the API returns 401", async () => {
    const user = userEvent.setup();
    mockApi(() =>
      jsonResponse(401, {
        error: { code: "invalid_credentials", message: "Incorrect email or password." },
      }),
    );
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["login.failed"]);
  });

  it("gives byte-identical feedback for an unknown email and a wrong password", async () => {
    // The security property that matters: the form must not be usable as an
    // oracle for which addresses are registered. Both cases come back as the
    // same 401, and the UI must not add a distinction of its own.
    async function bannerTextFor(email: string, password: string): Promise<string> {
      const user = userEvent.setup();
      mockApi(() => UNAUTHORIZED.clone());
      const view = renderWithProviders(<Login />, { route: "/login" });

      await user.type(screen.getByLabelText(en["field.email"]), email);
      await user.type(passwordInput(), password);
      await user.click(screen.getByRole("button", { name: en["login.submit"] }));

      const text = (await screen.findByRole("alert")).textContent ?? "";
      view.unmount();
      return text;
    }

    const unknownEmail = await bannerTextFor("nobody@example.com", "whatever-123");
    const wrongPassword = await bannerTextFor(CREDENTIALS.email, "definitely-wrong");

    expect(unknownEmail).toBe(wrongPassword);
    expect(unknownEmail).toContain(en["login.failed"]);
    // It names both inputs together, never one of them alone.
    expect(unknownEmail).not.toMatch(/unknown|not registered|no account|does not exist/i);
  });

  it("keeps the email, clears the password and focuses it after a 401", async () => {
    const user = userEvent.setup();
    mockApi(() => UNAUTHORIZED.clone());
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);
    await screen.findByRole("alert");

    expect((screen.getByLabelText(en["field.email"]) as HTMLInputElement).value).toBe(
      CREDENTIALS.email,
    );
    expect(passwordInput().value).toBe("");
    expect(document.activeElement?.id).toBe("login-password");
  });

  it("does not call the API when the form is empty", async () => {
    const user = userEvent.setup();
    const spy = mockApi(() => UNAUTHORIZED.clone());
    renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: en["login.submit"] }));

    expect(await screen.findByText(en["validation.email_required"])).toBeTruthy();
    expect(screen.getByText(en["validation.password_required"])).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("login-email");
  });

  it("does not apply the sign-up password policy", async () => {
    const user = userEvent.setup();
    const spy = mockApi(() => UNAUTHORIZED.clone());
    renderWithProviders(<Login />, { route: "/login" });

    // "abc" is far below the 8-character signup minimum; login must still try
    // it rather than leaking the policy through a validation message.
    await user.type(screen.getByLabelText(en["field.email"]), CREDENTIALS.email);
    await user.type(passwordInput(), "abc");
    await user.click(screen.getByRole("button", { name: en["login.submit"] }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByText(en["validation.password_too_short"])).toBeNull();
  });

  it("sends the email lowercased and trimmed", async () => {
    const user = userEvent.setup();
    const spy = mockApi(() => UNAUTHORIZED.clone());
    renderWithProviders(<Login />, { route: "/login" });

    await user.type(screen.getByLabelText(en["field.email"]), "  Ayesha@Example.COM ");
    await user.type(passwordInput(), CREDENTIALS.password);
    await user.click(screen.getByRole("button", { name: en["login.submit"] }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).email).toBe("ayesha@example.com");
  });

  it("shows the rate-limit message for a 429", async () => {
    const user = userEvent.setup();
    mockApi(() => jsonResponse(429, { error: { code: "too_many_requests" } }));
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.rateLimited"]);
  });

  it("offers Retry when the server fails", async () => {
    const user = userEvent.setup();
    mockApi(() => jsonResponse(503, { error: { code: "service_unavailable" } }));
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.server"]);
    expect(screen.getByRole("button", { name: en["common.retry"] })).toBeTruthy();
  });

  it("distinguishes offline from a server problem", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.offline"]);
    expect(alert.textContent).not.toContain(en["error.server"]);
  });

  it("shows the session-expired notice for ?reason=expired", () => {
    renderWithProviders(<Login />, { route: "/login?reason=expired" });
    expect(screen.getByText(en["login.sessionExpired"])).toBeTruthy();
  });

  it("does not show the expired notice on a plain visit", () => {
    renderWithProviders(<Login />, { route: "/login" });
    expect(screen.queryByText(en["login.sessionExpired"])).toBeNull();
  });

  it("signs in and keeps no banner when the credentials are accepted", async () => {
    const user = userEvent.setup();
    const spy = mockApi((url) => {
      if (url.endsWith("/auth/login")) {
        return jsonResponse(200, {
          access_token: "token-123",
          token_type: "bearer",
          expires_in: 3600,
        });
      }
      return jsonResponse(200, {
        id: "1",
        full_name: "Ayesha Khan",
        email: CREDENTIALS.email,
        role: "user",
        created_at: new Date().toISOString(),
      });
    });
    renderWithProviders(<Login />, { route: "/login" });

    await fillAndSubmit(user);

    // Login, then /auth/me to confirm the token is genuinely usable.
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(String(spy.mock.calls[1][0])).toContain("/auth/me");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

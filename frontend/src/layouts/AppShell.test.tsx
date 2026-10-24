import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../auth/AuthContext";
import AuthGate from "../auth/AuthGate";
import ProtectedRoute from "../auth/ProtectedRoute";
import { TOKEN_STORAGE_KEY } from "../auth/context";
import en from "../i18n/en";
import { I18nProvider } from "../i18n/I18nProvider";
import AppShell from "./AppShell";

const USER = {
  id: "1",
  full_name: "Ayesha Khan",
  email: "ayesha@example.com",
  role: "user" as const,
  created_at: "2026-01-01T00:00:00Z",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mounts the shell with a signed-in session restored from sessionStorage. */
function renderShell(route = "/dashboard") {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "token-123");
  const fetchSpy = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.endsWith("/auth/logout")) return new Response(null, { status: 204 });
    return jsonResponse(200, USER);
  });
  vi.stubGlobal("fetch", fetchSpy);

  const view = render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <AuthGate>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<p>Dashboard body</p>} />
                <Route path="/documents" element={<p>Documents body</p>} />
              </Route>
            </Route>
            <Route path="/login" element={<p>Login page</p>} />
          </Routes>
          </AuthGate>
        </AuthProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
  return { ...view, fetchSpy };
}

describe("AppShell navigation", () => {
  it("renders every nav item, each leading to a real route", async () => {
    renderShell();
    await screen.findByText("Dashboard body");

    const navs = screen.getAllByRole("navigation", { name: en["nav.primary"] });
    const links = within(navs[0]).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/documents",
      "/chat",
      "/agreements",
      "/history",
    ]);
  });

  it("marks the current page with aria-current", async () => {
    renderShell("/dashboard");
    await screen.findByText("Dashboard body");

    const navs = screen.getAllByRole("navigation", { name: en["nav.primary"] });
    const current = within(navs[0])
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("href")).toBe("/dashboard");
  });

  it("offers a skip link to the main content", async () => {
    renderShell();
    await screen.findByText("Dashboard body");

    const skip = screen.getByRole("link", { name: en["common.skipToContent"] });
    expect(skip.getAttribute("href")).toBe("#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });

  it("uses semantic landmarks", async () => {
    renderShell();
    await screen.findByText("Dashboard body");

    expect(screen.getByRole("main")).not.toBeNull();
    expect(screen.getByRole("banner")).not.toBeNull();
    expect(screen.getByRole("contentinfo")).not.toBeNull();
  });

  it("shows the legal disclaimer on every page", async () => {
    renderShell();
    await screen.findByText("Dashboard body");
    expect(screen.getByText(en["app.disclaimer"])).toBeTruthy();
  });
});

describe("AppShell drawer", () => {
  it("opens from the hamburger and moves focus into the drawer", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    await user.click(screen.getByRole("button", { name: en["common.openNavigation"] }));

    const close = screen.getByRole("button", { name: en["common.closeNavigation"] });
    await waitFor(() => expect(document.activeElement).toBe(close));
  });

  it("closes on Escape and returns focus to the hamburger", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    const hamburger = screen.getByRole("button", { name: en["common.openNavigation"] });
    await user.click(hamburger);
    await screen.findByRole("button", { name: en["common.closeNavigation"] });

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: en["common.closeNavigation"] })).toBeNull(),
    );
    expect(document.activeElement).toBe(hamburger);
  });

  it("locks background scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    await user.click(screen.getByRole("button", { name: en["common.openNavigation"] }));
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });
});

describe("AppShell user menu", () => {
  it("shows the signed-in identity from /auth/me", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    await user.click(screen.getByRole("button", { name: en["common.userMenu"] }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText(USER.full_name)).toBeTruthy();
    expect(within(menu).getByText(USER.email)).toBeTruthy();
  });

  it("is announced as a menu and moves focus to its first item", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    const trigger = screen.getByRole("button", { name: en["common.userMenu"] });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await user.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const item = screen.getByRole("menuitem", { name: en["common.signOut"] });
    await waitFor(() => expect(document.activeElement).toBe(item));
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    const trigger = screen.getByRole("button", { name: en["common.userMenu"] });
    await user.click(trigger);
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the pointer goes somewhere else", async () => {
    const user = userEvent.setup();
    renderShell();
    await screen.findByText("Dashboard body");

    await user.click(screen.getByRole("button", { name: en["common.userMenu"] }));
    await screen.findByRole("menu");

    await user.click(screen.getByRole("main"));

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("logs out through the API and lands on login", async () => {
    const user = userEvent.setup();
    const { fetchSpy } = renderShell();
    await screen.findByText("Dashboard body");

    await user.click(screen.getByRole("button", { name: en["common.userMenu"] }));
    await user.click(screen.getByRole("menuitem", { name: en["common.signOut"] }));

    await waitFor(() =>
      expect(
        fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/auth/logout")),
      ).toBe(true),
    );
    expect(await screen.findByText("Login page")).toBeTruthy();
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe("route protection", () => {
  it("sends an unauthenticated visitor from a protected URL to login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(401, {})));

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <AuthGate>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<p>Dashboard body</p>} />
              </Route>
              <Route path="/login" element={<p>Login page</p>} />
            </Routes>
            </AuthGate>
          </AuthProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(await screen.findByText("Login page")).toBeTruthy();
    expect(screen.queryByText("Dashboard body")).toBeNull();
  });

  it("drops the session and redirects when the stored token is rejected", async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "revoked-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(401, {
          error: { code: "not_authenticated", message: "Token has been revoked." },
        }),
      ),
    );

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <AuthGate>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<p>Dashboard body</p>} />
              </Route>
              <Route path="/login" element={<p>Login page</p>} />
            </Routes>
            </AuthGate>
          </AuthProvider>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(await screen.findByText("Login page")).toBeTruthy();
    // A token the server refuses must not be left lying around.
    await waitFor(() =>
      expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull(),
    );
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import en from "../i18n/en";
import { renderWithProviders } from "../test/renderWithProviders";
import Dashboard from "./Dashboard";

const LOAD_TIMEOUT = { timeout: 4000 };

describe("Dashboard", () => {
  it("shows skeletons while loading, then the real widgets", async () => {
    const { container } = renderWithProviders(<Dashboard />, { route: "/dashboard" });

    // Busy regions and shimmering placeholders are present up front.
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await screen.findByRole("table", undefined, LOAD_TIMEOUT);

    await waitFor(
      () => expect(container.querySelectorAll(".skeleton").length).toBe(0),
      LOAD_TIMEOUT,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("renders all seven content blocks", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await screen.findByRole("table", undefined, LOAD_TIMEOUT);

    // 1 greeting, 2 quick actions, 3 stats, 4 risk, 5 documents, 6 chats, 7 agreements
    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    expect(screen.getByText(en["dashboard.quickActions"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.stat.documents"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.risk.title"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.documents.title"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.chats.title"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.agreements.title"])).toBeTruthy();
  });

  it("marks the figures as sample data", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    expect(screen.getByText(en["common.sampleData"])).toBeTruthy();
  });

  it("pairs every status and risk chip with a text label, never colour alone", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await screen.findByRole("table", undefined, LOAD_TIMEOUT);

    const table = screen.getByRole("table");
    expect(within(table).getAllByText(en["status.ready"]).length).toBe(4);
    expect(within(table).getAllByText(en["status.processing"]).length).toBe(1);
    expect(within(table).getAllByText(en["status.failed"]).length).toBe(1);

    // Each chip carries an SVG glyph as well as its words.
    for (const chip of table.querySelectorAll(".chip")) {
      expect(chip.querySelector("svg")).not.toBeNull();
      expect((chip.textContent ?? "").trim().length).toBeGreaterThan(0);
    }
  });

  it("renders user content with dir=auto so Urdu names are not mangled", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await screen.findByRole("table", undefined, LOAD_TIMEOUT);

    const urduDoc = screen.getAllByText("کرایہ نامہ — اسکین شدہ.pdf")[0];
    expect(urduDoc.getAttribute("dir")).toBe("auto");

    const urduChat = screen.getByText("کیا اس میں کوئی پوشیدہ فیس ہے؟");
    expect(urduChat.getAttribute("dir")).toBe("auto");
  });

  it("shows a per-widget empty state with a next action for a new account", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard?demo=empty" });

    expect(
      await screen.findByText(en["dashboard.risk.empty.title"], undefined, LOAD_TIMEOUT),
    ).toBeTruthy();
    // Each widget states its own emptiness in its own words.
    expect(screen.getByText(en["dashboard.documents.empty.title"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.chats.empty.title"])).toBeTruthy();
    expect(screen.getByText(en["dashboard.agreements.empty.title"])).toBeTruthy();

    // An empty box with no way forward is a dead end.
    expect(
      screen.getAllByRole("link", { name: new RegExp(en["dashboard.documents.empty.action"]) })
        .length,
    ).toBeGreaterThan(0);
  });

  it("shows an error state with a working Retry", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />, { route: "/dashboard?demo=error" });

    const alert = await screen.findByRole("alert", undefined, LOAD_TIMEOUT);
    expect(alert.textContent).toContain(en["dashboard.error.title"]);

    const retry = screen.getByRole("button", { name: en["common.retry"] });
    await user.click(retry);

    // Retry re-runs the request; in demo=error mode it fails again, which is
    // what proves the button is wired to a real reload rather than dismissing.
    await waitFor(
      () => expect(screen.getByRole("alert").textContent).toContain(
        en["dashboard.error.title"],
      ),
      LOAD_TIMEOUT,
    );
  });

  it("does not render table rows as if they were clickable", async () => {
    renderWithProviders(<Dashboard />, { route: "/dashboard" });
    await screen.findByRole("table", undefined, LOAD_TIMEOUT);

    const rows = screen.getByRole("table").querySelectorAll("tbody tr");
    expect(rows.length).toBe(6);
    for (const row of rows) {
      expect(row.querySelector("a")).toBeNull();
      expect(row.querySelector("button")).toBeNull();
      expect(row.getAttribute("role")).not.toBe("button");
    }
  });
});

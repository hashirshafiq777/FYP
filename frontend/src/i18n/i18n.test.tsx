import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import LanguageToggle from "../components/LanguageToggle";
import { renderWithProviders } from "../test/renderWithProviders";
import { LANGUAGE_STORAGE_KEY } from "./context";
import en from "./en";
import ur from "./ur";
import { useI18n } from "./useI18n";

/** Prints whatever the hook is asked for, so tests can read it from the DOM. */
function Probe() {
  const { t, language, direction, formatDate, formatNumber } = useI18n();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="direction">{direction}</span>
      <span data-testid="greeting">{t("dashboard.greeting", { name: "Ayesha" })}</span>
      <span data-testid="date">{formatDate("2026-03-14T10:00:00Z")}</span>
      <span data-testid="number">{formatNumber(1234)}</span>
    </div>
  );
}

describe("dictionaries", () => {
  it("define exactly the same keys in both languages", () => {
    // TypeScript already enforces this (`ur` is typed as `Dictionary`), but a
    // runtime check also catches a key deleted from `en` and left in `ur`.
    expect(Object.keys(ur).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no untranslated Urdu entry left as English", () => {
    const identical = (Object.keys(en) as Array<keyof typeof en>).filter(
      (key) => en[key] === ur[key] && en[key] !== "",
    );
    // Brand name, EN/UR badges, "404" and the Urdu label itself are the only
    // strings that are meant to be identical in both dictionaries.
    expect(identical.sort()).toEqual(
      [
        "app.name",
        "lang.en",
        "lang.ur",
        "language.english",
        "language.urdu",
        "notFound.code",
      ].sort(),
    );
  });

  it("keeps every placeholder that the English string uses", () => {
    const placeholders = (value: string) =>
      (value.match(/\{(\w+)\}/g) ?? []).sort().join(",");

    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(`${key}:${placeholders(ur[key])}`).toBe(`${key}:${placeholders(en[key])}`);
    }
  });
});

describe("I18nProvider", () => {
  it("starts in English and interpolates parameters", () => {
    renderWithProviders(<Probe />, { withAuth: false });
    expect(screen.getByTestId("language").textContent).toBe("en");
    expect(screen.getByTestId("direction").textContent).toBe("ltr");
    expect(screen.getByTestId("greeting").textContent).toBe("Welcome back, Ayesha");
  });

  it("restores the stored language on mount", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "ur");
    renderWithProviders(<Probe />, { withAuth: false });
    expect(screen.getByTestId("language").textContent).toBe("ur");
    expect(screen.getByTestId("direction").textContent).toBe("rtl");
  });

  it("uses Latin digits in Urdu, so numbers read the same in both languages", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "ur");
    renderWithProviders(<Probe />, { withAuth: false });

    expect(screen.getByTestId("number").textContent).toMatch(/^[\d,]+$/);
    expect(screen.getByTestId("date").textContent).toMatch(/\d/);
    // No Eastern Arabic-Indic digits anywhere.
    expect(screen.getByTestId("date").textContent).not.toMatch(/[٠-٩۰-۹]/);
  });
});

describe("LanguageToggle", () => {
  it("switches the document lang and dir, and persists the choice", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageToggle />
        <Probe />
      </>,
      { withAuth: false },
    );

    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");

    await user.click(screen.getByRole("button", { name: /اردو/ }));

    expect(document.documentElement.getAttribute("lang")).toBe("ur");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ur");
    expect(screen.getByTestId("greeting").textContent).toBe(
      ur["dashboard.greeting"].replace("{name}", "Ayesha"),
    );
  });

  it("marks the active language with aria-pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageToggle />, { withAuth: false });

    const english = screen.getByRole("button", { name: "English" });
    expect(english.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: /اردو/ }));

    expect(screen.getByRole("button", { name: /اردو/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(
      screen.getByRole("button", { name: /English/ }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("survives localStorage being unavailable", async () => {
    const user = userEvent.setup();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    try {
      renderWithProviders(
        <>
          <LanguageToggle />
          <Probe />
        </>,
        { withAuth: false },
      );
      await user.click(screen.getByRole("button", { name: /اردو/ }));
      // The preference will not persist, but the app must not break.
      expect(screen.getByTestId("language").textContent).toBe("ur");
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

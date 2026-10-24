import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import ur from "../i18n/ur";
import { renderWithProviders } from "../test/renderWithProviders";
import PasswordField from "./PasswordField";

/** PasswordField is controlled, so the test owns the value. */
function Harness({ label = "Password" }: { label?: string }) {
  const [value, setValue] = useState("");
  return (
    <PasswordField
      id="test-password"
      label={label}
      value={value}
      onChange={setValue}
      autoComplete="new-password"
    />
  );
}

function getInput(): HTMLInputElement {
  // `getByLabelText` would not find it once type="password" (no textbox role),
  // so go via the label's `for`.
  return document.getElementById("test-password") as HTMLInputElement;
}

describe("PasswordField", () => {
  it("renders a real visible label bound to the input", () => {
    renderWithProviders(<Harness />, { withAuth: false });
    const label = screen.getByText("Password");
    expect(label.tagName).toBe("LABEL");
    expect(label.getAttribute("for")).toBe("test-password");
  });

  it("masks the value by default", () => {
    renderWithProviders(<Harness />, { withAuth: false });
    expect(getInput().type).toBe("password");
  });

  it("switches the input type when the toggle is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />, { withAuth: false });

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(getInput().type).toBe("password");

    await user.click(toggle);
    expect(getInput().type).toBe("text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(getInput().type).toBe("password");
  });

  it("updates aria-pressed and the accessible name together", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />, { withAuth: false });

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    await user.click(toggle);

    const pressed = screen.getByRole("button", { name: "Hide password" });
    expect(pressed.getAttribute("aria-pressed")).toBe("true");
    // Same control, not a second button swapped in.
    expect(pressed).toBe(toggle);
  });

  it("is a type=button so it never submits the surrounding form", () => {
    renderWithProviders(<Harness />, { withAuth: false });
    expect(
      screen.getByRole("button", { name: "Show password" }).getAttribute("type"),
    ).toBe("button");
  });

  it("keeps the typed value when visibility is toggled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />, { withAuth: false });

    await user.type(getInput(), "S3cure-pass!");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(getInput().value).toBe("S3cure-pass!");
  });

  it("gives each field its own independent toggle", async () => {
    const user = userEvent.setup();
    function TwoFields() {
      const [a, setA] = useState("");
      const [b, setB] = useState("");
      return (
        <>
          <PasswordField
            id="pw-a"
            label="Password"
            value={a}
            onChange={setA}
            autoComplete="new-password"
          />
          <PasswordField
            id="pw-b"
            label="Confirm password"
            value={b}
            onChange={setB}
            autoComplete="new-password"
          />
        </>
      );
    }
    renderWithProviders(<TwoFields />, { withAuth: false });

    const toggles = screen.getAllByRole("button", { name: "Show password" });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]);

    // Revealing one must not reveal the other: the user is being asked to
    // compare them, and that check is only meaningful if it stays theirs.
    expect((document.getElementById("pw-a") as HTMLInputElement).type).toBe("text");
    expect((document.getElementById("pw-b") as HTMLInputElement).type).toBe("password");
  });

  it("uses the Urdu label when Urdu is the stored language", () => {
    window.localStorage.setItem("ldr.language", "ur");
    renderWithProviders(<Harness label={ur["field.password"]} />, { withAuth: false });

    // Asserted against the dictionary, not a hard-coded string, so the control
    // keeps an accessible name in both languages even if the copy is reworded.
    expect(
      screen.getByRole("button", { name: ur["field.showPassword"] }),
    ).toBeTruthy();
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import en from "../i18n/en";
import { renderWithProviders } from "../test/renderWithProviders";
import SignUp from "./SignUp";

function mockFetch(response: () => Response) {
  const spy = vi.fn(async () => response());
  vi.stubGlobal("fetch", spy);
  return spy;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VALID = {
  fullName: "Ayesha Khan",
  email: "ayesha@example.com",
  password: "S3cure-pass!",
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(en["field.fullName"]), VALID.fullName);
  await user.type(screen.getByLabelText(en["field.email"]), VALID.email);
  await user.type(
    document.getElementById("signup-password") as HTMLInputElement,
    VALID.password,
  );
  await user.type(
    document.getElementById("signup-confirm-password") as HTMLInputElement,
    VALID.password,
  );
}

function submit(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: en["signup.submit"] }));
}

describe("SignUp form", () => {
  it("shows an error for every empty field and never calls the API", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await submit(user);

    expect(await screen.findByText(en["validation.name_required"])).toBeTruthy();
    expect(screen.getByText(en["validation.email_required"])).toBeTruthy();
    expect(screen.getByText(en["validation.password_required"])).toBeTruthy();
    expect(screen.getByText(en["validation.confirm_required"])).toBeTruthy();

    // The whole point: an invalid form never reaches the network.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("moves focus to the first invalid field on submit", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await submit(user);

    expect(document.activeElement?.id).toBe("signup-full-name");
  });

  it("focuses the first invalid field when earlier fields are valid", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await user.type(screen.getByLabelText(en["field.fullName"]), VALID.fullName);
    await user.type(screen.getByLabelText(en["field.email"]), VALID.email);
    await submit(user);

    expect(document.activeElement?.id).toBe("signup-password");
  });

  it("marks an invalid field with aria-invalid and links its error message", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await submit(user);

    const nameInput = screen.getByLabelText(en["field.fullName"]);
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");

    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toContain("signup-full-name-error");
    expect(document.getElementById("signup-full-name-error")?.textContent).toContain(
      en["validation.name_required"],
    );
  });

  it("rejects a mismatched confirmation without calling the API", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await user.type(screen.getByLabelText(en["field.fullName"]), VALID.fullName);
    await user.type(screen.getByLabelText(en["field.email"]), VALID.email);
    await user.type(
      document.getElementById("signup-password") as HTMLInputElement,
      VALID.password,
    );
    await user.type(
      document.getElementById("signup-confirm-password") as HTMLInputElement,
      "something-else",
    );
    await submit(user);

    expect(await screen.findByText(en["validation.confirm_mismatch"])).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates on blur, not while the field is first being typed in", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    const email = screen.getByLabelText(en["field.email"]);
    await user.type(email, "nope");
    // Still focused and never blurred: no shouting yet.
    expect(screen.queryByText(en["validation.email_invalid"])).toBeNull();

    await user.tab();
    expect(await screen.findByText(en["validation.email_invalid"])).toBeTruthy();
  });

  it("re-checks the confirmation when the password is edited afterwards", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(201, {}));
    renderWithProviders(<SignUp />, { route: "/signup" });

    const password = document.getElementById("signup-password") as HTMLInputElement;
    const confirm = document.getElementById("signup-confirm-password") as HTMLInputElement;

    await user.type(password, "S3cure-pass!");
    await user.type(confirm, "S3cure-pass");
    await user.tab();
    expect(await screen.findByText(en["validation.confirm_mismatch"])).toBeTruthy();

    // Fixing it from the *password* end must clear the error too.
    await user.clear(password);
    await user.type(password, "S3cure-pass");

    await waitFor(() =>
      expect(screen.queryByText(en["validation.confirm_mismatch"])).toBeNull(),
    );
  });

  it("submits normalised values when the form is valid", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch(() =>
      jsonResponse(201, {
        id: "1",
        full_name: VALID.fullName,
        email: VALID.email,
        role: "user",
        created_at: new Date().toISOString(),
      }),
    );
    renderWithProviders(<SignUp />, { route: "/signup" });

    await user.type(screen.getByLabelText(en["field.fullName"]), "  Ayesha   Khan  ");
    await user.type(screen.getByLabelText(en["field.email"]), "  Ayesha@Example.COM ");
    await user.type(
      document.getElementById("signup-password") as HTMLInputElement,
      VALID.password,
    );
    await user.type(
      document.getElementById("signup-confirm-password") as HTMLInputElement,
      VALID.password,
    );
    await submit(user);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      full_name: "Ayesha Khan",
      email: "ayesha@example.com",
      password: VALID.password,
    });
  });

  it("shows the duplicate-email error on the field after a 409", async () => {
    const user = userEvent.setup();
    mockFetch(() =>
      jsonResponse(409, {
        error: {
          code: "email_already_registered",
          message: "An account with this email already exists.",
        },
      }),
    );
    renderWithProviders(<SignUp />, { route: "/signup" });

    await fillValidForm(user);
    await submit(user);

    expect(await screen.findByText(en["error.emailTaken"])).toBeTruthy();
    // …with a way out, rather than a dead end.
    expect(screen.getByRole("link", { name: en["signup.signInInstead"] })).toBeTruthy();
    expect(document.activeElement?.id).toBe("signup-email");
  });

  it("maps a 422 onto the field it belongs to, never showing the raw message", async () => {
    const user = userEvent.setup();
    mockFetch(() =>
      jsonResponse(422, {
        error: {
          code: "validation_error",
          message: "Request validation failed.",
          details: [
            {
              field: "email",
              message: "value is not a valid email address: An email address must have an @-sign.",
              type: "value_error",
            },
          ],
        },
      }),
    );
    renderWithProviders(<SignUp />, { route: "/signup" });

    await fillValidForm(user);
    await submit(user);

    expect(await screen.findByText(en["validation.email_invalid"])).toBeTruthy();
    expect(screen.queryByText(/@-sign/)).toBeNull();
  });

  it("falls back to a banner when a 422 names a field the form does not own", async () => {
    const user = userEvent.setup();
    mockFetch(() =>
      jsonResponse(422, {
        error: {
          code: "validation_error",
          message: "Request validation failed.",
          details: [{ field: "captcha", message: "Missing", type: "missing" }],
        },
      }),
    );
    renderWithProviders(<SignUp />, { route: "/signup" });

    await fillValidForm(user);
    await submit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.validation"]);
  });

  it("shows a server-problem banner for a 500", async () => {
    const user = userEvent.setup();
    mockFetch(() => jsonResponse(500, { error: { code: "internal_error" } }));
    renderWithProviders(<SignUp />, { route: "/signup" });

    await fillValidForm(user);
    await submit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["error.server"]);
  });
});

import { describe, expect, it } from "vitest";

import {
  NAME_MAX,
  PASSWORD_MAX,
  assessPasswordStrength,
  normalizeEmail,
  normalizeFullName,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validateLogin,
  validatePassword,
  validateSignUp,
  type ConfirmErrorCode,
  type EmailErrorCode,
  type NameErrorCode,
  type PasswordErrorCode,
} from "./validation";

describe("normalizeFullName", () => {
  it.each([
    ["  Ayesha Khan  ", "Ayesha Khan"],
    ["Ayesha    Khan", "Ayesha Khan"],
    ["Ayesha\tKhan\nSiddiqui", "Ayesha Khan Siddiqui"],
    ["   ", ""],
  ])("normalises %j to %j", (input, expected) => {
    expect(normalizeFullName(input)).toBe(expected);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ayesha@Example.COM ")).toBe("ayesha@example.com");
  });
});

describe("validateFullName", () => {
  const cases: Array<[string, string, NameErrorCode | null]> = [
    ["empty", "", "name_required"],
    ["whitespace only", "     ", "name_required"],
    ["1 character (below minimum)", "A", "name_too_short"],
    ["2 characters (at minimum)", "Jo", null],
    ["100 characters (at maximum)", "a".repeat(NAME_MAX), null],
    ["101 characters (above maximum)", "a".repeat(NAME_MAX + 1), "name_too_long"],
    ["collapses to valid length", "  Jo   ", null],
    ["ordinary name", "Ayesha Khan", null],
    ["hyphenated", "Anne-Marie O'Neill", null],
    ["with a period", "J. R. Smith", null],
    ["typographic apostrophe", "O’Brien", null],
    ["accented Latin", "José Álvarez", null],
    ["Urdu name", "عائشہ خان", null],
    ["Arabic name", "محمد بن راشد", null],
    ["Urdu single word of 2 letters", "لی", null],
    ["digits rejected", "Agent 007", "name_invalid_chars"],
    ["email rejected", "a@b.com", "name_invalid_chars"],
    ["slash rejected", "Ayesha/Khan", "name_invalid_chars"],
    ["punctuation only", "..", "name_needs_letters"],
    ["single letter plus punctuation", "A.", "name_needs_letters"],
  ];

  it.each(cases)("%s", (_label, input, expected) => {
    expect(validateFullName(input)).toBe(expected);
  });
});

describe("validateEmail", () => {
  const cases: Array<[string, string, EmailErrorCode | null]> = [
    ["empty", "", "email_required"],
    ["whitespace only", "   ", "email_required"],
    ["plain", "ayesha@example.com", null],
    ["uppercase", "Ayesha@Example.COM", null],
    ["plus addressing", "ayesha+contracts@example.com", null],
    ["subdomain", "a@mail.example.co.uk", null],
    ["surrounding spaces are trimmed", "  a@example.com  ", null],
    ["no @", "ayesha.example.com", "email_invalid"],
    ["two @", "a@b@example.com", "email_invalid"],
    ["no domain dot", "ayesha@example", "email_invalid"],
    ["empty local part", "@example.com", "email_invalid"],
    ["empty domain", "ayesha@", "email_invalid"],
    ["internal space", "ay esha@example.com", "email_invalid"],
    ["trailing dot", "a@example.", "email_invalid"],
    ["double dot in domain", "a@ex..com", "email_invalid"],
    ["one-character TLD", "a@example.c", "email_invalid"],
    ["255 characters", `${"a".repeat(243)}@example.com`, "email_too_long"],
  ];

  it.each(cases)("%s", (_label, input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });

  it("accepts an address of exactly 254 characters", () => {
    const address = `${"a".repeat(242)}@example.com`;
    expect(address).toHaveLength(254);
    expect(validateEmail(address)).toBeNull();
  });
});

describe("validatePassword", () => {
  const cases: Array<[string, string, PasswordErrorCode | null]> = [
    ["empty", "", "password_required"],
    ["whitespace only", "        ", "password_whitespace"],
    ["7 characters (below minimum)", "a".repeat(7), "password_too_short"],
    ["8 characters (at minimum)", "a".repeat(8), null],
    ["128 characters (at maximum)", "a".repeat(PASSWORD_MAX), null],
    ["129 characters (above maximum)", "a".repeat(PASSWORD_MAX + 1), "password_too_long"],
    ["mixed characters", "S3cure-pass!", null],
    ["leading and trailing spaces are kept, not trimmed", "  secret12  ", null],
    ["unicode password", "پاس-ورڈ-123", null],
  ];

  it.each(cases)("%s", (_label, input, expected) => {
    expect(validatePassword(input)).toBe(expected);
  });

  it("never alters the value it is given", () => {
    const padded = "  secret12  ";
    validatePassword(padded);
    expect(padded).toBe("  secret12  ");
  });
});

describe("validateConfirmPassword", () => {
  const cases: Array<[string, string, string, ConfirmErrorCode | null]> = [
    ["empty", "", "S3cure-pass!", "confirm_required"],
    ["matching", "S3cure-pass!", "S3cure-pass!", null],
    ["different", "S3cure-pass", "S3cure-pass!", "confirm_mismatch"],
    ["case differs", "s3cure-pass!", "S3cure-pass!", "confirm_mismatch"],
    ["whitespace differs", "S3cure-pass! ", "S3cure-pass!", "confirm_mismatch"],
  ];

  it.each(cases)("%s", (_label, confirm, password, expected) => {
    expect(validateConfirmPassword(confirm, password)).toBe(expected);
  });
});

describe("validateSignUp", () => {
  it("returns no errors for a valid form", () => {
    expect(
      validateSignUp({
        fullName: "Ayesha Khan",
        email: "ayesha@example.com",
        password: "S3cure-pass!",
        confirmPassword: "S3cure-pass!",
      }),
    ).toEqual({});
  });

  it("reports every invalid field at once, not just the first", () => {
    expect(
      validateSignUp({
        fullName: "",
        email: "nope",
        password: "short",
        confirmPassword: "",
      }),
    ).toEqual({
      fullName: "name_required",
      email: "email_invalid",
      password: "password_too_short",
      confirmPassword: "confirm_required",
    });
  });

  it("accepts an Urdu name with a Latin email", () => {
    expect(
      validateSignUp({
        fullName: "عائشہ خان",
        email: "ayesha@example.com",
        password: "S3cure-pass!",
        confirmPassword: "S3cure-pass!",
      }),
    ).toEqual({});
  });
});

describe("validateLogin", () => {
  it("requires only presence of a password, never the signup policy", () => {
    // "abc" would fail signup's 8-character rule; at login it is simply a
    // wrong password, and the form must not reveal the policy.
    expect(validateLogin({ email: "a@example.com", password: "abc" })).toEqual({});
  });

  it("reports a missing password", () => {
    expect(validateLogin({ email: "a@example.com", password: "" })).toEqual({
      password: "password_required",
    });
  });

  it("still checks the email looks like an address", () => {
    expect(validateLogin({ email: "nope", password: "whatever" })).toEqual({
      email: "email_invalid",
    });
  });
});

describe("assessPasswordStrength", () => {
  it.each([
    ["short and single-class", "aaaaaaaa", "weak"],
    ["eight mixed characters", "S3cure-p", "fair"],
    ["ten single-class", "aaaaaaaaaa", "fair"],
    ["twelve mixed", "S3cure-pass!", "strong"],
    ["long passphrase with variety", "correct Horse Battery 9!", "strong"],
  ])("%s is %s", (_label, password, expected) => {
    expect(assessPasswordStrength(password).level).toBe(expected);
  });

  it("maps each level to a distinct number of filled segments", () => {
    expect(assessPasswordStrength("aaaaaaaa").score).toBe(1);
    expect(assessPasswordStrength("S3cure-p").score).toBe(2);
    expect(assessPasswordStrength("S3cure-pass!").score).toBe(3);
  });

  it("is advisory only — a weak password still passes validation", () => {
    expect(assessPasswordStrength("aaaaaaaa").level).toBe("weak");
    expect(validatePassword("aaaaaaaa")).toBeNull();
  });
});

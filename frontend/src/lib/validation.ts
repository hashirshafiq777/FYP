/**
 * Form validation.
 *
 * Validators return machine-readable **codes**, never prose: the UI maps a code
 * to `validation.<code>` in the active dictionary. That keeps validation logic
 * language-agnostic and testable without rendering anything.
 *
 * The rules mirror the backend exactly and are never stricter — a value the UI
 * accepts must also be accepted by `POST /auth/signup`.
 */

import type { TranslationKey } from "../i18n/en";

export type NameErrorCode =
  | "name_required"
  | "name_too_short"
  | "name_too_long"
  | "name_invalid_chars"
  | "name_needs_letters";

export type EmailErrorCode = "email_required" | "email_invalid" | "email_too_long";

export type PasswordErrorCode =
  | "password_required"
  | "password_too_short"
  | "password_too_long"
  | "password_whitespace";

export type ConfirmErrorCode = "confirm_required" | "confirm_mismatch";

export type ValidationCode =
  | NameErrorCode
  | EmailErrorCode
  | PasswordErrorCode
  | ConfirmErrorCode;

/** Turn a code into the dictionary key the UI should translate. */
export function validationKey(code: ValidationCode): TranslationKey {
  return `validation.${code}` as TranslationKey;
}

// --------------------------------------------------------------------- limits

export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/**
 * Letters (any script), combining marks, spaces, apostrophes (straight and
 * typographic), hyphens and periods. Urdu, Arabic and accented Latin names all
 * pass; digits and punctuation such as `@` or `/` do not.
 */
const NAME_ALLOWED = /^[\p{L}\p{M}'’\-. ]+$/u;
const LETTER = /\p{L}/gu;

// -------------------------------------------------------------- normalisation

/** Trim and collapse runs of internal whitespace to a single space. */
export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Trim and lowercase. Applied on submit, not while typing. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ----------------------------------------------------------------- validators

export function validateFullName(raw: string): NameErrorCode | null {
  const value = normalizeFullName(raw);

  if (value.length === 0) return "name_required";
  if (value.length < NAME_MIN) return "name_too_short";
  if (value.length > NAME_MAX) return "name_too_long";
  if (!NAME_ALLOWED.test(value)) return "name_invalid_chars";

  const letters = value.match(LETTER);
  if (letters === null || letters.length < 2) return "name_needs_letters";

  return null;
}

/**
 * Pragmatic email check — deliberately permissive.
 *
 * The backend validates properly with `EmailStr`; the job here is to catch
 * obvious typos without rejecting addresses that are in fact deliverable.
 */
export function validateEmail(raw: string): EmailErrorCode | null {
  const value = raw.trim();

  if (value.length === 0) return "email_required";
  if (value.length > EMAIL_MAX) return "email_too_long";
  if (/\s/.test(value)) return "email_invalid";

  const parts = value.split("@");
  if (parts.length !== 2) return "email_invalid";

  const [local, domain] = parts;
  if (local.length === 0 || domain.length === 0) return "email_invalid";
  if (!domain.includes(".")) return "email_invalid";
  if (domain.startsWith(".") || domain.endsWith(".")) return "email_invalid";
  if (domain.includes("..")) return "email_invalid";

  // The part after the final dot must look like a TLD.
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (tld.length < 2) return "email_invalid";

  return null;
}

/** Passwords are never trimmed or altered — leading/trailing spaces are real. */
export function validatePassword(value: string): PasswordErrorCode | null {
  if (value.length === 0) return "password_required";
  if (value.trim().length === 0) return "password_whitespace";
  if (value.length < PASSWORD_MIN) return "password_too_short";
  if (value.length > PASSWORD_MAX) return "password_too_long";
  return null;
}

export function validateConfirmPassword(
  confirmValue: string,
  passwordValue: string,
): ConfirmErrorCode | null {
  if (confirmValue.length === 0) return "confirm_required";
  if (confirmValue !== passwordValue) return "confirm_mismatch";
  return null;
}

// ----------------------------------------------------------- strength (advisory)

export type StrengthLevel = "weak" | "fair" | "strong";

export interface PasswordStrength {
  level: StrengthLevel;
  /** 1-3, for the meter's filled segments. */
  score: 1 | 2 | 3;
}

/**
 * Advisory only. This never blocks submission beyond the 8-character minimum —
 * it is a nudge, not a policy, and the backend enforces nothing like it.
 */
export function assessPasswordStrength(value: string): PasswordStrength {
  if (value.length === 0) return { level: "weak", score: 1 };

  const variety =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^A-Za-z0-9]/.test(value));

  if (value.length >= 14 && variety >= 3) return { level: "strong", score: 3 };
  if (value.length >= 12 && variety >= 2) return { level: "strong", score: 3 };
  if (value.length >= 10 && variety >= 3) return { level: "strong", score: 3 };
  if (value.length >= PASSWORD_MIN && variety >= 2) return { level: "fair", score: 2 };
  if (value.length >= 10) return { level: "fair", score: 2 };

  return { level: "weak", score: 1 };
}

// ---------------------------------------------------------------- form shapes

export interface SignUpValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type SignUpField = keyof SignUpValues;

export type SignUpErrors = Partial<Record<SignUpField, ValidationCode>>;

/** Field order drives "focus the first invalid field" on submit. */
export const SIGNUP_FIELD_ORDER: readonly SignUpField[] = [
  "fullName",
  "email",
  "password",
  "confirmPassword",
] as const;

export function validateSignUp(values: SignUpValues): SignUpErrors {
  const errors: SignUpErrors = {};

  const name = validateFullName(values.fullName);
  if (name) errors.fullName = name;

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const password = validatePassword(values.password);
  if (password) errors.password = password;

  const confirm = validateConfirmPassword(values.confirmPassword, values.password);
  if (confirm) errors.confirmPassword = confirm;

  return errors;
}

export function validateSignUpField(
  field: SignUpField,
  values: SignUpValues,
): ValidationCode | null {
  switch (field) {
    case "fullName":
      return validateFullName(values.fullName);
    case "email":
      return validateEmail(values.email);
    case "password":
      return validatePassword(values.password);
    case "confirmPassword":
      return validateConfirmPassword(values.confirmPassword, values.password);
  }
}

export interface LoginValues {
  email: string;
  password: string;
}

export type LoginField = keyof LoginValues;

export type LoginErrors = Partial<Record<LoginField, ValidationCode>>;

export const LOGIN_FIELD_ORDER: readonly LoginField[] = ["email", "password"] as const;

/**
 * Login is deliberately lenient: presence only.
 *
 * Applying the signup password rules here would leak the password policy to
 * anyone probing the form, and would lock out accounts created before a rule
 * changed.
 */
export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  if (values.password.length === 0) errors.password = "password_required";

  return errors;
}

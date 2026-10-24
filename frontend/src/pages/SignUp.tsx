import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signUp } from "../api/auth";
import { ApiError } from "../api/client";
import Banner from "../components/Banner";
import Button from "../components/Button";
import PasswordField from "../components/PasswordField";
import PasswordStrength from "../components/PasswordStrength";
import TextField from "../components/TextField";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/useI18n";
import AuthLayout from "../layouts/AuthLayout";
import { apiErrorKey } from "../lib/apiErrors";
import {
  SIGNUP_FIELD_ORDER,
  normalizeEmail,
  normalizeFullName,
  validateSignUp,
  validateSignUpField,
  validationKey,
  type SignUpErrors,
  type SignUpField,
  type SignUpValues,
} from "../lib/validation";

const FIELD_IDS: Record<SignUpField, string> = {
  fullName: "signup-full-name",
  email: "signup-email",
  password: "signup-password",
  confirmPassword: "signup-confirm-password",
};

const EMPTY: SignUpValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignUp() {
  const { t } = useI18n();
  const navigate = useNavigate();
  useDocumentTitle(t("signup.documentTitle"));

  const [values, setValues] = useState<SignUpValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<SignUpField, boolean>>>({});
  const [errors, setErrors] = useState<SignUpErrors>({});
  /** Field errors returned by the server (409 / 422), cleared on next edit. */
  const [serverErrors, setServerErrors] = useState<SignUpErrors>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [bannerKey, setBannerKey] = useState<ReturnType<typeof apiErrorKey> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const focusField = useCallback((field: SignUpField) => {
    document.getElementById(FIELD_IDS[field])?.focus();
  }, []);

  const setValue = useCallback(
    (field: SignUpField, next: string) => {
      setValues((current) => {
        const updated = { ...current, [field]: next };

        setErrors((currentErrors) => {
          const revised = { ...currentErrors };

          // Validate live only once a field has been blurred: validating as
          // someone first types shouts at them before they have finished.
          if (touched[field]) {
            const code = validateSignUpField(field, updated);
            if (code) revised[field] = code;
            else delete revised[field];
          }

          // The confirmation's correctness depends on the password, so editing
          // the password must re-judge it — otherwise a stale "do not match"
          // sticks around after the user fixes things from the other end.
          if (field === "password" && touched.confirmPassword) {
            const confirmCode = validateSignUpField("confirmPassword", updated);
            if (confirmCode) revised.confirmPassword = confirmCode;
            else delete revised.confirmPassword;
          }

          return revised;
        });

        return updated;
      });

      // A server verdict is about the value that was submitted, not this one.
      setServerErrors((current) => {
        if (!(field in current)) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      if (field === "email") setEmailTaken(false);
      setBannerKey(null);
    },
    [touched],
  );

  const handleBlur = useCallback(
    (field: SignUpField) => {
      setTouched((current) => ({ ...current, [field]: true }));
      setErrors((current) => {
        const code = validateSignUpField(field, values);
        const next = { ...current };
        if (code) next[field] = code;
        else delete next[field];
        return next;
      });
    },
    [values],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setBannerKey(null);
    setServerErrors({});
    setEmailTaken(false);

    const found = validateSignUp(values);
    setErrors(found);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

    const firstInvalid = SIGNUP_FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      // Every error is on screen; move the user straight to the first one.
      focusField(firstInvalid);
      return;
    }

    setSubmitting(true);
    const email = normalizeEmail(values.email);
    try {
      await signUp({
        full_name: normalizeFullName(values.fullName),
        email,
        password: values.password,
      });

      // Signup issues no token. Hand off to login with the address pre-filled
      // rather than pretending the user is already signed in.
      navigate("/login", {
        replace: true,
        state: { notice: "signup-success", email },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // `emailTaken` drives both the field error text and the inline
        // "Sign in instead" link, so no generic field code is needed.
        setEmailTaken(true);
        focusField("email");
      } else if (error instanceof ApiError && error.kind === "validation") {
        const mapped = (error.fieldErrors ?? {}) as SignUpErrors;
        const known = SIGNUP_FIELD_ORDER.filter((field) => mapped[field]);
        if (known.length > 0) {
          setServerErrors(mapped);
          focusField(known[0]);
        } else {
          // 422 about something the form does not own: say so generically
          // rather than attaching an error to no field at all.
          setBannerKey("error.validation");
        }
      } else {
        setBannerKey(apiErrorKey(error));
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  /** Client error first, then the server's verdict on the submitted value. */
  function errorFor(field: SignUpField): string | undefined {
    if (field === "email" && emailTaken) return t("error.emailTaken");
    const code = errors[field] ?? serverErrors[field];
    return code ? t(validationKey(code)) : undefined;
  }

  return (
    <AuthLayout
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
      footer={
        <>
          {t("signup.haveAccount")} <Link to="/login">{t("signup.signIn")}</Link>
        </>
      }
    >
      {bannerKey ? (
        <Banner tone="error" className="auth__banner">
          {t(bannerKey)}
        </Banner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="form">
        <TextField
          id={FIELD_IDS.fullName}
          label={t("field.fullName")}
          hint={t("field.fullName.hint")}
          error={errorFor("fullName")}
          value={values.fullName}
          onChange={(event) => setValue("fullName", event.target.value)}
          onBlur={() => handleBlur("fullName")}
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          required
          readOnly={submitting}
          // Names may be Urdu or Latin: let the browser decide per value.
          dir="auto"
        />

        <TextField
          id={FIELD_IDS.email}
          label={t("field.email")}
          hint={t("field.email.hint")}
          error={errorFor("email")}
          value={values.email}
          onChange={(event) => setValue("email", event.target.value)}
          onBlur={() => handleBlur("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          readOnly={submitting}
          dir="ltr"
          footer={
            emailTaken ? (
              <p className="field__assist">
                <Link to="/login" state={{ email: normalizeEmail(values.email) }}>
                  {t("signup.signInInstead")}
                </Link>
              </p>
            ) : undefined
          }
        />

        <PasswordField
          id={FIELD_IDS.password}
          label={t("field.password")}
          hint={t("field.password.hint")}
          error={errorFor("password")}
          value={values.password}
          onChange={(next) => setValue("password", next)}
          onBlur={() => handleBlur("password")}
          autoComplete="new-password"
          required
          readOnly={submitting}
        >
          <PasswordStrength value={values.password} />
        </PasswordField>

        <PasswordField
          id={FIELD_IDS.confirmPassword}
          label={t("field.confirmPassword")}
          hint={t("field.confirmPassword.hint")}
          error={errorFor("confirmPassword")}
          value={values.confirmPassword}
          onChange={(next) => setValue("confirmPassword", next)}
          onBlur={() => handleBlur("confirmPassword")}
          autoComplete="new-password"
          required
          readOnly={submitting}
        />

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          loadingLabel={t("signup.submitting")}
          className="form__submit"
        >
          {t("signup.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}

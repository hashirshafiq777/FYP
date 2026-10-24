import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import Banner from "../components/Banner";
import Button from "../components/Button";
import PasswordField from "../components/PasswordField";
import TextField from "../components/TextField";
import { useAuth } from "../auth/useAuth";
import useDocumentTitle from "../hooks/useDocumentTitle";
import type { TranslationKey } from "../i18n/en";
import { useI18n } from "../i18n/useI18n";
import AuthLayout from "../layouts/AuthLayout";
import { apiErrorKey, isRetryable } from "../lib/apiErrors";
import {
  LOGIN_FIELD_ORDER,
  normalizeEmail,
  validateLogin,
  validationKey,
  type LoginErrors,
  type LoginField,
  type LoginValues,
} from "../lib/validation";

const FIELD_IDS: Record<LoginField, string> = {
  email: "login-email",
  password: "login-password",
};

interface LoginLocationState {
  /** Set by SignUp after a successful registration. */
  notice?: "signup-success";
  /** Pre-fills the address the user just registered with. */
  email?: string;
  /** Where the user was headed before being bounced to login. */
  from?: string;
}

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  useDocumentTitle(t("login.documentTitle"));

  const state = (location.state ?? {}) as LoginLocationState;
  const expired = searchParams.get("reason") === "expired";

  const [values, setValues] = useState<LoginValues>({
    email: state.email ?? "",
    password: "",
  });
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [errors, setErrors] = useState<LoginErrors>({});
  const [bannerKey, setBannerKey] = useState<TranslationKey | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [notice, setNotice] = useState<TranslationKey | null>(
    state.notice === "signup-success" ? "login.signupSuccess" : null,
  );
  const [submitting, setSubmitting] = useState(false);

  // Drop the one-shot banner state from history, so a reload or a Back/Forward
  // does not resurrect "Account created" long after the fact. The banner and
  // the pre-filled email have already been copied into local state above.
  // Routed through `navigate` rather than `history.replaceState` so React
  // Router's own location bookkeeping stays consistent.
  const hasOneShotState = Boolean(state.notice ?? state.email);
  useEffect(() => {
    if (!hasOneShotState) return;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: state.from ? { from: state.from } : null,
    });
  }, [hasOneShotState, navigate, location.pathname, location.search, state.from]);

  const focusField = useCallback((field: LoginField) => {
    document.getElementById(FIELD_IDS[field])?.focus();
  }, []);

  const setValue = useCallback(
    (field: LoginField, next: string) => {
      setValues((current) => {
        const updated = { ...current, [field]: next };
        if (touched[field]) {
          setErrors((currentErrors) => {
            const revised = { ...currentErrors };
            const found = validateLogin(updated);
            if (found[field]) revised[field] = found[field];
            else delete revised[field];
            return revised;
          });
        }
        return updated;
      });
      setBannerKey(null);
    },
    [touched],
  );

  const handleBlur = useCallback(
    (field: LoginField) => {
      setTouched((current) => ({ ...current, [field]: true }));
      setErrors((current) => {
        const found = validateLogin(values);
        const next = { ...current };
        if (found[field]) next[field] = found[field];
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
    setNotice(null);
    setRetryable(false);

    const found = validateLogin(values);
    setErrors(found);
    setTouched({ email: true, password: true });

    const firstInvalid = LOGIN_FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setSubmitting(true);
    try {
      await signIn(normalizeEmail(values.email), values.password);
      navigate(state.from ?? "/dashboard", { replace: true });
      return;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Never say *which* was wrong: that turns the form into an account
        // oracle. Keep the email, clear the password, put the cursor there.
        setBannerKey("login.failed");
        setValues((current) => ({ ...current, password: "" }));
        focusField("password");
      } else {
        setBannerKey(apiErrorKey(error));
        setRetryable(isRetryable(error));
      }
      setSubmitting(false);
    }
  }

  function errorFor(field: LoginField): string | undefined {
    const code = errors[field];
    return code ? t(validationKey(code)) : undefined;
  }

  return (
    <AuthLayout
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      footer={
        <>
          {t("login.noAccount")} <Link to="/signup">{t("login.createAccount")}</Link>
        </>
      }
    >
      {notice ? (
        <Banner tone="success" className="auth__banner">
          {t(notice)}
        </Banner>
      ) : null}

      {expired && !bannerKey ? (
        <Banner tone="info" className="auth__banner">
          {t("login.sessionExpired")}
        </Banner>
      ) : null}

      {bannerKey ? (
        <Banner
          tone="error"
          className="auth__banner"
          action={
            retryable ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBannerKey(null);
                  focusField("password");
                }}
              >
                {t("common.retry")}
              </Button>
            ) : undefined
          }
        >
          {t(bannerKey)}
        </Banner>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="form">
        <TextField
          id={FIELD_IDS.email}
          label={t("field.email")}
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
          autoFocus={values.email.length === 0}
          required
          readOnly={submitting}
          dir="ltr"
        />

        <PasswordField
          id={FIELD_IDS.password}
          label={t("field.password")}
          error={errorFor("password")}
          value={values.password}
          onChange={(next) => setValue("password", next)}
          onBlur={() => handleBlur("password")}
          autoComplete="current-password"
          required
          readOnly={submitting}
        />

        <Button
          type="submit"
          fullWidth
          loading={submitting}
          loadingLabel={t("login.submitting")}
          className="form__submit"
        >
          {t("login.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}

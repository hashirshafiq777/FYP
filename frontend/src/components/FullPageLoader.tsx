import { useI18n } from "../i18n/useI18n";
import Logo from "./Logo";

/**
 * Branded splash shown while a stored token is validated against /auth/me.
 *
 * Without it the app would paint the login page and then replace it with the
 * dashboard a moment later — which reads as a bug, and worse, as having been
 * signed out.
 */
export default function FullPageLoader() {
  const { t } = useI18n();

  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash__inner">
        <Logo size={34} />
        <span className="splash__bar" aria-hidden="true">
          <span className="splash__bar-fill" />
        </span>
        <span className="visually-hidden">{t("common.loading")}</span>
      </div>
    </div>
  );
}

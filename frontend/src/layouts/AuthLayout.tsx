import type { ReactNode } from "react";

import ContractPreview from "../components/ContractPreview";
import LanguageToggle from "../components/LanguageToggle";
import Logo from "../components/Logo";
import { useI18n } from "../i18n/useI18n";
import type { TranslationKey } from "../i18n/en";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** The "already have an account?" / "new here?" line under the form. */
  footer: ReactNode;
}

interface Point {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

/**
 * Numbered rather than illustrated.
 *
 * Legal documents number their clauses, so a numbered list belongs to this
 * product's own language — and it avoids the decorative icon-per-bullet
 * pattern, which reads as filler.
 */
const POINTS: Point[] = [
  { titleKey: "auth.panel.point1.title", bodyKey: "auth.panel.point1.body" },
  { titleKey: "auth.panel.point2.title", bodyKey: "auth.panel.point2.body" },
  { titleKey: "auth.panel.point3.title", bodyKey: "auth.panel.point3.body" },
];

/**
 * Two-column shell for /login and /signup.
 *
 * The brand panel is the product's argument — what the app does and why it is
 * trustworthy — and it collapses away below 60rem so the form owns small
 * screens entirely rather than being pushed under a wall of marketing.
 */
export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useI18n();

  return (
    <div className="auth">
      <aside className="auth__brand on-ink" aria-labelledby="auth-brand-heading">
        <div className="auth__brand-inner">
          <Logo size={30} inverse />

          <div className="auth__pitch">
            <p className="eyebrow auth__eyebrow">{t("auth.panel.eyebrow")}</p>
            <h2 className="auth__heading" id="auth-brand-heading">
              {t("auth.panel.heading")}
            </h2>
            <p className="auth__body">{t("auth.panel.body")}</p>
          </div>

          <ContractPreview title={t("auth.panel.docTitle")} />

          <ol className="auth__points">
            {POINTS.map((point, index) => (
              <li
                key={point.titleKey}
                className="auth__point reveal"
                style={{ ["--reveal-index" as string]: String(index + 6) }}
              >
                {/* The <ol> already conveys order to assistive tech, so the
                    visible numeral is decoration. */}
                <span className="auth__point-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="auth__point-text">
                  <strong>{t(point.titleKey)}</strong>
                  <span className="auth__point-body">{t(point.bodyKey)}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="auth__privacy">{t("auth.panel.privacy")}</p>
        </div>
      </aside>

      <div className="auth__panel">
        <header className="auth__topbar">
          <span className="auth__topbar-logo">
            <Logo size={24} />
          </span>
          <LanguageToggle />
        </header>

        <main className="auth__main" id="main-content">
          <div className="auth__card reveal">
            <div className="auth__card-head">
              <h1 className="auth__title">{title}</h1>
              <p className="auth__subtitle">{subtitle}</p>
            </div>

            {children}
          </div>

          <p className="auth__footer">{footer}</p>
        </main>

        <footer className="auth__legal">
          <p className="muted">{t("app.disclaimer")}</p>
        </footer>
      </div>
    </div>
  );
}

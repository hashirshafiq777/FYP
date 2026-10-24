import { useI18n } from "../i18n/useI18n";
import { assessPasswordStrength, type StrengthLevel } from "../lib/validation";

const LABEL_KEY = {
  weak: "strength.weak",
  fair: "strength.fair",
  strong: "strength.strong",
} as const;

/**
 * Advisory password strength meter.
 *
 * Deliberately *not* an `aria-live` region: it updates on every keystroke, and
 * announcing "weak, weak, fair…" over a screen reader while someone types
 * their password is noise, not help. It is also never the only signal — the
 * level is spelled out in words beside the bar, so the meter is readable
 * without relying on its colour.
 */
export default function PasswordStrength({ value }: { value: string }) {
  const { t } = useI18n();

  if (value.length === 0) return null;

  const { level, score } = assessPasswordStrength(value);
  const levels: StrengthLevel[] = ["weak", "fair", "strong"];

  return (
    <div className={`strength strength--${level}`}>
      <div className="strength__track" aria-hidden="true">
        {levels.map((_, index) => (
          <span
            key={index}
            className={`strength__segment${index < score ? " is-filled" : ""}`}
          />
        ))}
      </div>
      <p className="strength__label">
        <span className="visually-hidden">{t("strength.label")}: </span>
        {t(LABEL_KEY[level])}
      </p>
    </div>
  );
}

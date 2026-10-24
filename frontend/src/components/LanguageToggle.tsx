import { useI18n } from "../i18n/useI18n";
import type { Language } from "../i18n/context";

interface LanguageToggleProps {
  /** Light-on-ink treatment for the auth panel and sidebar. */
  inverse?: boolean;
  className?: string;
}

const OPTIONS: ReadonlyArray<{ value: Language; labelKey: "language.english" | "language.urdu" }> =
  [
    { value: "en", labelKey: "language.english" },
    { value: "ur", labelKey: "language.urdu" },
  ];

/**
 * Segmented English / اردو control.
 *
 * Two real buttons rather than a single switch, so the current language and
 * the alternative are both visible and individually reachable by keyboard.
 * `aria-pressed` carries the selected state; each label is rendered in its own
 * script, which is also the clearest possible affordance.
 */
export default function LanguageToggle({ inverse = false, className }: LanguageToggleProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={["lang-toggle", inverse ? "lang-toggle--inverse" : "", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={t("language.label")}
    >
      {OPTIONS.map((option) => {
        const selected = option.value === language;
        const label = t(option.labelKey);
        return (
          <button
            key={option.value}
            type="button"
            className={`lang-toggle__option${selected ? " is-selected" : ""}`}
            onClick={() => setLanguage(option.value)}
            aria-pressed={selected}
            aria-label={selected ? undefined : t("language.switchTo", { language: label })}
            lang={option.value}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

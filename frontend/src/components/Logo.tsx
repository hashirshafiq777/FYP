import { LogoMark } from "./icons";

interface LogoProps {
  /** Mark size in px. The wordmark scales with it. */
  size?: number;
  /** Hide the wordmark and show the mark alone (collapsed rails, favicons). */
  markOnly?: boolean;
  /** Use the light-on-ink treatment (sidebar, auth brand panel). */
  inverse?: boolean;
  className?: string;
}

/**
 * Brand lockup: logomark + "LegalDocReader" wordmark.
 *
 * The wordmark stays in Latin in both languages — it is a product name, not a
 * translatable string — but the lockup itself mirrors with the document
 * direction, so the mark leads in RTL as it does in LTR.
 */
export default function Logo({
  size = 26,
  markOnly = false,
  inverse = false,
  className,
}: LogoProps) {
  const classes = ["logo", inverse ? "logo--inverse" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      <span className="logo__mark" aria-hidden="true">
        <LogoMark size={size} />
      </span>
      {markOnly ? null : (
        <span className="logo__word" style={{ fontSize: `${size * 0.62}px` }}>
          Legal<span className="logo__word-accent">Doc</span>Reader
        </span>
      )}
    </span>
  );
}

import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon } from "./icons";

interface Clause {
  /** Bilingual on purpose: the illustration *is* the bilingual claim. */
  en: string;
  ur: string;
  level: "high" | "medium" | "low";
  /** Relative widths of the redacted text lines under the clause. */
  lines: number[];
}

const CLAUSES: Clause[] = [
  { en: "Termination", ur: "اختتام", level: "high", lines: [100, 72] },
  { en: "Payment", ur: "ادائیگی", level: "medium", lines: [92, 58] },
  { en: "Liability", ur: "ذمہ داری", level: "low", lines: [84] },
];

const LEVEL_ICON = {
  high: AlertTriangleIcon,
  medium: AlertCircleIcon,
  low: CheckCircleIcon,
} as const;

/**
 * Stylised contract page for the auth brand panel.
 *
 * Built entirely from CSS and inline SVG — no stock imagery — and marked
 * `aria-hidden`, because the claim it illustrates is spelled out properly in
 * the value points beside it. Reading out a fake document's redacted lines
 * would be noise.
 */
export default function ContractPreview({ title }: { title: string }) {
  return (
    <div className="contract" aria-hidden="true">
      <div className="contract__sheet">
        <div className="contract__header">
          <span className="contract__title">{title}</span>
          <span className="contract__rule" />
        </div>

        <div className="contract__intro">
          <span className="contract__line" style={{ inlineSize: "96%" }} />
          <span className="contract__line" style={{ inlineSize: "88%" }} />
          <span className="contract__line" style={{ inlineSize: "64%" }} />
        </div>

        {CLAUSES.map((clause, index) => {
          const Icon = LEVEL_ICON[clause.level];
          return (
            <div
              key={clause.en}
              className={`contract__clause contract__clause--${clause.level}`}
              style={{ ["--reveal-index" as string]: String(index + 3) }}
            >
              <div className="contract__tag">
                <Icon size={13} />
                <span className="contract__tag-en">{clause.en}</span>
                <span className="contract__tag-sep" />
                <span className="contract__tag-ur" lang="ur" dir="rtl">
                  {clause.ur}
                </span>
              </div>
              <div className="contract__clause-body">
                {clause.lines.map((width, lineIndex) => (
                  <span
                    key={lineIndex}
                    className="contract__line contract__line--marked"
                    style={{ inlineSize: `${width}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="contract__intro">
          <span className="contract__line" style={{ inlineSize: "78%" }} />
          <span className="contract__line" style={{ inlineSize: "52%" }} />
        </div>
      </div>
    </div>
  );
}

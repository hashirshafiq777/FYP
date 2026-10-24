import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Rendered at the end of the header row (counts, legends). */
  aside?: ReactNode;
  children: ReactNode;
  /** `aria-busy` while the section's data loads. */
  busy?: boolean;
  className?: string;
  headingId?: string;
}

/** One dashboard widget: a titled region on paper. */
export default function SectionCard({
  title,
  subtitle,
  aside,
  children,
  busy,
  className,
  headingId,
}: SectionCardProps) {
  return (
    <section
      className={["card", className].filter(Boolean).join(" ")}
      aria-busy={busy || undefined}
      aria-labelledby={headingId}
    >
      <header className="card__head">
        <div>
          <h2 className="card__title" id={headingId}>
            {title}
          </h2>
          {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
        </div>
        {aside ? <div className="card__aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

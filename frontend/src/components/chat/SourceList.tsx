import { useState } from "react";

import type { Source } from "../../api/chat";
import { useI18n } from "../../i18n/useI18n";
import { ChevronDownIcon } from "../icons";

interface SourceListProps {
  sources: Source[];
}

/**
 * The passages an answer was grounded on, collapsed by default.
 *
 * Showing sources is the whole point of RAG for a legal tool: the user can
 * check the exact section the assistant relied on instead of trusting prose.
 */
export default function SourceList({ sources }: SourceListProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className={`sources${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="sources__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{t("chat.sources", { count: sources.length })}</span>
        <ChevronDownIcon size={16} className="sources__chevron" />
      </button>

      {open ? (
        <ol className="sources__list">
          {sources.map((source, index) => (
            <li className="sources__item" key={`${source.label}-${index}`}>
              <div className="sources__head">
                <span className={`chip chip--neutral sources__kind sources__kind--${source.kind}`}>
                  {t(
                    source.kind === "case"
                      ? "chat.source.case"
                      : source.kind === "document"
                        ? "chat.source.document"
                        : "chat.source.statute",
                  )}
                </span>
                <span className="sources__label" dir="ltr">
                  {source.label}
                </span>
              </div>
              <p className="sources__title" dir="ltr">
                {source.title}
              </p>
              <p className="sources__excerpt" dir="auto">
                {source.excerpt}
              </p>
              {source.url ? (
                <a
                  className="sources__link"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("chat.source.open")}
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

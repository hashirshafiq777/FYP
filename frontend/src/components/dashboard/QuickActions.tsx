import { Link } from "react-router-dom";

import { ArrowRightIcon, ChatIcon, DraftIcon, UploadIcon } from "../icons";
import type { TranslationKey } from "../../i18n/en";
import { useI18n } from "../../i18n/useI18n";

interface Action {
  to: string;
  icon: typeof UploadIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const ACTIONS: Action[] = [
  {
    to: "/documents",
    icon: UploadIcon,
    titleKey: "dashboard.action.upload.title",
    bodyKey: "dashboard.action.upload.body",
  },
  {
    to: "/chat",
    icon: ChatIcon,
    titleKey: "dashboard.action.ask.title",
    bodyKey: "dashboard.action.ask.body",
  },
  {
    to: "/agreements",
    icon: DraftIcon,
    titleKey: "dashboard.action.draft.title",
    bodyKey: "dashboard.action.draft.body",
  },
];

/**
 * The three things a user most often wants to do.
 *
 * These are real links to real (if unfinished) routes — nothing here is a
 * decorative card that does nothing when clicked.
 */
export default function QuickActions() {
  const { t } = useI18n();

  return (
    <section className="quick" aria-labelledby="quick-actions-heading">
      <h2 className="section-heading" id="quick-actions-heading">
        {t("dashboard.quickActions")}
      </h2>
      <ul className="quick__grid">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <li
              key={action.to}
              className="reveal"
              style={{ ["--reveal-index" as string]: String(index + 1) }}
            >
              <Link className="quick__card" to={action.to}>
                <span className="quick__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="quick__text">
                  <span className="quick__title">{t(action.titleKey)}</span>
                  <span className="quick__body">{t(action.bodyKey)}</span>
                </span>
                <ArrowRightIcon size={17} className="quick__arrow icon-directional" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

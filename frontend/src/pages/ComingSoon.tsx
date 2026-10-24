import { Link } from "react-router-dom";

import { ArrowLeftIcon } from "../components/icons";
import useDocumentTitle from "../hooks/useDocumentTitle";
import type { TranslationKey } from "../i18n/en";
import { useI18n } from "../i18n/useI18n";

interface ComingSoonProps {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  icon: React.ReactNode;
}

/**
 * Placeholder for a section that is routed but not built.
 *
 * Every nav item leads here rather than nowhere: a 404 or a dead link from
 * your own navigation reads as breakage, while a page that says plainly what
 * is coming reads as progress.
 */
export default function ComingSoon({ titleKey, bodyKey, icon }: ComingSoonProps) {
  const { t } = useI18n();
  useDocumentTitle(t(titleKey));

  return (
    <div className="soon">
      <div className="soon__card reveal">
        <span className="soon__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="soon__badge">{t("coming.badge")}</span>
        <h2 className="soon__title">{t(titleKey)}</h2>
        <p className="soon__body">{t(bodyKey)}</p>
        <Link className="soon__back" to="/dashboard">
          <ArrowLeftIcon size={16} className="icon-directional" />
          <span>{t("common.backToDashboard")}</span>
        </Link>
      </div>
    </div>
  );
}

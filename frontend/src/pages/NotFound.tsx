import { Link } from "react-router-dom";

import Logo from "../components/Logo";
import { ArrowLeftIcon } from "../components/icons";
import { useAuth } from "../auth/useAuth";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/useI18n";

export default function NotFound() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  useDocumentTitle(t("notFound.documentTitle"));

  return (
    <main className="notfound" id="main-content">
      <div className="notfound__card reveal">
        <Logo size={28} />
        <p className="notfound__code" aria-hidden="true">
          {t("notFound.code")}
        </p>
        <h1 className="notfound__title">{t("notFound.title")}</h1>
        <p className="notfound__body">{t("notFound.body")}</p>
        <Link className="notfound__back" to={isAuthenticated ? "/dashboard" : "/login"}>
          <ArrowLeftIcon size={16} className="icon-directional" />
          <span>{isAuthenticated ? t("common.backToDashboard") : t("login.title")}</span>
        </Link>
      </div>
    </main>
  );
}

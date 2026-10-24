import type { DocumentSummary } from "../../data/dashboardData";
import type { TranslationKey } from "../../i18n/en";
import { useI18n } from "../../i18n/useI18n";
import Chip from "../Chip";
import EmptyState from "../EmptyState";
import SectionCard from "../SectionCard";
import Skeleton from "../Skeleton";
import { DocumentsIcon } from "../icons";
import { RiskIcon, StatusIcon } from "../semanticIcons";

interface DocumentsTableProps {
  documents: DocumentSummary[] | null;
}

const STATUS_LABEL: Record<DocumentSummary["status"], TranslationKey> = {
  ready: "status.ready",
  processing: "status.processing",
  failed: "status.failed",
};

const KIND_LABEL: Record<DocumentSummary["kind"], TranslationKey> = {
  contract: "docType.contract",
  policy: "docType.policy",
  scan: "docType.scan",
  agreement: "docType.agreement",
};

const RISK_LABEL: Record<DocumentSummary["risk"], TranslationKey> = {
  high: "risk.high",
  medium: "risk.medium",
  low: "risk.low",
  none: "risk.none",
};

/**
 * Recent documents.
 *
 * Rendered twice — a real `<table>` for wide viewports and a card list for
 * narrow ones — with CSS showing exactly one. Restyling a table into blocks
 * with `display: block` would strip its row/column semantics; keeping two
 * correct structures and hiding one leaves the accessibility tree honest.
 *
 * Rows deliberately carry no hover or pointer affordance: there is nowhere for
 * them to lead yet, and a row that looks clickable but is not is a small lie.
 */
export default function DocumentsTable({ documents }: DocumentsTableProps) {
  const { t, formatDate } = useI18n();
  const loading = documents === null;

  function LanguageBadge({ language }: { language: DocumentSummary["language"] }) {
    return (
      <span className="lang-badge" title={t(language === "ur" ? "lang.urFull" : "lang.enFull")}>
        <span aria-hidden="true">{t(language === "ur" ? "lang.ur" : "lang.en")}</span>
        <span className="visually-hidden">
          {t(language === "ur" ? "lang.urFull" : "lang.enFull")}
        </span>
      </span>
    );
  }

  function StatusChip({ status }: { status: DocumentSummary["status"] }) {
    const Icon = StatusIcon[status];
    return (
      <Chip tone={status} icon={<Icon size={14} />}>
        {t(STATUS_LABEL[status])}
      </Chip>
    );
  }

  function RiskCell({ risk }: { risk: DocumentSummary["risk"] }) {
    if (risk === "none") return <span className="muted">{t("risk.none")}</span>;
    const Icon = RiskIcon[risk];
    return (
      <Chip tone={risk} icon={<Icon size={14} />}>
        {t(RISK_LABEL[risk])}
      </Chip>
    );
  }

  return (
    <SectionCard
      title={t("dashboard.documents.title")}
      subtitle={t("dashboard.documents.subtitle")}
      headingId="documents-heading"
      busy={loading}
    >
      {loading ? (
        <div className="doc-skeleton">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="doc-skeleton__row" key={index}>
              <Skeleton width="45%" height="1rem" />
              <Skeleton width="4rem" height="1rem" />
              <Skeleton width="5rem" height="1rem" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<DocumentsIcon size={22} />}
          title={t("dashboard.documents.empty.title")}
          body={t("dashboard.documents.empty.body")}
          actionLabel={t("dashboard.documents.empty.action")}
          actionTo="/documents"
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t("dashboard.documents.name")}</th>
                  <th scope="col">{t("dashboard.documents.language")}</th>
                  <th scope="col">{t("dashboard.documents.type")}</th>
                  <th scope="col">{t("dashboard.documents.uploaded")}</th>
                  <th scope="col">{t("dashboard.documents.status")}</th>
                  <th scope="col">{t("risk.level")}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <th scope="row" className="table__name" dir="auto">
                      {document.name}
                    </th>
                    <td>
                      <LanguageBadge language={document.language} />
                    </td>
                    <td className="table__muted">{t(KIND_LABEL[document.kind])}</td>
                    <td className="table__muted">{formatDate(document.uploadedAt)}</td>
                    <td>
                      <StatusChip status={document.status} />
                    </td>
                    <td>
                      <RiskCell risk={document.risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="doc-cards">
            {documents.map((document) => (
              <li className="doc-card" key={document.id}>
                <p className="doc-card__name" dir="auto">
                  {document.name}
                </p>
                <p className="doc-card__meta">
                  <LanguageBadge language={document.language} />
                  <span className="muted">{t(KIND_LABEL[document.kind])}</span>
                  <span className="doc-card__dot" aria-hidden="true" />
                  <span className="muted">{formatDate(document.uploadedAt)}</span>
                </p>
                <p className="doc-card__chips">
                  <StatusChip status={document.status} />
                  <RiskCell risk={document.risk} />
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

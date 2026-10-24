import type { AgreementSummary } from "../../data/dashboardData";
import type { TranslationKey } from "../../i18n/en";
import { useI18n } from "../../i18n/useI18n";
import EmptyState from "../EmptyState";
import SectionCard from "../SectionCard";
import Skeleton from "../Skeleton";
import { AgreementsIcon } from "../icons";

interface AgreementsListProps {
  agreements: AgreementSummary[] | null;
}

const KIND_LABEL: Record<AgreementSummary["kind"], TranslationKey> = {
  employment: "agreementType.employment",
  nda: "agreementType.nda",
  service: "agreementType.service",
  rental: "agreementType.rental",
};

const STATUS_LABEL: Record<AgreementSummary["status"], TranslationKey> = {
  draft: "agreementStatus.draft",
  inReview: "agreementStatus.inReview",
  exported: "agreementStatus.exported",
};

export default function AgreementsList({ agreements }: AgreementsListProps) {
  const { t, formatRelativeTime } = useI18n();
  const loading = agreements === null;

  return (
    <SectionCard
      title={t("dashboard.agreements.title")}
      subtitle={t("dashboard.agreements.subtitle")}
      headingId="agreements-heading"
      busy={loading}
    >
      {loading ? (
        <ul className="feed">
          {Array.from({ length: 3 }, (_, index) => (
            <li className="feed__item" key={index}>
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="40%" height="0.8rem" style={{ marginBlockStart: "0.45rem" }} />
            </li>
          ))}
        </ul>
      ) : agreements.length === 0 ? (
        <EmptyState
          icon={<AgreementsIcon size={22} />}
          title={t("dashboard.agreements.empty.title")}
          body={t("dashboard.agreements.empty.body")}
          actionLabel={t("dashboard.agreements.empty.action")}
          actionTo="/agreements"
        />
      ) : (
        <ul className="feed">
          {agreements.map((agreement) => (
            <li className="feed__item" key={agreement.id}>
              <div className="feed__head">
                <p className="feed__title" dir="auto">
                  {agreement.title}
                </p>
                <span className={`tag tag--${agreement.status}`}>
                  {t(STATUS_LABEL[agreement.status])}
                </span>
              </div>
              <p className="feed__snippet">
                {t(KIND_LABEL[agreement.kind])}
                <span className="feed__sep" aria-hidden="true" />
                {t("dashboard.agreements.updated", {
                  time: formatRelativeTime(agreement.updatedAt),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

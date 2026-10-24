import type { RiskBreakdown, RiskCategory } from "../../data/dashboardData";
import { totalFlaggedClauses } from "../../data/dashboardData";
import type { TranslationKey } from "../../i18n/en";
import { useI18n } from "../../i18n/useI18n";
import EmptyState from "../EmptyState";
import SectionCard from "../SectionCard";
import Skeleton from "../Skeleton";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, ShieldIcon } from "../icons";

interface RiskOverviewProps {
  risk: RiskBreakdown | null;
  categories: RiskCategory[] | null;
}

const SEVERITIES = [
  { key: "high", labelKey: "risk.high" as TranslationKey, Icon: AlertTriangleIcon },
  { key: "medium", labelKey: "risk.medium" as TranslationKey, Icon: AlertCircleIcon },
  { key: "low", labelKey: "risk.low" as TranslationKey, Icon: CheckCircleIcon },
] as const;

/**
 * Flagged clauses by severity.
 *
 * The stacked bar is decorative: it is `aria-hidden`, and the legend beneath
 * carries the same information as icon + label + number. Severity is never
 * communicated by the bar's colour alone, which would fail for a red-green
 * colour-blind reader and in a monochrome print.
 */
export default function RiskOverview({ risk, categories }: RiskOverviewProps) {
  const { t, formatNumber } = useI18n();
  const loading = risk === null || categories === null;
  const total = risk ? totalFlaggedClauses(risk) : 0;

  return (
    <SectionCard
      title={t("dashboard.risk.title")}
      subtitle={t("dashboard.risk.subtitle")}
      headingId="risk-heading"
      busy={loading}
      className="card--risk"
      aside={
        loading ? (
          <Skeleton width="7rem" height="0.9rem" />
        ) : total > 0 ? (
          <span className="card__count">
            {t("dashboard.risk.total", { count: formatNumber(total) })}
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="risk__loading">
          <Skeleton height="0.9rem" />
          <div className="risk__legend">
            {SEVERITIES.map((severity) => (
              <Skeleton key={severity.key} width="5rem" height="1.1rem" />
            ))}
          </div>
          <div className="risk__categories">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} height="1.4rem" />
            ))}
          </div>
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<ShieldIcon size={22} />}
          title={t("dashboard.risk.empty.title")}
          body={t("dashboard.risk.empty.body")}
          actionLabel={t("dashboard.risk.empty.action")}
          actionTo="/documents"
        />
      ) : (
        <>
          <div
            className="risk__bar"
            aria-hidden="true"
            role="presentation"
            title={t("dashboard.risk.chartLabel")}
          >
            {SEVERITIES.map((severity) => {
              const value = risk[severity.key];
              if (value === 0) return null;
              return (
                <span
                  key={severity.key}
                  className={`risk__segment risk__segment--${severity.key}`}
                  style={{ flexGrow: value }}
                />
              );
            })}
          </div>

          <ul className="risk__legend">
            {SEVERITIES.map(({ key, labelKey, Icon }) => (
              <li key={key} className={`risk__legend-item risk__legend-item--${key}`}>
                <Icon size={16} />
                <span className="risk__legend-label">{t(labelKey)}</span>
                <span className="risk__legend-count">{formatNumber(risk[key])}</span>
              </li>
            ))}
          </ul>

          <h3 className="risk__subheading">{t("dashboard.risk.categories")}</h3>
          <ul className="risk__categories">
            {categories.map((category) => (
              <li key={category.id} className="risk__category">
                <span className={`risk__dot risk__dot--${category.level}`} aria-hidden="true" />
                <span className="risk__category-label">{t(category.labelKey)}</span>
                <span className="risk__category-count">{formatNumber(category.count)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}

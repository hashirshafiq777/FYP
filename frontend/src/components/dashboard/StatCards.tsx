import type { StatCard } from "../../data/dashboardData";
import { useI18n } from "../../i18n/useI18n";
import Skeleton from "../Skeleton";

interface StatCardsProps {
  stats: StatCard[] | null;
}

/** Four headline numbers. `null` renders the skeleton. */
export default function StatCards({ stats }: StatCardsProps) {
  const { t, formatNumber } = useI18n();

  return (
    <section aria-labelledby="stats-heading" aria-busy={stats === null || undefined}>
      <h2 className="visually-hidden" id="stats-heading">
        {t("dashboard.stats")}
      </h2>

      <ul className="stats">
        {stats === null
          ? Array.from({ length: 4 }, (_, index) => (
              <li className="stat" key={index}>
                <Skeleton width="60%" height="0.8rem" />
                <Skeleton width="3.5rem" height="2rem" style={{ marginBlock: "0.6rem" }} />
                <Skeleton width="45%" height="0.75rem" />
              </li>
            ))
          : stats.map((stat, index) => (
              <li
                className={`stat stat--${stat.tone} reveal`}
                key={stat.id}
                style={{ ["--reveal-index" as string]: String(index + 1) }}
              >
                <p className="stat__label">{t(stat.labelKey)}</p>
                <p className="stat__value">{formatNumber(stat.value)}</p>
                {stat.trend > 0 ? (
                  <p className="stat__trend">
                    {t("dashboard.stat.trend", { count: formatNumber(stat.trend) })}
                  </p>
                ) : (
                  <p className="stat__trend stat__trend--flat">&nbsp;</p>
                )}
              </li>
            ))}
      </ul>
    </section>
  );
}

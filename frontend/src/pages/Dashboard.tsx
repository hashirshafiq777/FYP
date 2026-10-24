import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Banner from "../components/Banner";
import Button from "../components/Button";
import AgreementsList from "../components/dashboard/AgreementsList";
import ConversationsList from "../components/dashboard/ConversationsList";
import DocumentsTable from "../components/dashboard/DocumentsTable";
import QuickActions from "../components/dashboard/QuickActions";
import RiskOverview from "../components/dashboard/RiskOverview";
import StatCards from "../components/dashboard/StatCards";
import { useAuth } from "../auth/useAuth";
import {
  USING_SAMPLE_DATA,
  getDashboardData,
  type DashboardData,
  type DemoMode,
} from "../data/dashboardData";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/useI18n";

const DEMO_MODES: DemoMode[] = ["empty", "error", "loading"];

/** `?demo=empty|error|loading`, honoured in dev builds only. */
function useDemoMode(): DemoMode {
  const [searchParams] = useSearchParams();
  if (!import.meta.env.DEV) return "normal";
  const requested = searchParams.get("demo");
  return DEMO_MODES.includes(requested as DemoMode) ? (requested as DemoMode) : "normal";
}

/** "Ayesha Khan" → "Ayesha". Falls back to the whole string. */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function Dashboard() {
  const { t, formatDate } = useI18n();
  const { user } = useAuth();
  const demo = useDemoMode();
  useDocumentTitle(t("dashboard.documentTitle"));

  // "Today" is captured once per mount: reading `new Date()` during render
  // makes the component impure and the date could change between renders.
  const [today] = useState(() => new Date());

  const [attempt, setAttempt] = useState(0);
  // The result carries the request it belongs to, so a stale response from a
  // previous mode or retry can never be mistaken for the current one — and the
  // loading state is derived rather than set, avoiding a cascading render.
  const [loaded, setLoaded] = useState<{
    key: string;
    data: DashboardData | null;
    failed: boolean;
  } | null>(null);

  const requestKey = `${demo}#${attempt}`;
  const current = loaded?.key === requestKey ? loaded : null;
  const data = current?.data ?? null;
  const failed = current?.failed ?? false;

  useEffect(() => {
    const controller = new AbortController();

    getDashboardData({ mode: demo, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, data: result, failed: false });
        }
      })
      .catch((error: unknown) => {
        // An abort is a navigation, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setLoaded({ key: requestKey, data: null, failed: true });
        }
      });

    return () => controller.abort();
  }, [demo, requestKey]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const name = firstName(user?.full_name ?? "");

  return (
    <div className="dash">
      <header className="dash__header">
        <div>
          <p className="dash__date">{formatDate(today)}</p>
          <h2 className="dash__greeting" dir="auto">
            {t("dashboard.greeting", { name })}
          </h2>
          <p className="dash__sub">{t("dashboard.greetingSub")}</p>
        </div>

        {USING_SAMPLE_DATA ? (
          <span className="sample-badge" title={t("common.sampleDataTitle")}>
            {t("common.sampleData")}
          </span>
        ) : null}
      </header>

      {failed ? (
        <Banner
          tone="error"
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              {t("common.retry")}
            </Button>
          }
        >
          <strong>{t("dashboard.error.title")}</strong>
          <span className="banner__detail">{t("dashboard.error.body")}</span>
        </Banner>
      ) : (
        <>
          <QuickActions />

          <StatCards stats={data?.stats ?? null} />

          <div className="dash__grid">
            <RiskOverview
              risk={data?.risk ?? null}
              categories={data?.categories ?? null}
            />
            <AgreementsList agreements={data?.agreements ?? null} />
          </div>

          <DocumentsTable documents={data?.documents ?? null} />

          <ConversationsList conversations={data?.conversations ?? null} />
        </>
      )}
    </div>
  );
}

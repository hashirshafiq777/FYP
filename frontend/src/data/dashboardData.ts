/**
 * Static dashboard data.
 *
 * Everything here is a placeholder — only the signed-in user's name and email
 * come from the real API (`/auth/me`). The types are deliberately shaped like
 * the responses the backend will eventually return, and the whole thing is
 * served through an async `getDashboardData()` with a real delay, so:
 *
 *   - the loading skeletons are exercised on every visit, not just in theory;
 *   - swapping in a real `fetch` later means changing this one function body.
 *
 * Deliberately avoided: real laws, courts, statutes or any named jurisdiction.
 * The project has not settled on one, and inventing a citation in a legal tool
 * is worse than showing none.
 */

import type { TranslationKey } from "../i18n/en";

/** Flipped to `false` once the dashboard is wired to live endpoints. */
export const USING_SAMPLE_DATA = true;

/** How long the fake request takes. Matches a plausible real round-trip. */
const SIMULATED_LATENCY_MS = 700;

// ------------------------------------------------------------------- types

export type RiskLevel = "high" | "medium" | "low" | "none";
export type DocumentStatus = "ready" | "processing" | "failed";
export type DocumentKind = "contract" | "policy" | "scan" | "agreement";
export type AgreementStatus = "draft" | "inReview" | "exported";
export type AgreementKind = "employment" | "nda" | "service" | "rental";
/** Language of the *content*, independent of the UI language. */
export type ContentLanguage = "en" | "ur";

export interface StatCard {
  id: "documents" | "questions" | "agreements" | "highRisk";
  labelKey: TranslationKey;
  value: number;
  /** Static "+N this week" figure. */
  trend: number;
  /** High-risk is a warning, not an achievement — it is toned differently. */
  tone: "neutral" | "warning";
}

export interface RiskBreakdown {
  high: number;
  medium: number;
  low: number;
}

export interface RiskCategory {
  id: string;
  labelKey: TranslationKey;
  count: number;
  level: Exclude<RiskLevel, "none">;
}

export interface DocumentSummary {
  id: string;
  /** User content — rendered with `dir="auto"`, never translated. */
  name: string;
  language: ContentLanguage;
  kind: DocumentKind;
  /** ISO 8601. Formatted with `Intl` in the active locale. */
  uploadedAt: string;
  status: DocumentStatus;
  risk: RiskLevel;
}

export interface ConversationSummary {
  id: string;
  /** User content. */
  title: string;
  /** User content. */
  snippet: string;
  language: ContentLanguage;
  updatedAt: string;
}

export interface AgreementSummary {
  id: string;
  kind: AgreementKind;
  /** User content: what they named this draft. */
  title: string;
  status: AgreementStatus;
  updatedAt: string;
}

export interface DashboardData {
  stats: StatCard[];
  risk: RiskBreakdown;
  categories: RiskCategory[];
  documents: DocumentSummary[];
  conversations: ConversationSummary[];
  agreements: AgreementSummary[];
}

/** Dev-only states, driven by `?demo=` so the QA cases are reachable. */
export type DemoMode = "normal" | "empty" | "error" | "loading";

// -------------------------------------------------------------- fixtures

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function daysAgo(days: number): string {
  return hoursAgo(days * 24);
}

const SAMPLE: DashboardData = {
  stats: [
    {
      id: "documents",
      labelKey: "dashboard.stat.documents",
      value: 18,
      trend: 3,
      tone: "neutral",
    },
    {
      id: "questions",
      labelKey: "dashboard.stat.questions",
      value: 64,
      trend: 11,
      tone: "neutral",
    },
    {
      id: "agreements",
      labelKey: "dashboard.stat.agreements",
      value: 5,
      trend: 1,
      tone: "neutral",
    },
    {
      id: "highRisk",
      labelKey: "dashboard.stat.highRisk",
      value: 7,
      trend: 2,
      tone: "warning",
    },
  ],

  risk: { high: 7, medium: 14, low: 23 },

  categories: [
    { id: "termination", labelKey: "category.termination", count: 9, level: "high" },
    { id: "payment", labelKey: "category.payment", count: 8, level: "medium" },
    { id: "liability", labelKey: "category.liability", count: 6, level: "high" },
    { id: "penalties", labelKey: "category.penalties", count: 5, level: "medium" },
    { id: "hiddenCharges", labelKey: "category.hiddenCharges", count: 4, level: "low" },
  ],

  documents: [
    {
      id: "doc-1",
      name: "Office Lease — Phase 2.pdf",
      language: "en",
      kind: "contract",
      uploadedAt: hoursAgo(5),
      status: "ready",
      risk: "high",
    },
    {
      id: "doc-2",
      // Urdu-named scanned document: exercises dir="auto" and the Naskh face.
      name: "کرایہ نامہ — اسکین شدہ.pdf",
      language: "ur",
      kind: "scan",
      uploadedAt: daysAgo(2),
      status: "ready",
      risk: "medium",
    },
    {
      id: "doc-3",
      name: "Vendor Service Terms.docx",
      language: "en",
      kind: "contract",
      uploadedAt: daysAgo(4),
      status: "processing",
      risk: "none",
    },
    {
      id: "doc-4",
      name: "Employee Handbook (2026).pdf",
      language: "en",
      kind: "policy",
      uploadedAt: daysAgo(6),
      status: "ready",
      risk: "low",
    },
    {
      id: "doc-5",
      name: "Freelance Retainer — draft 3.docx",
      language: "en",
      kind: "agreement",
      uploadedAt: daysAgo(9),
      status: "failed",
      risk: "none",
    },
    {
      id: "doc-6",
      name: "Privacy Policy — vendor portal.pdf",
      language: "en",
      kind: "policy",
      uploadedAt: daysAgo(13),
      status: "ready",
      risk: "low",
    },
  ],

  conversations: [
    {
      id: "chat-1",
      title: "Can they end the lease early?",
      snippet: "The notice period is 60 days, and there is a penalty if…",
      language: "en",
      updatedAt: hoursAgo(3),
    },
    {
      id: "chat-2",
      title: "کیا اس میں کوئی پوشیدہ فیس ہے؟",
      snippet: "سالانہ نظرثانی کی مد میں ایک اضافی رقم شامل ہے…",
      language: "ur",
      updatedAt: hoursAgo(27),
    },
    {
      id: "chat-3",
      title: "What happens if payment is late?",
      snippet: "A late fee applies after 14 days, calculated monthly…",
      language: "en",
      updatedAt: daysAgo(3),
    },
    {
      id: "chat-4",
      title: "Who is liable for damage?",
      snippet: "Liability is shared, but the cap only protects one side…",
      language: "en",
      updatedAt: daysAgo(8),
    },
  ],

  agreements: [
    {
      id: "agr-1",
      kind: "employment",
      title: "Junior Designer — offer",
      status: "draft",
      updatedAt: hoursAgo(9),
    },
    {
      id: "agr-2",
      kind: "nda",
      title: "Supplier onboarding NDA",
      status: "inReview",
      updatedAt: daysAgo(2),
    },
    {
      id: "agr-3",
      kind: "service",
      title: "Website maintenance retainer",
      status: "exported",
      updatedAt: daysAgo(5),
    },
    {
      id: "agr-4",
      kind: "rental",
      title: "Storage unit — 12 months",
      status: "draft",
      updatedAt: daysAgo(11),
    },
  ],
};

const EMPTY: DashboardData = {
  stats: SAMPLE.stats.map((stat) => ({ ...stat, value: 0, trend: 0 })),
  risk: { high: 0, medium: 0, low: 0 },
  categories: [],
  documents: [],
  conversations: [],
  agreements: [],
};

// ----------------------------------------------------------------- loader

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Replace this body with a real request when the endpoint exists:
 *
 *   return request<DashboardData>("/dashboard", { auth: true, signal });
 *
 * Nothing else in the dashboard needs to change — the components consume
 * `DashboardData`, not this module's internals.
 */
export async function getDashboardData(
  options: { mode?: DemoMode; signal?: AbortSignal } = {},
): Promise<DashboardData> {
  const { mode = "normal", signal } = options;

  if (mode === "loading") {
    // Never resolves: used to inspect the skeleton state.
    await delay(Number.MAX_SAFE_INTEGER, signal);
  }

  await delay(SIMULATED_LATENCY_MS, signal);

  if (mode === "error") {
    throw new Error("Simulated dashboard failure");
  }

  return mode === "empty" ? EMPTY : SAMPLE;
}

export function totalFlaggedClauses(risk: RiskBreakdown): number {
  return risk.high + risk.medium + risk.low;
}

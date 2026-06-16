/**
 * Phase 5.0 — /design-match/plan-v3
 *
 * Plan d'Action V3 — page autonome, langage visuel strictement aligné
 * sur dashboard-v3 et coach-v3 (références officielles verrouillées).
 *
 * Structure (3 colonnes) :
 *   Sidebar 280  ·  Main 1fr  ·  Right rail 320
 *
 * Main column (top → bottom) :
 *   PlanHeaderCard   ·  MissionCard navy  ·  RoadmapCard
 *   BottomRow (Projection · Actions semaine · Levier identifié)
 *
 * Right rail :
 *   ProgressionGlobale · ImpactPlan · ConseillerRecommande · ActionsRapides
 *
 * Hauteurs cibles ≈ 868 px (cap 900 viewport). Page locked (overflow
 * hidden), right rail scrollable interne si besoin.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { getActivePlan } from "@/lib/services/plan";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { formatUserCurrency } from "@/lib/utils";
import type { DrawerData } from "@/lib/calculations/health/types";
import type { FinancialPlanStep } from "@/types/database";
import { V3TopbarMenu } from "@/components/layout/v3-topbar-menu";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return { title: `${t("plan")} — LIBERIA` };
}

const C = {
  navy: "#011E5F",
  navyDeeper: "#011559",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#F2F4F8",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  notifBadge: "#7FA2E6",
  success: "#10A37F",
  successBg: "#ECFDF5",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  gold: "#FBBF24",
  goldSoft: "#FCD34D",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

/* ═══════════════ HELPERS & TYPES ═══════════════ */

/** Auth lookup — calqué sur dashboard-v3 / mon-analyse-v3. */
async function getCurrentAuthUser(): Promise<{
  id: string;
  created_at: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, created_at: user.created_at ?? null };
  } catch {
    return null;
  }
}

const MAJOR_AREAS = ["income", "housing", "insurance", "food", "transport"] as const;

/** Sous-ensemble des props que les cartes du Main + Right Rail consomment. */
type PlanWiredProps = {
  scoreDisplay: number | null;
  priorityTitle: string | null;
  priorityHref: string;
  missionTitle: string | null;
  missionSubline: string | null;
  primaryGoalLabel: string | null;
  primaryGoalCurrent: number | null;
  primaryGoalTarget: number | null;
  hasActivePlan: boolean;
  totalSteps: number;
  completedSteps: number;
  progressionPct: number | null;
  next3Steps: FinancialPlanStep[];
  topImpactStep: FinancialPlanStep | null;
  planSummary: string | null;
  runwayMonths: number | null;
  monthlyExpenses: number;
  monthlyIncome: number;
  filledMajorAreasCount: number;
  hasGoals: boolean;
  hasOneMonthCushion: boolean;
  hasThreeMonthCushion: boolean;
  currency: string;
  locale: string | null;
  country: string | null;
};

function formatMoney(
  amount: number,
  profile: { currency?: string | null; locale?: string | null; country?: string | null },
): string {
  return formatUserCurrency(amount, profile);
}

const H = {
  topbar: 60,
  planHeader: 56,
  mission: 148,
  roadmap: 232,
  bottomRow: 220,
  gap: 6,
  rightCardGap: 6,
};

export default async function DesignMatchPlanV3() {
  /* ------------------------------------------------------------------ */
  /*  Data fetch                                                         */
  /* ------------------------------------------------------------------ */

  const [data, authedUser, activePlan] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
    getActivePlan(),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Agrégats finance (alignés sur dashboard-v3)                        */
  /* ------------------------------------------------------------------ */

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const monthlyExpenses = fixedExpenses + variableExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses,
  });
  const runwayRaw = calculateRunway({
    currentSavings,
    monthlyExpenses,
  });
  const runwayMonths =
    Number.isFinite(runwayRaw) && monthlyExpenses > 0 ? runwayRaw : null;

  /* ------------------------------------------------------------------ */
  /*  Mission — buildFirstMission (même moteur que Dashboard)            */
  /* ------------------------------------------------------------------ */

  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoals = data.goals.filter((g) => !g.is_completed);
  const activeGoalsCount = activeGoals.length;
  const primaryGoal = activeGoals[0] ?? null;

  /* ------------------------------------------------------------------ */
  /*  FHS drawer                                                         */
  /* ------------------------------------------------------------------ */

  let drawerData: DrawerData | null = null;
  if (!data.isDemo && authedUser?.id) {
    try {
      const extras = await gatherExtraSignals({
        userId: authedUser.id,
        financeData: data,
        accountCreatedAt: authedUser.created_at ?? null,
      });
      drawerData = await getOrSealDrawerData({
        userId: authedUser.id,
        financeData: data,
        extras,
      });
    } catch (err) {
      console.error("[plan-v3] FHS drawer compute failed", err);
    }
  }

  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: runwayMonths ?? 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    monthlyIncome,
    recommendation: drawerData?.recommendation ?? null,
  });

  /* ------------------------------------------------------------------ */
  /*  i18n résolu serveur                                                */
  /* ------------------------------------------------------------------ */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tPriority = (await getTranslations("dashboard.priorityCard.title")) as (
    key: string,
  ) => string;
  const tMission = (await getTranslations("dashboard.missionCard")) as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const priorityTitle = tPriority(firstMission.priority);
  const missionTitle = tMission(`${firstMission.priority}.title`, firstMission.payload);
  const missionSubline = tMission(
    `${firstMission.priority}.subline`,
    firstMission.payload,
  );

  /* ------------------------------------------------------------------ */
  /*  Plan actif — étapes réelles                                        */
  /* ------------------------------------------------------------------ */

  const steps = activePlan?.steps ?? [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.is_completed).length;
  const progressionPct =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : null;
  const next3Steps = steps.filter((s) => !s.is_completed).slice(0, 3);
  const topImpactStep =
    steps
      .filter((s) => !s.is_completed && (s.expected_impact_eur ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.expected_impact_eur ?? 0) - (a.expected_impact_eur ?? 0),
      )[0] ?? null;
  const planSummary = activePlan?.plan.summary?.trim() || null;

  /* ------------------------------------------------------------------ */
  /*  Props prêtes pour les sous-composants                              */
  /* ------------------------------------------------------------------ */

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  // Eslint silencieux : on garde les calculs partagés (cashflow, fixedExpenses)
  // pour cohérence avec les autres pages V3 même s'ils ne sont pas
  // tous repris dans le rendu actuel.
  void cashflow;
  void fixedExpenses;
  void variableExpenses;

  const wired: PlanWiredProps = {
    scoreDisplay: drawerData?.score.display ?? null,
    priorityTitle,
    priorityHref: firstMission.ctaHref,
    missionTitle,
    missionSubline,
    primaryGoalLabel: primaryGoal?.title?.trim() || null,
    primaryGoalCurrent: primaryGoal?.current_amount ?? null,
    primaryGoalTarget: primaryGoal?.target_amount ?? null,
    hasActivePlan: activePlan !== null,
    totalSteps,
    completedSteps,
    progressionPct,
    next3Steps,
    topImpactStep,
    planSummary,
    runwayMonths,
    monthlyExpenses,
    monthlyIncome,
    filledMajorAreasCount,
    hasGoals: activeGoalsCount > 0,
    hasOneMonthCushion: runwayMonths !== null && runwayMonths >= 1,
    hasThreeMonthCushion: runwayMonths !== null && runwayMonths >= 3,
    currency: data.profile.currency,
    locale: data.profile.locale ?? null,
    country: data.profile.country ?? null,
  };

  return (
    <>
      {/* Responsive global :
          - Desktop ≥ 1200 : layout 3 colonnes complet (default inline styles)
          - Laptop 1000-1200 : padding réduit, gap réduit
          - Tablet 768-999 : sidebar cachée, right rail stack
          - Mobile < 768 : single column
          Tous ces overrides utilisent !important pour battre les
          styles inline. */}
      <style>{`
        @media (max-width: 1200px) {
          [data-plan-main] {
            padding: 0 20px 12px 20px !important;
            gap: 20px !important;
          }
          [data-plan-right] { width: 280px !important; }
          [data-plan-grid-cols] { grid-template-columns: minmax(0, 1fr) 280px !important; }
        }
        @media (max-width: 999px) {
          [data-plan-sidebar] { display: none !important; }
          [data-plan-content] { margin-left: 0 !important; }
          [data-plan-grid-cols] { grid-template-columns: 1fr !important; }
          [data-plan-right] { width: auto !important; }
          [data-plan-main] { padding: 0 16px 16px 16px !important; }
        }
        @media (max-width: 767px) {
          [data-plan-topbar] { padding: 0 16px !important; }
          [data-plan-bottom-row] { grid-template-columns: 1fr !important; }
          [data-plan-roadmap-grid] { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          /* Très petit écran (iPhone SE 1 = 320 px) : le
             PlanHeaderCard avec 3 HeaderMetric en flex-row ne tient
             pas même avec wrap. PlanHeaderCard est à 2 niveaux
             dans la hiérarchie (data-plan-main > MainColumn > Card).
             On force la card entière en column. */
          [data-plan-main] > div:first-of-type > div:first-of-type {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          /* Le sub-flex des 3 HeaderMetric (2e enfant du
             PlanHeaderCard, contenant les metrics avec gap:16
             flex-shrink:0) passe aussi en column. */
          [data-plan-main] > div:first-of-type > div:first-of-type > div:last-of-type {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
            gap: 8px !important;
          }
          [data-plan-roadmap-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <MobileNav />
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-plan-sidebar>
          <Sidebar />
        </div>
        <div data-plan-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-plan-main
            data-plan-grid-cols
            style={{
              padding: "0 24px 8px 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 296px",
              gap: 20,
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <MainColumn wired={wired} />
            <div data-plan-right>
              <RightRail wired={wired} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Plan d'action actif) ═══════════════ */

function Sidebar() {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 280,
        backgroundColor: C.cardBg,
        borderRight: `1px solid ${C.borderGhost}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 24px 20px 24px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            backgroundColor: C.navy,
            borderRadius: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span style={{ color: C.navy, letterSpacing: "0.16em", fontSize: 15, fontWeight: 700 }}>
          LIBERIA
        </span>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        <NavSection title="PRINCIPAL">
          <NavItem label="Tableau de bord" href="/design-match/dashboard-v3" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" />
          <NavItem label="Coach IA" href="/design-match/coach-v3" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <NavItem label="Mon analyse" href="/design-match/mon-analyse-v3" iconPath="M22 12h-4l-3 9L9 3l-3 9H2" />
          <NavItem label="Plan d'action" href="/design-match/plan-v3" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" active />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" href="/design-match/revenus-v3" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" />
          <NavItem label="Dépenses" href="/design-match/depenses-v3" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" href="/design-match/budget-v3" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" />
          <NavItem label="Objectifs" href="/design-match/objectifs-v3" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" href="/design-match/profil-v3" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </NavSection>
      </nav>
      <div style={{ padding: 12 }}>
        <div
          style={{
            padding: 16,
            backgroundColor: C.cardBg,
            borderRadius: 12,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gold}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark, letterSpacing: "0.04em" }}>
              LIBERIA PREMIUM
            </span>
          </div>
          <p style={{ marginTop: 8, fontSize: 11.5, color: C.textMuted, lineHeight: 1.45 }}>
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <Link
            href="/settings/subscription"
            style={{
              display: "block",
              textAlign: "center",
              width: "100%",
              marginTop: 12,
              padding: "8px 12px",
              border: "none",
              backgroundColor: C.pageBg,
              fontSize: 12,
              fontWeight: 500,
              color: C.textDark,
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Gérer mon abonnement
          </Link>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          padding: "8px 12px 6px 12px",
          fontSize: 10.5,
          fontWeight: 600,
          color: C.textLight,
          letterSpacing: "0.16em",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function NavItem({
  label,
  href,
  iconPath,
  iconCircle,
  active = false,
}: {
  label: string;
  href: string;
  iconPath: string;
  iconCircle?: boolean;
  active?: boolean;
}) {
  const paths = iconPath.split("|");
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        backgroundColor: active ? C.primaryBg : "transparent",
        borderRadius: 8,
        marginBottom: 1,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          backgroundColor: active ? C.primary : "#F1F5F9",
          borderRadius: 6,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {iconCircle && <circle cx="12" cy="12" r="10" />}
          {paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? C.textDark : C.textMuted,
        }}
      >
        {label}
      </span>
    </Link>
  );
}
/* ═══════════════ TOPBAR ═══════════════ */

function Topbar({
  firstName,
  fullName,
}: {
  firstName: string | null;
  fullName: string | null;
}) {
  const displayName = firstName ?? "";
  return (
    <header
      data-plan-topbar
      style={{
        height: 68,
        padding: "0 42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0 }}>
          Bonjour {displayName} <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: C.textMuted, margin: "4px 0 0 0" }}>
          Voici votre plan d&apos;action personnalisé pour atteindre vos objectifs.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <V3TopbarMenu fullName={fullName} />
      </div>
    </header>
  );
}
/* ═══════════════ MAIN COLUMN ═══════════════ */

function MainColumn({ wired }: { wired: PlanWiredProps }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: H.gap }}>
      <PlanHeaderCard wired={wired} />
      <MissionCard wired={wired} />
      <RoadmapCard wired={wired} />
      <BottomRow wired={wired} />
    </div>
  );
}

/* ═══════════════ PLAN HEADER CARD ═══════════════ */

function PlanHeaderCard({ wired }: { wired: PlanWiredProps }) {
  const scoreLabel = wired.scoreDisplay !== null ? String(wired.scoreDisplay) : "—";
  const priorityLabel = wired.priorityTitle ?? "Non disponible";
  const progressionValue =
    wired.progressionPct !== null ? `${wired.progressionPct} %` : "—";
  return (
    <div
      style={{
        minHeight: H.planHeader,
        padding: "11px 20px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 22,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          Votre plan financier personnalisé
        </h2>
        <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.textMuted, lineHeight: 1.35 }}>
          Basé sur votre situation actuelle, vos objectifs et vos priorités.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <HeaderMetric
          label="Score actuel"
          value={scoreLabel}
          unit={wired.scoreDisplay !== null ? "/ 100" : undefined}
          iconNode={<ScoreMiniRing scoreDisplay={wired.scoreDisplay} />}
        />
        <HeaderMetric
          label="Priorité actuelle"
          value={priorityLabel}
          iconNode={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.coralBg,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
          }
        />
        <HeaderMetric
          label="Progression du plan"
          value={progressionValue}
          iconNode={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.successBg,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
          }
          progress={wired.progressionPct ?? undefined}
        />
      </div>
    </div>
  );
}

function ScoreMiniRing({ scoreDisplay }: { scoreDisplay: number | null }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const ratio = scoreDisplay !== null ? Math.min(1, Math.max(0, scoreDisplay / 100)) : 0;
  const offset = c * (1 - ratio);
  return (
    <span style={{ display: "inline-flex", width: 30, height: 30, position: "relative" }}>
      <svg viewBox="0 0 30 30" width={30} height={30}>
        <circle cx="15" cy="15" r={r} fill="none" stroke={C.primaryBg} strokeWidth="3" />
        <circle
          cx="15"
          cy="15"
          r={r}
          fill="none"
          stroke={C.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${c.toFixed(2)} ${c.toFixed(2)}`}
          strokeDashoffset={offset.toFixed(2)}
          transform="rotate(-90 15 15)"
        />
      </svg>
    </span>
  );
}

function HeaderMetric({
  label,
  value,
  unit,
  iconNode,
  progress,
}: {
  label: string;
  value: string;
  unit?: string;
  iconNode: React.ReactNode;
  progress?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {iconNode}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.3, letterSpacing: "0.01em" }}>
          {label}
        </span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, marginTop: 1 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.textDark,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.015em",
              lineHeight: 1.15,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 500 }}>{unit}</span>
          )}
        </span>
        {progress !== undefined && (
          <span
            style={{
              marginTop: 4,
              display: "block",
              width: 90,
              height: 3,
              borderRadius: 999,
              backgroundColor: C.successBg,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <span style={{ display: "block", width: `${progress}%`, height: "100%", backgroundColor: C.success }} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ MISSION CARD ═══════════════ */

function MissionCard({ wired }: { wired: PlanWiredProps }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };

  // Mission title + subline 100% pilotés par buildFirstMission / i18n.
  const title = wired.missionTitle ?? "Mission en cours de définition";
  const subline = wired.missionSubline ?? "Complétez votre profil pour révéler votre prochaine étape.";

  // Bloc Objectif + Progression : utilise primaryGoal SI il existe.
  // Sinon empty state honnête (pas de fausse barre 3% qui ment).
  const hasGoal =
    wired.primaryGoalLabel !== null &&
    wired.primaryGoalTarget !== null &&
    wired.primaryGoalTarget > 0;
  const goalCurrent = wired.primaryGoalCurrent ?? 0;
  const goalTarget = wired.primaryGoalTarget ?? 0;
  const goalPct = hasGoal
    ? Math.min(100, Math.max(0, Math.round((goalCurrent / goalTarget) * 100)))
    : 0;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden", // garde le clip pour le glow + bouclier décoratif uniquement
        minHeight: H.mission,
        padding: "14px 18px",
        backgroundColor: C.navy,
        borderRadius: 18,
        boxShadow: SHADOW.navy,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Décision design : suppression du bouclier décoratif
          (était "ni visible ni invisible") au profit d'un glow
          ambient subtil unique — même langage que dashboard-v3
          ScoreCard et coach-v3 SituationCard. La décoration est
          désormais cohérente avec le système et ne concurrence
          plus aucun chiffre. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      {/* Bouclier décoratif top-right — visible dans la maquette
          de référence. Opacity 0.18 et taille 120 px alignés sur
          la maquette. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 18,
          top: 12,
          width: 84,
          height: 84,
          pointerEvents: "none",
          opacity: 0.18,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={C.gold}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.82)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Mission prioritaire
          </span>
        </div>
        <h3
          style={{
            margin: "6px 0 0 0",
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.18,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h3>
        <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
          {subline}
        </p>
      </div>
      {/* Footer row : OBJECTIF + PROGRESSION à gauche, CTA à droite.
          marginTop:auto pousse la row en bas ; alignItems:center
          réintègre le CTA dans le flux (axe vertical aligné avec
          les valeurs progression). */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 26, flex: 1, minWidth: 0 }}>
          <div style={{ flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Objectif
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: 13.5, fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>
              {hasGoal ? wired.primaryGoalLabel : "Non défini"}
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 360 }}>
            <p
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Progression
            </p>
            {hasGoal ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "white", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {formatMoney(goalCurrent, profile)}{" "}
                    <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                      / {formatMoney(goalTarget, profile)}
                    </span>
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
                    {goalPct} %
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.16)",
                    overflow: "hidden",
                  }}
                  role="progressbar"
                  aria-valuenow={goalPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div style={{ width: `${goalPct}%`, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
                </div>
              </>
            ) : (
              <p
                style={{
                  margin: "6px 0 0 0",
                  fontSize: 11.5,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.35,
                }}
              >
                Définissez un objectif pour suivre votre progression.
              </p>
            )}
          </div>
        </div>
        <Link
          href={wired.priorityHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            backgroundColor: "white",
            color: C.navy,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 6px -2px rgba(0, 0, 0, 0.10)",
            textDecoration: "none",
          }}
        >
          Continuer cette mission
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════ ROADMAP CARD ═══════════════ */

function RoadmapCard({ wired }: { wired: PlanWiredProps }) {
  // Roadmap = récit produit en 4 phases (kept). Les états des tâches de
  // Phase 1 dérivent des métriques réelles ; Phases 2-4 restent "todo"
  // (jalons futurs non trackés).
  const allMajorFilled = wired.filledMajorAreasCount >= MAJOR_AREAS.length;
  const expenseTaskState: "done" | "active" | "todo" =
    allMajorFilled ? "done" : wired.filledMajorAreasCount > 0 ? "active" : "todo";
  const goalTaskState: "done" | "active" | "todo" = wired.hasGoals
    ? "done"
    : "todo";
  const oneMonthState: "done" | "active" | "todo" = wired.hasOneMonthCushion
    ? "done"
    : wired.runwayMonths !== null && wired.runwayMonths > 0
      ? "active"
      : "todo";
  const threeMonthState: "done" | "active" | "todo" = wired.hasThreeMonthCushion
    ? "done"
    : wired.hasOneMonthCushion
      ? "active"
      : "todo";
  const phase1Done = [
    expenseTaskState,
    goalTaskState,
    oneMonthState,
    threeMonthState,
  ].every((s) => s === "done");
  const phase1Started = [
    expenseTaskState,
    goalTaskState,
    oneMonthState,
    threeMonthState,
  ].some((s) => s !== "todo");
  const phase1Variant: "done" | "active" | "future" = phase1Done
    ? "done"
    : phase1Started
      ? "active"
      : "future";
  return (
    <div
      style={{
        minHeight: H.roadmap,
        padding: "10px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        Votre feuille de route
      </h2>

      {/* Rail icônes — compression supplémentaire (36 → 32 px,
          icons 32 → 28). Marges 12 → 10 sur les 2 axes du rail.
          Connecteur : ligne pleine au lieu du dashed dashboard-v3
          (plan = chemin progressif). 25 % du tracé en primary
          (Phase 1 done, 4 colonnes équilibrées). */}
      <div style={{ position: "relative", marginTop: 6, height: 28 }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "12.5%",
            right: "12.5%",
            top: 13,
            height: 2,
            background: `linear-gradient(to right, ${C.primary} 0%, ${C.primary} 25%, ${C.borderGhost} 25%, ${C.borderGhost} 100%)`,
            borderRadius: 999,
          }}
        />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: "100%" }}>
          <PhaseHead
            variant={phase1Variant}
            icon={phase1Variant === "done" ? "check" : "chart"}
          />
          <PhaseHead variant="future" icon="chart" />
          <PhaseHead variant="future" icon="rocket" />
          <PhaseHead variant="future" icon="home" />
        </div>
      </div>

      <div data-plan-roadmap-grid style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 8 }}>
        <PhaseColumn
          phase="Phase 1"
          title="Sécuriser"
          duration="3 mois"
          tasks={[
            {
              label: "Ajouter toutes les dépenses",
              state: expenseTaskState,
              note:
                expenseTaskState === "active"
                  ? `${wired.filledMajorAreasCount}/${MAJOR_AREAS.length} catégories`
                  : undefined,
            },
            { label: "Définir un objectif", state: goalTaskState },
            {
              label: "Construire 1 mois d'urgence",
              state: oneMonthState,
              note:
                oneMonthState === "active"
                  ? "En cours"
                  : oneMonthState === "todo"
                    ? "À faire"
                    : undefined,
            },
            {
              label: "Construire 3 mois d'urgence",
              state: threeMonthState,
              note: threeMonthState === "todo" ? "À faire" : undefined,
            },
          ]}
        />
        <PhaseColumn
          phase="Phase 2"
          title="Optimiser"
          duration="3-6 mois"
          tasks={[
            { label: "Réduire les dépenses inutiles", state: "todo" },
            { label: "Automatiser l'épargne", state: "todo" },
            { label: "Optimiser les abonnements", state: "todo" },
          ]}
        />
        <PhaseColumn
          phase="Phase 3"
          title="Accélérer"
          duration="6-24 mois"
          tasks={[
            { label: "Augmenter les revenus", state: "todo" },
            { label: "Construire une réserve long terme", state: "todo" },
            { label: "Développer vos compétences", state: "todo" },
          ]}
        />
        <PhaseColumn
          phase="Phase 4"
          title="Investir"
          duration="2 ans et +"
          tasks={[
            { label: "Commencer les investissements", state: "todo" },
            { label: "Diversifier", state: "todo" },
            { label: "Construire le patrimoine", state: "todo" },
          ]}
        />
      </div>
    </div>
  );
}

function PhaseHead({ variant, icon }: { variant: "done" | "active" | "future"; icon: "check" | "chart" | "rocket" | "home" }) {
  const fill =
    variant === "done" ? C.primary : variant === "active" ? "white" : "white";
  const stroke =
    variant === "done" ? "white" : C.primary;
  const ring =
    variant === "done"
      ? "none"
      : variant === "active"
        ? `2px solid ${C.primary}`
        : `1.5px solid ${C.borderGhost}`;
  const strokeFuture = variant === "future" ? C.textLight : C.primary;
  const SIZE = 24;
  const ICON = 12;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: SIZE,
          height: SIZE,
          borderRadius: 999,
          backgroundColor: fill,
          border: ring === "none" ? "none" : ring,
          boxShadow:
            variant === "done"
              ? "0 0 0 4px rgba(37, 99, 235, 0.12)"
              : variant === "active"
                ? "0 0 0 4px rgba(37, 99, 235, 0.10)"
                : "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {icon === "check" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {icon === "chart" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        )}
        {icon === "rocket" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        )}
        {icon === "home" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </span>
    </div>
  );
}

function PhaseColumn({
  phase,
  title,
  duration,
  tasks,
}: {
  phase: string;
  title: string;
  duration: string;
  tasks: { label: string; state: "done" | "active" | "todo"; note?: string }[];
}) {
  return (
    <div
      style={{
        padding: "6px 10px",
        backgroundColor: C.pageBg,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textLight, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {phase}
      </p>
      <p
        style={{
          margin: "1px 0 0 0",
          fontSize: 12.5,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </p>
      <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.3 }}>
        Durée estimée&nbsp;: {duration}
      </p>
      <ul style={{ marginTop: 6, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
        {tasks.map((t) => (
          <li key={t.label} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <TaskBullet state={t.state} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 500,
                  color: C.textDark,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {t.label}
              </p>
              {t.note && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 9,
                    color: t.state === "active" ? C.primary : C.textLight,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {t.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaskBullet({ state }: { state: "done" | "active" | "todo" }) {
  if (state === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: 999,
          backgroundColor: C.success,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: 999,
          backgroundColor: "white",
          border: `2px solid ${C.primary}`,
          flexShrink: 0,
          marginTop: 1,
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: 999,
        border: `1.5px solid ${C.borderGhost}`,
        backgroundColor: "white",
        flexShrink: 0,
        marginTop: 1,
      }}
    />
  );
}

/* ═══════════════ BOTTOM ROW ═══════════════ */

function BottomRow({ wired }: { wired: PlanWiredProps }) {
  return (
    <div data-plan-bottom-row style={{ minHeight: H.bottomRow, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <ProjectionCard wired={wired} />
      <ActionsSemaineCard wired={wired} />
      <LevierCard wired={wired} />
    </div>
  );
}

function ProjectionCard({ wired }: { wired: PlanWiredProps }) {
  // Empty state honnête : aucun moteur de projection 3/6/12 mois fiable
  // n'existe encore (pas de modèle Monte Carlo, pas de simulateur calibré).
  // On affiche le score actuel sans inventer une trajectoire 46→78.
  const scoreLabel =
    wired.scoreDisplay !== null ? `${wired.scoreDisplay} / 100` : "Score en construction";
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Votre point de départ
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
        }}
      >
        Projection de votre score
      </p>
      <div
        style={{
          marginTop: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "10px 6px",
          backgroundColor: C.pageBg,
          borderRadius: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            marginBottom: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {scoreLabel}
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
          Aucune projection 3/6/12 mois fiable disponible. Complétez vos étapes pour faire évoluer ce score.
        </p>
      </div>
      <Link
        href="/design-match/mon-analyse-v3"
        style={{
          marginTop: 8,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11.5,
          fontWeight: 600,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Voir mon analyse
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function ActionsSemaineCard({ wired }: { wired: PlanWiredProps }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };
  const actions = wired.next3Steps;
  const hasActions = actions.length > 0;
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Cette semaine
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
        }}
      >
        Vos 3 prochaines actions
      </p>
      {hasActions ? (
        <>
          <div style={{ marginTop: 10, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {actions.map((step, idx) => {
              const impactValue = step.expected_impact_eur;
              const impactLabel =
                impactValue !== null && impactValue > 0
                  ? `+${formatMoney(impactValue, profile)} estimés`
                  : step.focus || step.category || null;
              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 8px",
                    borderRadius: 10,
                    backgroundColor: C.pageBg,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      backgroundColor: C.primary,
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "Outfit, Inter, system-ui",
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3, wordBreak: "break-word" }}>
                      {step.title}
                    </p>
                    {impactLabel && (
                      <p style={{ margin: "1px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}>
                        {impactValue !== null && impactValue > 0 ? "Impact" : "Axe"}
                        &nbsp;:{" "}
                        <span style={{ color: C.success, fontWeight: 600 }}>{impactLabel}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            href="/plan"
            style={{
              marginTop: 10,
              padding: 0,
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12.5,
              fontWeight: 600,
              color: C.primary,
              textDecoration: "none",
            }}
          >
            Voir toutes les actions
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </>
      ) : (
        // Sprint S1 — état "aucune action planifiée" enrichi : on sert
        // la priorité du moment (issue de buildFirstMission, même moteur
        // que le dashboard) comme étape #1 actionnable et on cite 2
        // actions canoniques de démarrage. Plus de "Aucune action" sec.
        <div style={{ marginTop: 10, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <PlannerSeedAction
            rank={1}
            tone="primary"
            title={wired.priorityTitle ?? "Identifier ta priorité du moment"}
            detail="Démarre par cette priorité — ton coach peut détailler les sous-étapes."
            href="/coach"
            cta="Détailler avec le coach"
          />
          <PlannerSeedAction
            rank={2}
            tone="neutral"
            title="Consolider un fonds d'urgence de 3 mois"
            detail="C'est l'action #1 de toute trajectoire financière saine."
            href="/design-match/epargne-v3"
            cta="Voir mon épargne"
          />
          <PlannerSeedAction
            rank={3}
            tone="neutral"
            title="Définir un objectif chiffré sur 90 jours"
            detail="Un objectif clair vaut dix bonnes intentions."
            href="/design-match/objectifs-v3"
            cta="Mes objectifs"
          />
        </div>
      )}
    </div>
  );
}

function LevierCard({ wired }: { wired: PlanWiredProps }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };
  const step = wired.topImpactStep;
  // Levier = étape du plan avec le plus gros expected_impact_eur.
  // Le "gain annuel potentiel" est l'impact mensuel × 12 (cohérent
  // avec la modélisation expected_impact_eur côté plan-generator).
  if (step && step.expected_impact_eur !== null && step.expected_impact_eur > 0) {
    const annualGain = step.expected_impact_eur * 12;
    return (
      <div
        style={{
          position: "relative",
          padding: "14px 16px",
          backgroundColor: C.cardBg,
          borderRadius: 16,
          boxShadow: SHADOW.card,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Le plus gros levier identifié
        </p>
        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 15,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
          }}
        >
          {step.title}
        </p>
        <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: C.textMuted, lineHeight: 1.4 }}>
          Impact mensuel&nbsp;:{" "}
          <span style={{ color: C.success, fontWeight: 700 }}>
            +{formatMoney(step.expected_impact_eur, profile)}
          </span>
        </p>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            backgroundColor: C.successBg,
            borderRadius: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.success, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Gain annuel potentiel
            </p>
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: 17,
                fontWeight: 700,
                color: C.success,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMoney(annualGain, profile)}
            </p>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <Link
          href="/coach"
          style={{
            marginTop: "auto",
            padding: "10px 14px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: C.navy,
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          En parler au coach
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    );
  }

  // Empty state premium : aucun levier chiffré disponible.
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Le plus gros levier identifié
      </p>
      <div
        style={{
          marginTop: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "10px 6px",
          backgroundColor: C.pageBg,
          borderRadius: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.successBg,
            marginBottom: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Pas de levier chiffré
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
          Générez un plan pour identifier votre levier financier le plus impactant.
        </p>
      </div>
      <Link
        href="/coach"
        style={{
          marginTop: 10,
          padding: "10px 14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        En parler au coach
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ RIGHT RAIL ═══════════════ */

function RightRail({ wired }: { wired: PlanWiredProps }) {
  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: H.rightCardGap,
        minWidth: 0,
      }}
    >
      <ProgressionGlobaleCard wired={wired} />
      <ImpactPlanCard wired={wired} />
      <ConseillerRecommandeCard wired={wired} />
      <ActionsRapidesRailCard />
    </aside>
  );
}

function ProgressionGlobaleCard({ wired }: { wired: PlanWiredProps }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = wired.progressionPct ?? 0;
  const ratio = Math.min(1, Math.max(0, pct / 100));
  const offset = c * (1 - ratio);
  const ringLabel = wired.progressionPct !== null ? `${wired.progressionPct} %` : "—";
  const stateLabel = wired.hasActivePlan ? "Plan en cours" : "Aucun plan actif";
  const subLabel = wired.hasActivePlan
    ? `${wired.completedSteps} étape${wired.completedSteps > 1 ? "s" : ""} sur ${wired.totalSteps} complétée${wired.completedSteps > 1 ? "s" : ""}`
    : "3 actions de démarrage proposées. Génère ton plan personnalisé avec le coach.";
  return (
    <div
      style={{
        padding: "9px 11px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Progression globale
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 7 }}>
        <div style={{ flexShrink: 0, width: 52, height: 52, position: "relative" }}>
          <svg viewBox="0 0 52 52" width={52} height={52}>
            <circle cx="26" cy="26" r={r} fill="none" stroke={C.primaryBg} strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              stroke={C.primary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${c.toFixed(2)} ${c.toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform="rotate(-90 26 26)"
            />
            <text x="26" y="30" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={C.textDark} fontFamily="Outfit, Inter, system-ui" letterSpacing="-0.02em">
              {ringLabel}
            </text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.textDark, lineHeight: 1.25 }}>
            {stateLabel}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>
            {subLabel}
          </p>
        </div>
      </div>
      <Link
        href={wired.hasActivePlan ? "/plan" : "/coach"}
        style={{
          marginTop: 8,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        {wired.hasActivePlan ? "Voir le détail" : "Générer un plan"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function ImpactPlanCard({ wired }: { wired: PlanWiredProps }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };
  // Faits observables aujourd'hui (sans projection 12 mois inventée) :
  // revenu / dépenses mensuels effectifs, sécurité (runway), étapes plan.
  const rows: { label: string; value: string; bg: string; color: string; iconPath: string }[] = [];
  if (wired.monthlyIncome > 0) {
    rows.push({
      label: "Revenu mensuel",
      value: formatMoney(wired.monthlyIncome, profile),
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    });
  }
  if (wired.monthlyExpenses > 0) {
    rows.push({
      label: "Dépenses mensuelles",
      value: formatMoney(wired.monthlyExpenses, profile),
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    });
  }
  if (wired.runwayMonths !== null) {
    rows.push({
      label: "Sécurité financière",
      value: `${wired.runwayMonths.toFixed(1)} mois`,
      bg: C.amberBg,
      color: C.amber,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    });
  }
  if (wired.hasActivePlan && wired.totalSteps > 0) {
    rows.push({
      label: "Étapes complétées",
      value: `${wired.completedSteps} / ${wired.totalSteps}`,
      bg: C.successBg,
      color: C.success,
      iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4 12 14.01 9 11.01",
    });
  }
  const hasRows = rows.length > 0;
  return (
    <div
      style={{
        padding: "8px 12px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Votre situation
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textLight }}>Faits observés aujourd&apos;hui</p>
      {hasRows ? (
        <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 4 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: r.bg,
                  flexShrink: 0,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  {r.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.2 }}>
                  {r.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: C.textDark,
                    fontFamily: "Outfit, Inter, system-ui",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {r.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.35 }}>
          Complétez vos revenus et dépenses pour révéler votre situation.
        </p>
      )}
    </div>
  );
}

function ConseillerRecommandeCard({ wired }: { wired: PlanWiredProps }) {
  // Source de vérité : plan.summary du plan actif si présent.
  // Sinon recommandation honnête basée sur la mission.
  const recommendation =
    wired.planSummary ??
    wired.missionSubline ??
    "Complétez votre profil financier pour révéler votre prochaine étape.";
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Votre conseiller recommande
      </p>
      <p
        style={{
          margin: "5px 0 0 0",
          fontSize: 11.5,
          color: C.textDark,
          lineHeight: 1.25,
          fontStyle: "italic",
        }}
      >
        «&nbsp;{recommendation}&nbsp;»
      </p>
      <Link
        href="/coach"
        style={{
          marginTop: 6,
          width: "100%",
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: C.primaryBg,
          color: C.primary,
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler au coach IA
      </Link>
    </div>
  );
}

function ActionsRapidesRailCard() {
  const items: {
    title: string;
    href: string;
    bg: string;
    color: string;
    iconPath: string;
  }[] = [
    {
      title: "Voir le tableau de bord",
      href: "/dashboard",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M22 7L13.5 15.5 8.5 10.5 2 17|M17 7 22 7 22 12",
    },
    {
      title: "Analyser ma situation",
      href: "/design-match/mon-analyse-v3",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    },
    {
      title: "Voir mes objectifs",
      href: "/goals",
      bg: C.successBg,
      color: C.success,
      iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M22 4 12 14.01 9 11.01",
    },
    {
      title: "Parler à mon conseiller",
      href: "/coach",
      bg: C.coralBg,
      color: C.coral,
      iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    },
  ];
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Actions rapides
      </p>
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column" }}>
        {items.map((it, idx) => (
          <Link
            key={it.title}
            href={it.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "5px 0",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: it.bg,
                flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
              {it.title}
            </p>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ S1-04 — Seed actions when no plan ═══════════════ */

function PlannerSeedAction({
  rank,
  tone,
  title,
  detail,
  href,
  cta,
}: {
  rank: number;
  tone: "primary" | "neutral";
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  const accentBg = tone === "primary" ? C.primary : C.borderGhost;
  const accentColor = tone === "primary" ? "white" : C.textDark;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        backgroundColor: C.pageBg,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: accentBg,
          color: accentColor,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "Outfit, Inter, system-ui",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          {title}
        </p>
        <p style={{ margin: "3px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4 }}>
          {detail}
        </p>
        <Link
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 6,
            fontSize: 10.5,
            fontWeight: 600,
            color: C.primary,
            textDecoration: "none",
          }}
        >
          {cta}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

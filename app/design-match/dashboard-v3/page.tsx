/**
 * Phase 5.0 — /design-match/dashboard-v3
 * Phase 6.0 — branchement données live (Server Component).
 *
 * Le DESIGN V3 est figé (couleurs, ombres, structure, typographie).
 * Cette page récupère désormais ses données depuis les services prod :
 *   Score / delta / band   ← drawerData (FHS)
 *   Évolution score (chart) ← listMyRecentSnapshots(12)
 *   Revenus / Dépenses / Reste à vivre / Runway ← getFinanceData + helpers
 *   Roadmap (4 jalons)     ← buildRoadmap + i18n dashboard.roadmap
 *   Mission / Priorité     ← buildFirstMission + i18n
 *   Opportunité du moment  ← detectOpportunities[0]
 *   Répartition donut      ← buildCategoryBreakdown (ce mois)
 *
 * Les 6 boutons principaux pointent maintenant vers des routes réelles
 * (mon-analyse-v3, plan-v3, opportunites-v3, depenses-v3, /coach).
 * Les autres CTA (Voir toutes les projections, Premium, etc.) restent
 * non branchés — phase ultérieure.
 *
 * Les autres pages V3 (revenus, budget, …) restent statiques jusqu'à
 * leur propre migration.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getTranslations } from "next-intl/server";
import {
  getFinanceData,
  totalMonthly,
} from "@/lib/services/finance";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
} from "@/lib/calculations/analytics";
import {
  detectOpportunities,
  type Opportunity,
  type OpportunityPriority,
} from "@/lib/calculations/opportunities";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import {
  buildRoadmap,
  type RoadmapMilestone,
} from "@/lib/calculations/roadmap-templates";
import {
  computeIncomeMonthlyDelta,
  computeExpenseMonthlyDelta,
  computeRemainderMonthlyDelta,
  type MonthlyDelta,
} from "@/lib/calculations/kpi-delta";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { formatUserCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type GoalTypeId } from "@/lib/constants";
import { listMyRecentSnapshots } from "@/lib/services/health-snapshots";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import type {
  DrawerData,
  SealedSnapshot,
} from "@/lib/calculations/health/types";
import type { CategoryBreakdownRow } from "@/lib/calculations/analytics";

export const metadata: Metadata = {
  title: "Design Match v3 — Dashboard",
  robots: { index: false, follow: false },
};

// Per-request data via Supabase cookies — never prerender.
export const dynamic = "force-dynamic";

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
  successText: "#10A37F",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  gold: "#FBBF24",
};

// Ombres "premium floating surfaces" — plus diffuses, plus discrètes
const SHADOW = {
  // White cards : presque invisible mais crée profondeur
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  // Score navy : plus forte pour lévitation premium
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  // KPI : ultra-light, presque rien
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  // Coach CTA : flat
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

const H = {
  topbar: 68,
  scoreCard: 178,
  roadmap: 172,
  kpi: 102,
  bottomRow: 204,
  coachCta: 56,
  gapHR: 14,
  gapRK: 12,
  gapKB: 12,
  gapBC: 14,
};

/* ═══════════════ HELPERS ═══════════════ */

/** Auth lookup parallèle. Renvoie null en mode dégradé pour que la
 *  page rende quand même (drawerData / snapshots seront simplement
 *  vides). Calqué sur app/(app)/dashboard/page.tsx. */
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

/** Destinations cliquables des 6 boutons connectés ce sprint. Les
 *  autres pages V3 restent des maquettes : ces liens y mènent sans
 *  modifier leur contenu. */
const ROUTES_V3 = {
  monAnalyse: "/design-match/mon-analyse-v3",
  plan: "/design-match/plan-v3",
  opportunites: "/design-match/opportunites-v3",
  depenses: "/design-match/depenses-v3",
  coach: "/coach",
} as const;

/** Heuristique éditoriale recopiée de
 *  components/dashboard/opportunity-highlight-card.tsx — mapping
 *  priorité → points score affichés (PAS un calcul FHS réel). */
const POINTS_BY_PRIORITY: Record<OpportunityPriority, number> = {
  high: 12,
  medium: 7,
  low: 3,
};

/** Label catégorie depuis EXPENSE_CATEGORIES.id. */
function expenseCategoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Mois courts FR pour les labels d'axe X de l'EvolutionCard.
 *  Mapping basé sur Date.getUTCMonth() (0-11). */
const MONTHS_FR_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

function formatWeekLabel(weekIso: string): string {
  const d = new Date(weekIso);
  if (Number.isNaN(d.getTime())) return weekIso;
  return `${d.getUTCDate()} ${MONTHS_FR_SHORT[d.getUTCMonth()]}`;
}

/* ═══════════════ DEFAULT EXPORT — Server Component ═══════════════ */

export default async function DesignMatchDashboardV3() {
  /* ------------------------------------------------------------------ */
  /*  Data fetch                                                         */
  /* ------------------------------------------------------------------ */

  const [data, authedUser] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Agrégats finance — copie 1:1 de app/(app)/dashboard/page.tsx       */
  /* ------------------------------------------------------------------ */

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const runway = calculateRunway({
    currentSavings,
    monthlyExpenses: totalExpenses,
  });
  const monthBreakdown = buildCategoryBreakdown(
    data.expenses,
    "month",
    EXPENSE_CATEGORIES.map((c) => c.id),
  );
  const monthBudgetStatus = buildBudgetStatus(
    data.expenses,
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
  );
  const opportunities = detectOpportunities({
    expenseBuckets: data.expenseBuckets,
    budgetStatus: monthBudgetStatus,
    categoryBreakdown: monthBreakdown,
    monthlyIncome,
    runwayMonths: runway,
    savingsRate:
      monthlyIncome > 0 ? (monthlyIncome - fixedExpenses) / monthlyIncome : 0,
  });
  const topOpportunity = opportunities[0] ?? null;

  /* ------------------------------------------------------------------ */
  /*  Mission                                                            */
  /* ------------------------------------------------------------------ */

  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const MAJOR_AREAS = [
    "income",
    "housing",
    "insurance",
    "food",
    "transport",
  ] as const;
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;

  /* ------------------------------------------------------------------ */
  /*  FHS — drawer + snapshots                                           */
  /* ------------------------------------------------------------------ */

  let drawerData: DrawerData | null = null;
  let recentSnapshots: SealedSnapshot[] = [];
  if (authedUser?.id) {
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
      console.error("[dashboard-v3] FHS drawer compute failed", err);
    }
    try {
      recentSnapshots = await listMyRecentSnapshots(12);
    } catch (err) {
      console.error("[dashboard-v3] snapshot listing failed", err);
    }
  }

  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: Number.isFinite(runway) ? runway : 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    monthlyIncome,
    recommendation: drawerData?.recommendation ?? null,
  });

  const primaryGoal = data.goals.find((g) => !g.is_completed) ?? null;
  const mainGoalType =
    (primaryGoal?.type as GoalTypeId | undefined) ?? null;
  const roadmap = buildRoadmap({
    priority: firstMission.priority,
    mainGoalType,
    currentScore: drawerData?.score.display ?? null,
  });

  /* ------------------------------------------------------------------ */
  /*  Deltas KPI                                                         */
  /* ------------------------------------------------------------------ */

  const incomeDelta = computeIncomeMonthlyDelta(data.incomes);
  const expenseDelta = computeExpenseMonthlyDelta(data.expenses);
  const remainderDelta = computeRemainderMonthlyDelta(
    data.incomes,
    data.expenses,
  );

  /* ------------------------------------------------------------------ */
  /*  i18n résolu serveur — passé en strings aux composants visuels      */
  /* ------------------------------------------------------------------ */

  // Casts `as never` : les keys sont dynamiques (priority / kind / band)
  // donc next-intl ne peut pas les typer strictement. Pattern identique
  // à components/dashboard/roadmap-timeline.tsx qui fait `t(milestone.eyebrowKey)`.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tRoadmap = (await getTranslations("dashboard.roadmap")) as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const tBands = (await getTranslations(
    "dashboard.health.bands",
  )) as (key: string) => string;
  const tFirstMission = (await getTranslations(
    "dashboard.firstMission",
  )) as (key: string, values?: Record<string, string | number>) => string;
  const tMissionCard = (await getTranslations(
    "dashboard.missionCard",
  )) as (key: string, values?: Record<string, string | number>) => string;
  const tOppKind = (await getTranslations(
    "app.finance.analytics.opportunities.kind",
  )) as (key: string, values?: Record<string, string | number>) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* ------------------------------------------------------------------ */
  /*  Strings résolues + données prêtes pour les sous-composants V3      */
  /* ------------------------------------------------------------------ */

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const currency = data.profile.currency;

  const resolvedMilestones: ResolvedMilestone[] = roadmap.map((m) => ({
    kind: m.kind,
    eyebrow: tRoadmap(m.eyebrowKey, m.payload).toUpperCase(),
    title: tRoadmap(m.titleKey, m.payload),
    subtitle: tRoadmap(m.subtitleKey, m.payload),
    icon: m.icon,
    tone: m.tone,
    score: m.kind === "today" ? drawerData?.score.display ?? null : null,
  }));

  const score = drawerData?.score.display ?? null;
  const scoreDelta = drawerData?.delta?.netDelta ?? null;
  const tierLabel = drawerData ? tBands(drawerData.score.band) : "—";

  const priorityTitle = tFirstMission(
    `${firstMission.priority}.title`,
    firstMission.payload,
  );
  const missionTitle = tMissionCard(
    `${firstMission.priority}.title`,
    firstMission.payload,
  );
  const missionSubline = tMissionCard(
    `${firstMission.priority}.subline`,
    firstMission.payload,
  );
  const missionCtaLabel = tMissionCard("cta");
  const suggestedAmount =
    typeof firstMission.payload.suggestedAmount === "number"
      ? firstMission.payload.suggestedAmount
      : null;
  const dailyAmount =
    suggestedAmount !== null && suggestedAmount > 0
      ? Math.max(1, Math.round(suggestedAmount / 30))
      : null;

  let oppTitle: string | null = null;
  let oppArgument: string | null = null;
  let oppPoints: number | null = null;
  if (topOpportunity) {
    oppTitle = tOppKind(`${topOpportunity.kind}.title`, topOpportunity.payload);
    oppArgument = tOppKind(
      `${topOpportunity.kind}.body`,
      topOpportunity.payload,
    );
    oppPoints = POINTS_BY_PRIORITY[topOpportunity.priority];
  }

  /* ------------------------------------------------------------------ */
  /*  Render — design V3 strictement préservé                            */
  /* ------------------------------------------------------------------ */

  return (
    <>
      <style>{`
        @media (max-width: 999px) {
          [data-dash-sidebar] { display: none !important; }
          [data-dash-content] { margin-left: 0 !important; }
          [data-dash-main] { padding: 0 16px 16px 16px !important; }
          [data-dash-topbar] { padding: 0 16px !important; }
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
      <div data-dash-sidebar><Sidebar /></div>
      <div
        data-dash-content
        style={{
          marginLeft: 280,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Topbar firstName={firstName} fullName={data.profile.full_name ?? null} />
        <main data-dash-main style={{ flex: 1, padding: "0 42px 16px 42px" }}>
          <div style={{ maxWidth: 1176, margin: "0 auto" }}>
            <Hero
              score={score}
              scoreDelta={scoreDelta}
              tierLabel={tierLabel}
              priorityTitle={priorityTitle}
              runway={runway}
              missionTitle={missionTitle}
              missionSubline={missionSubline}
              missionCtaLabel={missionCtaLabel}
              dailyAmount={dailyAmount}
              currency={currency}
            />
            <div style={{ height: H.gapHR }} />
            <Roadmap milestones={resolvedMilestones} />
            <div style={{ height: H.gapRK }} />
            <KpiRow
              monthlyIncome={monthlyIncome}
              totalExpenses={totalExpenses}
              cashflow={cashflow}
              runway={runway}
              currentSavings={currentSavings}
              incomeDelta={incomeDelta}
              expenseDelta={expenseDelta}
              remainderDelta={remainderDelta}
              profile={data.profile}
            />
            <div style={{ height: H.gapKB }} />
            <BottomRow
              opportunity={topOpportunity}
              oppTitle={oppTitle}
              oppArgument={oppArgument}
              oppPoints={oppPoints}
              breakdown={monthBreakdown}
              totalExpenses={totalExpenses}
              profile={data.profile}
              snapshots={recentSnapshots}
              currentScore={score}
            />
            <div style={{ height: H.gapBC }} />
            <CoachCta />
          </div>
        </main>
      </div>
    </div>
    </>
  );
}

/** Milestone résolu côté serveur, prêt à rendre. */
interface ResolvedMilestone {
  kind: RoadmapMilestone["kind"];
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: RoadmapMilestone["icon"];
  tone: RoadmapMilestone["tone"];
  score: number | null;
}

/* ═══════════════ SIDEBAR ═══════════════ */

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
          <NavItem label="Tableau de bord" href="/design-match/dashboard-v3" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" active />
          <NavItem label="Coach IA" href="/design-match/coach-v3" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <NavItem label="Mon analyse" href="/design-match/mon-analyse-v3" iconPath="M22 12h-4l-3 9L9 3l-3 9H2" />
          <NavItem label="Plan d'action" href="/design-match/plan-v3" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" href="/design-match/revenus-v3" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" />
          <NavItem label="Dépenses" href="/design-match/depenses-v3" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" href="/design-match/budget-v3" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" />
          <NavItem label="Objectifs" href="/design-match/objectifs-v3" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
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
  const displayName = firstName ?? "explorer";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-dash-topbar
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
          Voici votre situation mise à jour aujourd&apos;hui.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/profile"
          aria-label="Mon profil"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px 4px 4px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.textDark }}>
            {pillName}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
/* ═══════════════ HERO — 3 surfaces flottantes ═══════════════ */

interface HeroProps {
  score: number | null;
  scoreDelta: number | null;
  tierLabel: string;
  priorityTitle: string;
  runway: number;
  missionTitle: string;
  missionSubline: string;
  missionCtaLabel: string;
  dailyAmount: number | null;
  currency: string;
}

function Hero(props: HeroProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <ScoreCard
        score={props.score}
        scoreDelta={props.scoreDelta}
        tierLabel={props.tierLabel}
      />
      <PriorityCard
        priorityTitle={props.priorityTitle}
        runway={props.runway}
      />
      <MissionCard
        missionTitle={props.missionTitle}
        missionSubline={props.missionSubline}
        missionCtaLabel={props.missionCtaLabel}
        dailyAmount={props.dailyAmount}
        currency={props.currency}
      />
    </div>
  );
}

function ScoreCard({
  score,
  scoreDelta,
  tierLabel,
}: {
  score: number | null;
  scoreDelta: number | null;
  tierLabel: string;
}) {
  // Ring progress math : circumference = 2π * r = 2π * 43 ≈ 270.18 px.
  // Fraction visible = score/100 (0 si score null pour fallback empty).
  const ringR = 43;
  const ringCirc = 2 * Math.PI * ringR;
  const scoreFraction = score !== null ? Math.max(0, Math.min(1, score / 100)) : 0;
  const ringOffset = ringCirc * (1 - scoreFraction);

  // Texte delta + badge dynamique selon le signe de scoreDelta.
  // - null : "Première lecture — pas encore de comparaison"
  // - 0   : "Score stable cette semaine"
  // - >0  : "+N pts depuis la semaine dernière"  (badge "EN PROGRESSION")
  // - <0  : "-N pts depuis la semaine dernière"  (badge "À SURVEILLER")
  const deltaSign: "up" | "down" | "flat" | "none" =
    scoreDelta === null
      ? "none"
      : scoreDelta === 0
        ? "flat"
        : scoreDelta > 0
          ? "up"
          : "down";
  const deltaBadge =
    deltaSign === "up"
      ? { label: "EN PROGRESSION", color: "#5EEAD4", bg: "rgba(16, 163, 127, 0.18)" }
      : deltaSign === "down"
        ? { label: "À SURVEILLER", color: "#FBBF24", bg: "rgba(251, 191, 36, 0.18)" }
        : deltaSign === "flat"
          ? { label: "STABLE", color: "#94A3B8", bg: "rgba(148, 163, 184, 0.18)" }
          : null;
  const deltaText =
    scoreDelta === null
      ? "Première lecture du score"
      : scoreDelta === 0
        ? "Score stable cette semaine"
        : scoreDelta > 0
          ? `+${Math.round(scoreDelta)} pts depuis la semaine dernière`
          : `${Math.round(scoreDelta)} pts depuis la semaine dernière`;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: H.scoreCard,
        padding: "22px 24px",
        backgroundColor: C.navy,
        borderRadius: 18,
        // Shadow plus forte pour LÉVITATION premium → hiérarchie
        boxShadow: SHADOW.navy,
      }}
    >
      {/* Glow décoratif derrière la ring — profondeur premium */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", height: "100%", justifyContent: "space-between", alignItems: "stretch", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.72)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: "2px 0 0 0",
            }}
          >
            Score de santé financière
          </p>
          {/* Score "46" — 76 px, tracking serré pour densité premium */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, transform: "translateY(-4px)" }}>
            <span
              style={{
                fontSize: 76,
                fontWeight: 700,
                color: "white",
                lineHeight: 0.92,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.035em",
              }}
            >
              {score ?? "—"}
            </span>
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              /100
            </span>
          </div>
          <div style={{ marginBottom: 12, transform: "translateY(-10px)" }}>
            {deltaBadge && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 999,
                  backgroundColor: deltaBadge.bg,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: deltaBadge.color,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 6 23 6 23 12" />
                  <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
                </svg>
                {deltaBadge.label}
              </span>
            )}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0", lineHeight: 1.25 }}>
              {deltaText}
            </p>
          </div>
        </div>
        {/* Ring 108 px — équilibre visuel avec le score 76 px */}
        <div style={{ position: "relative", flexShrink: 0, width: 108, height: 108, alignSelf: "center" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
              filter: "blur(28px)",
            }}
          />
          <svg viewBox="0 0 100 100" width={108} height={108} style={{ position: "relative" }}>
            <circle cx="50" cy="50" r={ringR} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${ringCirc.toFixed(2)} ${ringCirc.toFixed(2)}`}
              strokeDashoffset={ringOffset.toFixed(2)}
              transform="rotate(-90 50 50)"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
            />
            {/* Centre de la ring : tier label (poids visuel ≤ score externe) */}
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="rgba(255,255,255,0.55)"
              letterSpacing="1.5"
            >
              NIVEAU
            </text>
            <text
              x="50"
              y="64"
              textAnchor="middle"
              fontSize="13.5"
              fontWeight="700"
              fill="white"
              fontFamily="Outfit, Inter, system-ui"
              letterSpacing="-0.01em"
            >
              {tierLabel}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function PriorityCard({
  priorityTitle,
  runway,
}: {
  priorityTitle: string;
  runway: number;
}) {
  // Cible runway = 3 mois (alignée avec le seuil low_resilience de
  // buildFirstMission). On clampe le ratio pour la barre de progression.
  const TARGET_MONTHS = 3;
  const runwayFinite = Number.isFinite(runway);
  const runwayValue = runwayFinite ? Math.max(0, runway) : Infinity;
  const ratio = runwayFinite
    ? Math.max(0, Math.min(1, runwayValue / TARGET_MONTHS))
    : 1;
  const ratioPct = Math.max(2, Math.round(ratio * 100));
  const runwayDisplay = runwayFinite ? runwayValue.toFixed(1) : "∞";
  return (
    <div
      style={{
        height: H.scoreCard,
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: C.coralBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
            Votre priorité actuelle
          </p>
        </div>
        <h3
          style={{
            fontSize: 16.5,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.25,
            margin: "14px 0 0 0",
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
          }}
        >
          {priorityTitle}
        </h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.coral,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {runwayDisplay}
          </span>
          <span style={{ fontSize: 12, color: C.textMuted }}>mois sur {TARGET_MONTHS} mois</span>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 999,
            backgroundColor: C.coralBg,
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={runwayFinite ? Math.round(runwayValue * 10) / 10 : TARGET_MONTHS}
          aria-valuemin={0}
          aria-valuemax={TARGET_MONTHS}
        >
          <div
            style={{
              width: `${ratioPct}%`,
              height: "100%",
              backgroundColor: C.coral,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
      <Link
        href={ROUTES_V3.monAnalyse}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Voir pourquoi c&apos;est critique
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function MissionCard({
  missionTitle,
  missionSubline,
  missionCtaLabel,
  dailyAmount,
  currency,
}: {
  missionTitle: string;
  missionSubline: string;
  missionCtaLabel: string;
  dailyAmount: number | null;
  currency: string;
}) {
  return (
    <div
      style={{
        height: H.scoreCard,
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              backgroundColor: C.primaryBg,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.primary}>
              <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
            </svg>
          </span>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
            Mission du moment
          </p>
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.25,
            margin: "16px 0 0 0",
            fontFamily: "Outfit, Inter, system-ui",
          }}
        >
          {missionTitle}
        </h3>
        <p style={{ marginTop: 6, fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, margin: "6px 0 0 0" }}>
          {missionSubline}
        </p>
      </div>
      {/* Audit zéro-tolérance — bouton "Agir maintenant" confiné à la
          carte :
          - flexWrap wrap : si le label CTA + le daily amount débordent,
            le daily amount passe sous le bouton au lieu de sortir.
          - Link maxWidth 100% + whiteSpace normal + wordBreak :
            autorise le wrap interne quand le label est très long
            (ex. "Voir le détail avec mon conseiller").
          - svg shrink-0 : l'icône flèche reste lisible. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, rowGap: 8 }}>
        <Link
          href={ROUTES_V3.plan}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 9,
            textDecoration: "none",
            maxWidth: "100%",
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: 1.2,
            minWidth: 0,
          }}
        >
          <span style={{ minWidth: 0 }}>{missionCtaLabel}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
        {dailyAmount !== null && (
          <span style={{ fontSize: 11.5, color: C.textLight, whiteSpace: "nowrap" }}>
            ~{dailyAmount} {currency} / jour
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ ROADMAP — RUBAN INTÉGRÉ ═══════════════ */

// Mapping tone (RoadmapTone) → couleurs V3.
// Aligné sur les badges existants du design : success vert,
// violet, neutral (utilisé par "today" qui a son traitement
// isToday spécifique), warning ambre, navy bleu profond.
const TONE_PALETTE: Record<
  RoadmapMilestone["tone"],
  { bg: string; fg: string }
> = {
  success: { bg: C.successBg, fg: C.success },
  violet: { bg: C.violetBg, fg: C.violet },
  warning: { bg: "#FEF3C7", fg: C.amber },
  navy: { bg: C.primaryBg, fg: C.navy },
  neutral: { bg: "#F1F5F9", fg: C.textMuted },
};

function Roadmap({ milestones }: { milestones: ResolvedMilestone[] }) {
  return (
    <div
      style={{
        height: H.roadmap,
        padding: "16px 22px 14px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Votre feuille de route
          </h2>
          <p style={{ marginTop: 2, fontSize: 11.5, color: C.textMuted, margin: "2px 0 0 0" }}>
            Projection sur 3 ans, mise à jour chaque mois
          </p>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12.5,
            fontWeight: 500,
            color: C.primary,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          Voir toutes les projections
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      {/* Grille stricte : 4 colonnes 25% chacune, milestones centrés
          horizontalement dans leur colonne. Connecteurs en overlay
          positionné aux frontières 25/50/75 %. */}
      <div style={{ flex: 1, position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {milestones.map((m) => {
          const isToday = m.kind === "today";
          const palette = isToday ? null : TONE_PALETTE[m.tone];
          return (
            <Milestone
              key={m.kind}
              eyebrow={m.eyebrow}
              title={m.title}
              subtitle={m.subtitle}
              isToday={isToday}
              score={m.score ?? undefined}
              icon={isToday ? undefined : m.icon}
              bg={palette?.bg}
              fg={palette?.fg}
            />
          );
        })}
        {/* Connecteurs en overlay aux frontières 25/50/75 % :
            chaque connecteur est centré entre deux badges
            (les badges sont au centre optique de leur colonne).
            top: 10 → connector centré sur l'axe vertical des
            badges (badge 32 px → centre à y=16, connecteur 12 px
            de haut → top = 16 - 6 = 10). */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            aria-hidden
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: 10,
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            <RoadmapConnector />
          </div>
        ))}
      </div>
    </div>
  );
}

function Milestone({
  eyebrow,
  title,
  subtitle,
  isToday,
  score,
  icon,
  bg,
  fg,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  isToday?: boolean;
  score?: number;
  icon?: RoadmapMilestone["icon"];
  bg?: string;
  fg?: string;
}) {
  return (
    // Milestone CENTRÉ optiquement dans sa colonne 25 % : alignItems
    // center pour aligner badge + textes sur l'axe vertical de la
    // colonne. Connecteurs (overlay aux 25 / 50 / 75 %) tombent ainsi
    // exactement à mi-chemin entre deux badges → équilibre parfait.
    <div
      style={{
        minWidth: 0,
        padding: "0 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          backgroundColor: isToday ? "white" : bg,
          color: isToday ? C.primary : fg,
          borderRadius: 999,
          border: isToday ? `2px solid ${C.primary}` : "none",
          boxShadow: isToday
            ? `0 0 0 4px ${C.primaryBg}`
            : "none",
          flexShrink: 0,
        }}
      >
        {isToday ? (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.primary, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em" }}>
            {score ?? "—"}
          </span>
        ) : (
          icon && fg ? <MilestoneIcon name={icon} color={fg} /> : null
        )}
      </span>
      <p
        style={{
          marginTop: 10,
          fontSize: 9,
          fontWeight: 700,
          color: C.textLight,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
          margin: 0,
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          marginTop: 4,
          fontSize: 12.5,
          fontWeight: 600,
          color: C.textDark,
          lineHeight: 1.25,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          margin: 0,
        }}
        title={title}
      >
        {title}
      </p>
      <p
        style={{
          marginTop: 2,
          fontSize: 11,
          color: C.textMuted,
          lineHeight: 1.35,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          margin: 0,
        }}
        title={subtitle}
      >
        {subtitle}
      </p>
    </div>
  );
}

function MilestoneIcon({
  name,
  color,
}: {
  name: RoadmapMilestone["icon"];
  color: string;
}) {
  // Mapping RoadmapIcon → SVG path. Le set V3 d'origine couvrait
  // shield/trend/home ; on a étendu pour TrendingUp, Plane, Briefcase,
  // Heart, Sparkles, Score (Score retombe en fallback Home pour les
  // milestones non-today qui auraient ce kind).
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "Shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    );
  }
  if (name === "TrendingUp") {
    return (
      <svg {...common}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }
  if (name === "Plane") {
    return (
      <svg {...common}>
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    );
  }
  if (name === "Briefcase") {
    return (
      <svg {...common}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (name === "Heart") {
    return (
      <svg {...common}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  if (name === "Sparkles") {
    return (
      <svg {...common}>
        <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
      </svg>
    );
  }
  // Home + Score (fallback) — icône maison.
  return (
    <svg {...{ ...common, width: 16, height: 16 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function RoadmapConnector() {
  return (
    <div
      style={{
        width: 80,
        height: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 80 12" width={80} height={12}>
        <line
          x1="2"
          y1="6"
          x2="66"
          y2="6"
          stroke={C.primary}
          strokeOpacity="0.45"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
        <path
          d="M 67 1.5 L 77 6 L 67 10.5"
          stroke={C.primary}
          strokeOpacity="0.55"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ═══════════════ KPI ROW — surfaces très légères ═══════════════ */

interface KpiRowProps {
  monthlyIncome: number;
  totalExpenses: number;
  cashflow: number;
  runway: number;
  currentSavings: number;
  incomeDelta: MonthlyDelta;
  expenseDelta: MonthlyDelta;
  remainderDelta: MonthlyDelta;
  profile: { currency: string; locale?: string | null; country?: string | null };
}

/** Convertit un MonthlyDelta en pill V3 :
 *   - polarity income-like : up = vert, down = rouge
 *   - polarity expense-like : up = rouge, down = vert (baisser dépenses = bien)
 *   - polarity neutral : ambre
 *   - direction "neutral" → pill "—" ambre
 */
function mapDelta(
  delta: MonthlyDelta,
  polarity: "income-like" | "expense-like" | "neutral",
): { sign: string; value: string; direction: "up" | "down" | "none"; color: string } {
  if (delta.direction === "neutral" || delta.percent === null) {
    return { sign: "", value: "—", direction: "none", color: C.amber };
  }
  const arrow: "up" | "down" =
    delta.direction === "positive" ? "up" : "down";
  // Couleur positive/négative selon la polarity de la métrique.
  let positiveColor: string;
  if (polarity === "income-like") {
    positiveColor = delta.direction === "positive" ? C.success : "#DC2626";
  } else if (polarity === "expense-like") {
    positiveColor = delta.direction === "positive" ? "#DC2626" : C.success;
  } else {
    positiveColor = C.amber;
  }
  return {
    sign: delta.direction === "positive" ? "+" : "-",
    value: `${delta.percent.toFixed(1)}%`,
    direction: arrow,
    color: positiveColor,
  };
}

function KpiRow({
  monthlyIncome,
  totalExpenses,
  cashflow,
  runway,
  currentSavings,
  incomeDelta,
  expenseDelta,
  remainderDelta,
  profile,
}: KpiRowProps) {
  const incomePill = mapDelta(incomeDelta, "income-like");
  const expensePill = mapDelta(expenseDelta, "expense-like");
  const remainderPill = mapDelta(remainderDelta, "income-like");
  const expensesShareOfIncome =
    monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : null;
  const remainderShareOfIncome =
    monthlyIncome > 0 ? (cashflow / monthlyIncome) * 100 : null;
  const runwayFinite = Number.isFinite(runway);
  const runwayValue = runwayFinite ? Math.max(0, runway) : Infinity;
  const currency = profile.currency;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <KpiCard
        label="REVENUS MENSUELS"
        value={monthlyIncome > 0 ? formatUserCurrency(monthlyIncome, profile) : "—"}
        delta={incomePill}
        hint={monthlyIncome > 0 ? "Après impôts" : "Aucun revenu renseigné"}
        sparkline={{ points: [30, 35, 32, 40, 38, 45, 50, 55], color: "#10A37F" }}
      />
      <KpiCard
        label="DÉPENSES MENSUELLES"
        value={totalExpenses > 0 ? formatUserCurrency(totalExpenses, profile) : "—"}
        delta={expensePill}
        hint={
          expensesShareOfIncome !== null
            ? `${expensesShareOfIncome.toFixed(0)}% de vos revenus`
            : "Aucune dépense renseignée"
        }
        sparkline={{ points: [50, 55, 48, 52, 45, 40, 38, 35], color: "#DC2626" }}
      />
      <KpiCard
        label="RESTE À VIVRE"
        value={
          monthlyIncome > 0 || totalExpenses > 0
            ? formatUserCurrency(cashflow, profile)
            : "—"
        }
        delta={remainderPill}
        hint={
          remainderShareOfIncome !== null
            ? `${remainderShareOfIncome.toFixed(1)}% de vos revenus`
            : "—"
        }
        sparkline={{ points: [25, 28, 32, 30, 38, 42, 45, 52], color: "#10A37F" }}
      />
      <KpiCard
        label="FONDS D'URGENCE"
        value={runwayFinite ? `${runwayValue.toFixed(1)} mois` : "∞"}
        delta={{ sign: "", value: "—", direction: "none", color: C.amber }}
        hint={
          currentSavings > 0
            ? `${formatUserCurrency(currentSavings, profile)} disponibles`
            : `0 ${currency} disponibles`
        }
        sparkline={{ points: [40, 30, 25, 35, 28, 38, 32, 36], color: "#F59E0B" }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  sparkline,
}: {
  label: string;
  value: string;
  delta: { sign: string; value: string; direction: "up" | "down" | "none"; color: string };
  hint: string;
  sparkline: { points: number[]; color: string };
}) {
  return (
    <div
      style={{
        height: H.kpi,
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.kpi,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {/* Ligne 1 : label + delta pill (alignés sur même baseline) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {label}
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            padding: "2px 6px",
            borderRadius: 999,
            backgroundColor:
              delta.direction === "none"
                ? "#FEF3C7"
                : delta.color === C.success
                  ? C.successBg
                  : "#FEE2E2",
            fontSize: 10.5,
            fontWeight: 700,
            color: delta.color,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {delta.direction === "up" && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          )}
          {delta.direction === "down" && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 7 17 17" />
              <polyline points="7 17 17 17 17 7" />
            </svg>
          )}
          {delta.direction === "none" ? delta.value : `${delta.sign}${delta.value}`}
        </span>
      </div>
      {/* Ligne 2 : valeur (massive) + sparkline collée à droite,
          baselines alignées sur l'axe visuel central de la carte. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1,
            fontFamily: "Outfit, Inter, system-ui",
            margin: 0,
            letterSpacing: "-0.025em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {value}
        </p>
        <div style={{ width: 60, height: 24, flexShrink: 0 }}>
          <Sparkline points={sparkline.points} color={sparkline.color} />
        </div>
      </div>
      {/* Ligne 3 : hint, une ligne, ne se brise jamais */}
      <p
        style={{
          fontSize: 11,
          color: C.textMuted,
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {hint}
      </p>
    </div>
  );
}

/* Mini sparkline SVG. Scaled à 100 % du conteneur, stroke
   vector-effect non-scaling pour garder une épaisseur uniforme
   quelle que soit la largeur réelle. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const W = 60;
  const HH = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - 2) + 1;
    const y = HH - 2 - ((v - min) / range) * (HH - 4);
    return { x, y };
  });
  const pathD = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(2)} ${HH - 1} L ${coords[0].x.toFixed(2)} ${HH - 1} Z`;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${HH}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={areaD} fill={color} fillOpacity={0.14} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ═══════════════ BOTTOM ROW ═══════════════ */

interface BottomRowProps {
  opportunity: Opportunity | null;
  oppTitle: string | null;
  oppArgument: string | null;
  oppPoints: number | null;
  breakdown: CategoryBreakdownRow[];
  totalExpenses: number;
  profile: { currency: string; locale?: string | null; country?: string | null };
  snapshots: SealedSnapshot[];
  currentScore: number | null;
}

function BottomRow(props: BottomRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <OpportunityCard
        opportunity={props.opportunity}
        title={props.oppTitle}
        argument={props.oppArgument}
        points={props.oppPoints}
      />
      <RepartitionCard
        breakdown={props.breakdown}
        totalExpenses={props.totalExpenses}
        profile={props.profile}
      />
      <EvolutionCard
        snapshots={props.snapshots}
        currentScore={props.currentScore}
      />
    </div>
  );
}

function OpportunityCard({
  opportunity,
  title,
  argument,
  points,
}: {
  opportunity: Opportunity | null;
  title: string | null;
  argument: string | null;
  points: number | null;
}) {
  // Empty state : si detectOpportunities() ne renvoie rien, le profil
  // est jugé sain — on garde la structure visuelle mais on ajuste les
  // chaînes pour ne pas afficher du faux.
  const hasOpportunity = opportunity !== null && title !== null;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: H.bottomRow,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Décor subtil — pattern radial vert dans le coin sup. droit
          (style Stripe). Donne du caractère sans concurrencer le texte. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, rgba(16, 163, 127, 0.10) 0%, rgba(16, 163, 127, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: C.successBg,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </span>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Opportunité du moment
        </p>
      </div>
      <h3
        style={{
          marginTop: 14,
          fontSize: 16,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.3,
          margin: "14px 0 0 0",
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        {hasOpportunity ? title : "Aucune opportunité urgente détectée"}
      </h3>
      <p style={{ marginTop: 6, fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: "6px 0 0 0" }}>
        {hasOpportunity
          ? argument
          : "Continuez sur cette trajectoire — vos fondations sont saines."}
      </p>
      {/* Bloc impact — callout structuré, plus de flèche décorative */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 10,
          backgroundColor: C.successBg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.success, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Impact score
          </span>
          <span
            style={{
              marginTop: 2,
              fontSize: 18,
              fontWeight: 700,
              color: C.success,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
            }}
          >
            {hasOpportunity && points !== null ? `+${points} pts` : "—"}
          </span>
        </div>
        <Link
          href={ROUTES_V3.opportunites}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Explorer
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// Palette monochrome bleue V3 — 5 nuances, ordre du plus dominant
// au plus discret. Au-delà de 5 catégories, on regroupe en "Autres".
const REPARTITION_PALETTE = ["#011E5F", "#2563EB", "#60A5FA", "#A5B4DC", "#C7CFE3"] as const;

function RepartitionCard({
  breakdown,
  totalExpenses,
  profile,
}: {
  breakdown: CategoryBreakdownRow[];
  totalExpenses: number;
  profile: { currency: string; locale?: string | null; country?: string | null };
}) {
  // Construit la liste donut : top 4 catégories (par total desc) +
  // regroupement "Autres" si la liste a 5+ entrées. Préserve la palette
  // monochrome de la maquette V3.
  const sorted = [...breakdown]
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const slices = (() => {
    if (sorted.length === 0) {
      return [
        {
          id: "empty",
          label: "Aucune dépense ce mois-ci",
          pct: 100,
          amount: formatUserCurrency(0, profile),
          color: REPARTITION_PALETTE[4],
        },
      ];
    }
    if (sorted.length <= 5) {
      return sorted.map((row, i) => ({
        id: row.category,
        label: expenseCategoryLabel(row.category),
        pct: Math.round(row.share * 100),
        amount: formatUserCurrency(row.total, profile),
        color: REPARTITION_PALETTE[Math.min(i, REPARTITION_PALETTE.length - 1)],
      }));
    }
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const restTotal = rest.reduce((s, r) => s + r.total, 0);
    const restShare = rest.reduce((s, r) => s + r.share, 0);
    return [
      ...top.map((row, i) => ({
        id: row.category,
        label: expenseCategoryLabel(row.category),
        pct: Math.round(row.share * 100),
        amount: formatUserCurrency(row.total, profile),
        color: REPARTITION_PALETTE[i],
      })),
      {
        id: "_others",
        label: "Autres",
        pct: Math.round(restShare * 100),
        amount: formatUserCurrency(restTotal, profile),
        color: REPARTITION_PALETTE[4],
      },
    ];
  })();
  const slicesWithPaths = (() => {
    let cursor = -90;
    const gap = 1;
    const usableDeg = 360 - gap * slices.length;
    const total = slices.reduce((s, x) => s + x.pct, 0);
    return slices.map((s) => {
      const share = s.pct / total;
      const sweep = usableDeg * share;
      const startDeg = cursor;
      const endDeg = cursor + sweep;
      const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
      cursor = endDeg + gap;
      return { ...s, path };
    });
  })();

  return (
    <div
      style={{
        height: H.bottomRow,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Répartition des dépenses
        </p>
        <span style={{ fontSize: 10.5, color: C.textLight, fontWeight: 500 }}>Ce mois</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 14, gap: 16, flex: 1 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" width={104} height={104}>
            {slicesWithPaths.map((s) => (
              <path key={s.id} d={s.path} fill={s.color} />
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.textDark,
                margin: 0,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
              }}
            >
              {totalExpenses > 0
                ? new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(totalExpenses)
                : "—"}
            </p>
            <p
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                color: C.textLight,
                letterSpacing: "0.2em",
                margin: 0,
                textTransform: "uppercase",
                marginTop: 1,
              }}
            >
              {profile.currency}
            </p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {slicesWithPaths.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 24px 58px",
                columnGap: 6,
                height: 22,
                fontSize: 10.5,
                alignItems: "center",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {s.label}
                </span>
              </span>
              <span style={{ color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.pct}%
              </span>
              <span style={{ color: C.textMuted, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Link
        href={ROUTES_V3.depenses}
        style={{
          marginTop: 4,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Voir le détail
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function EvolutionCard({
  snapshots,
  currentScore,
}: {
  snapshots: SealedSnapshot[];
  currentScore: number | null;
}) {
  // snapshots arrivent triés DESC par week (le plus récent en 0). On
  // les remet en ordre chronologique pour le tracé. Si moins de 2
  // points : fallback courbe mockée pour préserver le visuel de la
  // maquette (mais on le marque dans le rapport).
  const sortedChrono = [...snapshots].reverse();
  const hasRealSeries = sortedChrono.length >= 2;
  const points = hasRealSeries
    ? sortedChrono.map((s) => s.result.display)
    : [22, 30, 38, 32, 42, 50, 54, 46];

  const W = 320;
  const HH = 110;
  // PAD.right large (60) pour héberger le badge "46" sans qu'il
  // touche le bord. PAD.bottom 22 pour X-axis intégrés au SVG.
  const PAD = { top: 8, right: 60, bottom: 22, left: 4 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const scaled = points.map((v, i) => ({
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - (v / 100) * innerH,
    v,
  }));
  const pathD = scaled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const last = scaled[scaled.length - 1];

  // 5 labels X évenly-spaced à partir des dates de snapshots quand
  // possible. Sinon, labels mockés de la maquette.
  const xLabels = hasRealSeries
    ? [0, 1, 2, 3, 4].map((slot) => {
        const idx = Math.round(
          (slot * (sortedChrono.length - 1)) / 4,
        );
        const snap = sortedChrono[Math.min(idx, sortedChrono.length - 1)];
        return formatWeekLabel(snap.week);
      })
    : ["1 avr", "15 avr", "1 mai", "15 mai", "1 juin"];

  // Badge "+N pts (60j)" — delta entre 1er et dernier point réel.
  // Fenêtre 60j ≈ 8-9 snapshots hebdo, mais on utilise toute la
  // série dispo pour rester lisible. Caché si pas de série réelle.
  const evoDelta = hasRealSeries
    ? points[points.length - 1] - points[0]
    : null;
  const badgeScore = currentScore ?? points[points.length - 1];

  return (
    <div
      style={{
        height: H.bottomRow,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Évolution du score
        </p>
        {evoDelta !== null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 7px",
              borderRadius: 999,
              backgroundColor: evoDelta >= 0 ? C.successBg : "#FEE2E2",
              fontSize: 10.5,
              fontWeight: 700,
              color: evoDelta >= 0 ? C.success : "#DC2626",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
            {evoDelta >= 0 ? "+" : ""}{Math.round(evoDelta)} pts ({sortedChrono.length} sem.)
          </span>
        )}
      </div>
      <div style={{ marginTop: 10, flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="evo-gradient-v3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.5} />;
          })}
          {[25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <text key={`y-${v}`} x={W - PAD.right + 6} y={y + 3} fontSize="8.5" fill={C.textLight}>
                {v}
              </text>
            );
          })}
          <path d={areaD} fill="url(#evo-gradient-v3)" />
          <path d={pathD} stroke={C.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C.cardBg} stroke={C.primary} strokeWidth={1.5} />
          ))}
          {/* Last point : cercle plus marqué (highlight current) */}
          <circle cx={last.x} cy={last.y} r={5} fill="white" stroke={C.primary} strokeWidth={2} />
          <circle cx={last.x} cy={last.y} r={2.5} fill={C.primary} />
          {/* Badge "46 Score actuel" : positionné AU-DESSUS du point
              (vs à côté) pour ne pas toucher le bord droit ni la courbe.
              Pointe légère vers le point en dessous. */}
          <g transform={`translate(${last.x - 25}, ${last.y - 39})`}>
            <rect x="0" y="0" width="50" height="30" rx="6" fill={C.navy} />
            <text x="25" y="13" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Outfit, Inter, system-ui">
              {badgeScore}
            </text>
            <text x="25" y="23" textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.7)" letterSpacing="0.5">
              SCORE ACTUEL
            </text>
            <path d="M 21 30 L 25 34 L 29 30 Z" fill={C.navy} />
          </g>
          {xLabels.map((label, i) => {
            const x = PAD.left + (i / (xLabels.length - 1)) * innerW;
            const anchor = i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle";
            return (
              <text
                key={label}
                x={x}
                y={HH - 6}
                fontSize="8.5"
                fill={C.textLight}
                textAnchor={anchor}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      <Link
        href={ROUTES_V3.monAnalyse}
        style={{
          marginTop: 6,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Voir l&apos;historique
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ COACH CTA ═══════════════ */

function CoachCta() {
  return (
    <div
      style={{
        height: H.coachCta,
        padding: "0 20px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark, margin: 0, lineHeight: 1.3 }}>
            Parler à votre conseiller
          </p>
          <p
            style={{
              fontSize: 12,
              color: C.textMuted,
              margin: 0,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Posez une question, obtenez des conseils personnalisés.
          </p>
        </div>
      </div>
      <Link
        href={ROUTES_V3.coach}
        style={{
          padding: "9px 18px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 9,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Démarrer une conversation
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ HELPERS DONUT ═══════════════ */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutSliceD(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, outerR, startDeg);
  const e = polarToCartesian(cx, cy, outerR, endDeg);
  const si = polarToCartesian(cx, cy, innerR, endDeg);
  const ei = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${s.x.toFixed(3)} ${s.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`,
    `L ${si.x.toFixed(3)} ${si.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ei.x.toFixed(3)} ${ei.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

/**
 * Phase 5.0 — /design-match/opportunites-v3
 *
 * Page Opportunités V3 — cockpit financier dense aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que les 8 autres pages V3 verrouillées
 * (dashboard, coach, plan, revenus, depenses, budget, objectifs,
 * epargne, investissements).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : HeroOpportunites · ScoreCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : TopOpportunitesCard · GainsFutursCard · PrioritesCard
 *   Row 3 (1.4fr / 1fr / 1fr)  : EvolutionCard · CategoriesCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
} from "@/lib/calculations/analytics";
import {
  detectOpportunities,
  type Opportunity,
  type OpportunityKind,
  type OpportunityPriority,
} from "@/lib/calculations/opportunities";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import { formatUserCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { DrawerData } from "@/lib/calculations/health/types";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design Match v3 — Opportunités",
  robots: { index: false, follow: false },
};

const C = {
  navy: "#011E5F",
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
  danger: "#DC2626",
  donutGrey: "#CBD5E1",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

/* ═══════════════ HELPERS & TYPES ═══════════════ */

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

function expenseCategoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Famille thématique d'une opportunité — pour la CategoriesCard. */
type OpportunityFamily =
  | "depenses"
  | "couts_fixes"
  | "epargne"
  | "securite";

function familyOf(kind: OpportunityKind): OpportunityFamily {
  switch (kind) {
    case "budget_over":
    case "high_variable_share":
    case "audit_top_variable_category":
    case "dominant_category":
      return "depenses";
    case "high_fixed_ratio":
    case "high_insurance_share":
    case "high_subscriptions_share":
      return "couts_fixes";
    case "low_savings_rate":
      return "epargne";
    case "low_emergency_fund":
      return "securite";
  }
}

const FAMILY_META: Record<OpportunityFamily, { label: string; color: string; bg: string }> = {
  depenses: { label: "Dépenses", color: "#F97757", bg: "#FFF1EC" },
  couts_fixes: { label: "Coûts fixes", color: "#F59E0B", bg: "#FEF3C7" },
  epargne: { label: "Épargne", color: "#10A37F", bg: "#ECFDF5" },
  securite: { label: "Sécurité", color: "#9061F9", bg: "#F4EBFF" },
};

const PRIORITY_TAG: Record<OpportunityPriority, string> = {
  high: "IMMÉDIAT",
  medium: "RAPIDE",
  low: "AUDIT",
};

const PRIORITY_STYLE: Record<OpportunityPriority, { color: string; bg: string }> = {
  high: { color: "#F97757", bg: "#FFF1EC" },
  medium: { color: "#F59E0B", bg: "#FEF3C7" },
  low: { color: "#2563EB", bg: "#EDF2FD" },
};

type ResolvedOpportunity = {
  kind: OpportunityKind;
  priority: OpportunityPriority;
  title: string;
  body: string;
  monthlyImpact: number;
  yearlyImpact: number;
  family: OpportunityFamily;
};

type OppWiredProps = {
  resolved: ResolvedOpportunity[];
  totalCount: number;
  highCount: number;
  totalMonthlyImpact: number;
  totalYearlyImpact: number;
  familyDistribution: {
    family: OpportunityFamily;
    pct: number;
    sum: number;
    count: number;
  }[];
  fhsScore: number | null;
  formatMoney: (n: number) => string;
};

export default async function DesignMatchOpportunitesV3() {
  /* ------------------------------------------------------------------ */
  /*  Data fetch                                                         */
  /* ------------------------------------------------------------------ */

  const [data, authedUser] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
  ]);
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats finance (alignés dashboard-v3 / plan-v3)                  */
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
  const runwayMonths = Number.isFinite(runwayRaw) ? runwayRaw : 999;
  // Eslint silencieux : cashflow gardé pour cohérence inter-pages V3.
  void cashflow;

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
  const savingsRate =
    monthlyIncome > 0 ? (monthlyIncome - fixedExpenses) / monthlyIncome : 0;

  /* ------------------------------------------------------------------ */
  /*  Moteur opportunités — la SOURCE de cette page                      */
  /* ------------------------------------------------------------------ */

  const opportunities: Opportunity[] = detectOpportunities({
    expenseBuckets: data.expenseBuckets,
    budgetStatus: monthBudgetStatus,
    categoryBreakdown: monthBreakdown,
    monthlyIncome,
    runwayMonths,
    savingsRate,
  });

  /* ------------------------------------------------------------------ */
  /*  FHS score (utilisé par ScoreCard "Score IA")                       */
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
      console.error("[opportunites-v3] FHS drawer compute failed", err);
    }
  }
  const fhsScore = drawerData?.score.display ?? null;

  /* ------------------------------------------------------------------ */
  /*  i18n — résolutions côté serveur                                    */
  /* ------------------------------------------------------------------ */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tKind = (await getTranslations(
    "app.finance.analytics.opportunities.kind",
  )) as (key: string, values?: Record<string, string | number>) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const profile = {
    currency: data.profile.currency,
    locale: data.profile.locale ?? null,
    country: data.profile.country ?? null,
  };
  const formatMoney = (n: number) => formatUserCurrency(n, profile);

  // Le moteur émet des payloads avec `amount`, `limit`, `variable`,
  // `share`, `category`, etc. On rend les `category` en label FR
  // localisé et on formate les montants AVANT i18n.
  const resolveOpp = (o: Opportunity): ResolvedOpportunity => {
    const payload: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(o.payload)) {
      if (k === "category" && typeof v === "string") {
        payload[k] = expenseCategoryLabel(v);
      } else if (
        (k === "amount" || k === "limit" || k === "variable" || k === "fixed") &&
        typeof v === "number"
      ) {
        payload[k] = formatMoney(v);
      } else {
        payload[k] = v;
      }
    }
    return {
      kind: o.kind,
      priority: o.priority,
      title: tKind(`${o.kind}.title`, payload),
      body: tKind(`${o.kind}.body`, payload),
      monthlyImpact: o.monthlyImpact,
      yearlyImpact: o.yearlyImpact,
      family: familyOf(o.kind),
    };
  };
  const resolved: ResolvedOpportunity[] = opportunities.map(resolveOpp);

  /* ------------------------------------------------------------------ */
  /*  Agrégats opportunités                                              */
  /* ------------------------------------------------------------------ */

  const totalCount = resolved.length;
  const highCount = resolved.filter((o) => o.priority === "high").length;
  const totalMonthlyImpact = resolved.reduce(
    (acc, o) => acc + o.monthlyImpact,
    0,
  );
  const totalYearlyImpact = resolved.reduce(
    (acc, o) => acc + o.yearlyImpact,
    0,
  );

  // Distribution par famille (somme monthlyImpact, % du total).
  const familyTotals: Record<OpportunityFamily, number> = {
    depenses: 0,
    couts_fixes: 0,
    epargne: 0,
    securite: 0,
  };
  for (const o of resolved) {
    familyTotals[o.family] += o.monthlyImpact;
  }
  const familyDenom =
    totalMonthlyImpact > 0
      ? totalMonthlyImpact
      : resolved.length; // si tous impact=0 (low_emergency_fund seul), on
                         // pondère par le nombre d'entrées de la famille
  const familyDistribution = (Object.keys(familyTotals) as OpportunityFamily[])
    .map((f) => {
      const sum = familyTotals[f];
      const fallbackCount = resolved.filter((o) => o.family === f).length;
      const denom =
        totalMonthlyImpact > 0 ? totalMonthlyImpact : familyDenom || 1;
      const pct =
        totalMonthlyImpact > 0
          ? Math.round((sum / denom) * 100)
          : Math.round((fallbackCount / denom) * 100);
      return { family: f, pct, sum, count: fallbackCount };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.pct - a.pct);

  const wired: OppWiredProps = {
    resolved,
    totalCount,
    highCount,
    totalMonthlyImpact,
    totalYearlyImpact,
    familyDistribution,
    fhsScore,
    formatMoney,
  };

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-opp-row] { grid-template-columns: 1fr !important; }
          [data-opp-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-opp-sidebar] { display: none !important; }
          [data-opp-content] { margin-left: 0 !important; }
          [data-opp-main] { padding: 0 16px 16px 16px !important; }
          [data-opp-topbar] { padding: 0 16px !important; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-opp-sidebar>
          <Sidebar />
        </div>
        <div data-opp-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-opp-main
            style={{
              padding: "0 24px 6px 24px",
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <HeroOpportunites wired={wired} />
              <ScoreCard wired={wired} />
            </div>
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <TopOpportunitesCard wired={wired} />
              <GainsFutursCard wired={wired} />
              <PrioritesCard wired={wired} />
            </div>
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <EvolutionCard />
              <CategoriesCard wired={wired} />
              <ConseilIACard wired={wired} />
            </div>
            <MissionFooter wired={wired} />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Opportunités actif) ═══════════════ */

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
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" active />
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
      data-opp-topbar
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
          Découvrez les meilleures opportunités pour faire grandir votre patrimoine.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "none",
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 999,
              backgroundColor: C.notifBadge,
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            2
          </span>
        </button>
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
/* ═══════════════ ROW 1 ═══════════════ */

function HeroOpportunites({ wired }: { wired: OppWiredProps }) {
  const { totalCount, totalMonthlyImpact, highCount, formatMoney } = wired;
  const hasImpact = totalMonthlyImpact > 0;
  const noun =
    totalCount === 0
      ? "Aucune opportunité"
      : totalCount === 1
        ? "1 opportunité"
        : `${totalCount} opportunités`;
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 20px",
        backgroundColor: C.navy,
        borderRadius: 14,
        boxShadow: SHADOW.navy,
        overflow: "hidden",
        minHeight: 112,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.20) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Opportunités détectées
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                color: "white",
                lineHeight: 1,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.025em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {noun}
            </p>
            {highCount > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.78)" }}>
                dont <span style={{ color: "#5EEAD4", fontWeight: 700 }}>{highCount}</span> haute priorité
              </span>
            )}
          </div>
          {hasImpact ? (
            <>
              <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, letterSpacing: "-0.01em" }}>
                {formatMoney(totalMonthlyImpact)} / mois
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>
                Impact mensuel estimé par le moteur
              </p>
            </>
          ) : totalCount > 0 ? (
            <>
              <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                Impact chiffré non calculable
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>
                Audit qualitatif uniquement pour ce mois
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                Tout est sous contrôle ce mois-ci
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>
                Continuez comme ça
              </p>
            </>
          )}
        </div>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 999,
            backgroundColor: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 18px -6px rgba(0, 0, 0, 0.30)",
            fontSize: 28,
          }}
          aria-hidden
        >
          🎯
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ wired }: { wired: OppWiredProps }) {
  const { totalCount, highCount, totalYearlyImpact, fhsScore, formatMoney } = wired;
  const stats = [
    { label: "Actives", value: String(totalCount), color: C.primary },
    {
      label: "Haute priorité",
      value: String(highCount),
      color: highCount > 0 ? C.coral : C.textMuted,
    },
    {
      label: "Gain annuel",
      value: totalYearlyImpact > 0 ? formatMoney(totalYearlyImpact) : "—",
      color: totalYearlyImpact > 0 ? C.success : C.textMuted,
    },
    {
      label: "Score FHS",
      value: fhsScore !== null ? `${fhsScore} / 100` : "—",
      color: fhsScore !== null ? C.primary : C.textMuted,
    },
  ];
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        minHeight: 112,
      }}
    >
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Score opportunités
      </p>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>{s.label}</p>
            <p
              style={{
                margin: "1px 0 0 0",
                fontSize: 12,
                fontWeight: 700,
                color: s.color,
                fontFamily: "Outfit, Inter, system-ui",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/coach"
        style={{
          marginTop: 6,
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        En parler au coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function TopOpportunitesCard({ wired }: { wired: OppWiredProps }) {
  const items = wired.resolved.slice(0, 4);
  const formatMoney = wired.formatMoney;
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Top opportunités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Détectées sur vos données réelles
      </p>
      {items.length === 0 ? (
        <div
          style={{
            marginTop: 8,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "10px 8px",
            backgroundColor: C.pageBg,
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Aucune opportunité détectée
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
            Le moteur n&apos;a rien trouvé à optimiser ce mois-ci. Complétez vos données pour affiner l&apos;analyse.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {items.map((it) => {
            const fam = FAMILY_META[it.family];
            return (
              <div key={`${it.kind}-${it.title}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: fam.bg, flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={fam.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: C.textDark,
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {it.title}
                  </p>
                  <p style={{ margin: "1px 0 0 0", fontSize: 10.5, fontWeight: 700, color: it.monthlyImpact > 0 ? C.success : C.textMuted, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                    {it.monthlyImpact > 0
                      ? `+${formatMoney(it.monthlyImpact)}/mois`
                      : "Audit qualitatif"}
                  </p>
                </div>
                <span
                  style={{
                    padding: "2px 7px",
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: PRIORITY_STYLE[it.priority].color,
                    backgroundColor: PRIORITY_STYLE[it.priority].bg,
                    borderRadius: 999,
                    flexShrink: 0,
                  }}
                >
                  {PRIORITY_TAG[it.priority]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GainsFutursCard({ wired }: { wired: OppWiredProps }) {
  const { totalYearlyImpact, formatMoney } = wired;
  // Le moteur d'opportunités ne projette PAS de gains cumulés sur 5 ans
  // (pas de modèle de rendement composé, pas de simulateur calibré).
  // On affiche uniquement le gain ANNUEL identifié (chiffre réel du
  // moteur) sans extrapoler 3 ou 5 ans (= invention de rendement).
  const hasImpact = totalYearlyImpact > 0;
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Gain annuel
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Estimé par le moteur
      </p>
      {hasImpact ? (
        <>
          <div style={{ marginTop: 8, padding: "10px 10px", backgroundColor: C.successBg, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 9.5, color: C.success, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Si vous appliquez tout
            </p>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 20,
                fontWeight: 700,
                color: C.success,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.025em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMoney(totalYearlyImpact)}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: 9.5, color: C.success, fontWeight: 600 }}>
              par an, hors rendement
            </p>
          </div>
          <p style={{ margin: "10px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            Projection 3 / 5 ans non affichée : aucun moteur de rendement composé fiable n&apos;existe encore.
          </p>
        </>
      ) : (
        <div
          style={{
            marginTop: 8,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "12px 8px",
            backgroundColor: C.pageBg,
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Pas de gain chiffré
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 200 }}>
            Le moteur n&apos;a identifié aucun gain mensuel à ce stade.
          </p>
        </div>
      )}
    </div>
  );
}

function PrioritesCard({ wired }: { wired: OppWiredProps }) {
  const items = wired.resolved.slice(0, 3);
  const formatMoney = wired.formatMoney;
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Priorités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Actions à enclencher
      </p>
      {items.length === 0 ? (
        <div
          style={{
            marginTop: 8,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "10px 8px",
            backgroundColor: C.pageBg,
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Rien à enclencher
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 200 }}>
            Aucune action prioritaire détectée ce mois.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {items.map((it) => {
            const tagStyle = PRIORITY_STYLE[it.priority];
            const sub =
              it.monthlyImpact > 0
                ? `Économie ${formatMoney(it.monthlyImpact)}/mois`
                : it.body;
            return (
              <div key={`${it.kind}-${it.title}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, backgroundColor: tagStyle.bg, flexShrink: 0, marginTop: 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tagStyle.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 6px",
                      fontSize: 8.5,
                      fontWeight: 700,
                      color: tagStyle.color,
                      backgroundColor: tagStyle.bg,
                      borderRadius: 4,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {PRIORITY_TAG[it.priority]}
                  </span>
                  <p style={{ margin: "2px 0 0 0", fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.25 }}>
                    {it.title}
                  </p>
                  <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionCard() {
  // Empty state honnête : aucun historique d'opportunités détectées
  // n'est tracé en base. Le moteur recalcule à chaque chargement sur
  // le snapshot courant — pas de série temporelle 12 mois disponible.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Historique 12 mois
          </p>
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "12px 8px",
          backgroundColor: C.pageBg,
          borderRadius: 8,
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
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Historique non disponible
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35, maxWidth: 280 }}>
          Le moteur d&apos;opportunités recalcule à chaque visite sur votre snapshot courant. Aucune série temporelle n&apos;est encore archivée.
        </p>
      </div>
    </div>
  );
}

function CategoriesCard({ wired }: { wired: OppWiredProps }) {
  const cats = wired.familyDistribution.map((r) => {
    const meta = FAMILY_META[r.family];
    return { label: meta.label, pct: r.pct, color: meta.color, bg: meta.bg };
  });
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Catégories
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Répartition détectée
      </p>
      {cats.length === 0 ? (
        <div
          style={{
            marginTop: 8,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "10px 8px",
            backgroundColor: C.pageBg,
            borderRadius: 8,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Pas de répartition
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 200 }}>
            Aucune opportunité à répartir ce mois-ci.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {cats.map((c) => (
            <div key={c.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.label}
                </span>
                <span
                  style={{
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 700,
                    color: c.color,
                    backgroundColor: c.bg,
                    borderRadius: 999,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {c.pct}%
                </span>
              </div>
              <div style={{ height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", backgroundColor: c.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConseilIACard({ wired }: { wired: OppWiredProps }) {
  const { totalMonthlyImpact, totalYearlyImpact, totalCount, formatMoney } = wired;
  const hasImpact = totalMonthlyImpact > 0;
  return (
    <div
      style={{
        padding: "15px 14px",
        backgroundColor: C.primaryBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: C.primary,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.primary, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Conseil IA
        </p>
      </div>
      {hasImpact ? (
        <>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {formatMoney(totalMonthlyImpact)}/mois de potentiel identifié.
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            En appliquant ces opportunités, vous pourriez économiser environ <span style={{ color: C.primary, fontWeight: 700 }}>{formatMoney(totalYearlyImpact)}</span> par an (hors rendement composé).
          </p>
        </>
      ) : totalCount > 0 ? (
        <>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            Audit qualitatif uniquement
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            Le moteur a détecté {totalCount} signal{totalCount > 1 ? "s" : ""} à étudier, sans gain chiffré pour l&apos;instant.
          </p>
        </>
      ) : (
        <>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            Tout est sous contrôle ce mois-ci
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            Le moteur n&apos;a rien détecté à optimiser sur vos données actuelles. Continuez comme ça.
          </p>
        </>
      )}
      <Link
        href="/coach"
        style={{
          marginTop: 8,
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: C.primary,
          color: "white",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter({ wired }: { wired: OppWiredProps }) {
  const { totalCount, highCount, totalYearlyImpact, formatMoney } = wired;
  const hasImpact = totalYearlyImpact > 0;
  // Pas de notion "exploité" trackée → on remplace la barre par un
  // headline honnête (impact annuel OU compte d'opportunités).
  return (
    <div
      style={{
        padding: "13px 16px",
        backgroundColor: C.navy,
        borderRadius: 12,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.14)",
            flexShrink: 0,
            fontSize: 16,
          }}
          aria-hidden
        >
          🚀
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {hasImpact ? (
              <>
                Potentiel annuel identifié{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(totalYearlyImpact)} / an
                </span>
              </>
            ) : totalCount > 0 ? (
              <>
                {totalCount} opportunité{totalCount > 1 ? "s" : ""} détectée
                {totalCount > 1 ? "s" : ""} — audit qualitatif
              </>
            ) : (
              <>Aucune opportunité détectée ce mois-ci</>
            )}
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.3 }}>
            {totalCount === 0 ? (
              <>Le moteur n&apos;a rien trouvé à optimiser. Complétez vos données pour affiner l&apos;analyse.</>
            ) : highCount > 0 ? (
              <>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{highCount}</span>{" "}
                opportunité{highCount > 1 ? "s" : ""} en haute priorité — à enclencher
                en premier.
              </>
            ) : (
              <>Toutes les opportunités sont de priorité moyenne ou basse — pas d&apos;urgence.</>
            )}
          </p>
        </div>
      </div>
      <Link
        href="/coach"
        style={{
          padding: "9px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: "white",
          color: C.navy,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        En parler au coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * Phase 5.0 — /design-match/epargne-v3
 *
 * Page Épargne V3 — cockpit financier dense aligné sur Revenus V3
 * (référence cockpit officielle). Mêmes tokens, mêmes hauteurs,
 * mêmes patterns que dashboard-v3, coach-v3, plan-v3, revenus-v3,
 * depenses-v3, budget-v3 et objectifs-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr) : EpargneHero navy · RythmeEpargneCard
 *   Row 2 (1.2fr / 1fr / 1fr) : RepartitionCard · ObjectifsEpargneCard · RecommandationsCard
 *   Row 3 (1.3fr / 1fr / 1fr) : EvolutionCard · SimulateurCard · ProduitsCard
 *   Row 4 (full width)  : ConseilIAFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import { formatUserCurrency } from "@/lib/utils";
import { GOAL_TYPES } from "@/lib/constants";
import type { Goal } from "@/types/database";
import { V3TopbarMenu } from "@/components/layout/v3-topbar-menu";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return {
    title: `${t("epargne")} — LIBERIA`,
  };
}

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

// Goal types considérés comme "épargne" pour cette page. Le pattern
// est cohérent avec lib/constants/index.ts : on filtre par
// emergency_fund + savings + purchase + travel (les types qui
// alimentent typiquement un compte épargne).
const SAVINGS_GOAL_TYPES = new Set<string>([
  "emergency_fund",
  "savings",
  "purchase",
  "travel",
]);

function goalTypeLabel(id: string): string {
  return GOAL_TYPES.find((t) => t.id === id)?.label ?? "Autre";
}

type RateTone = "excellent" | "good" | "improve" | "negative";

type SavingsWired = {
  totalSavings: number;
  hasSavings: boolean;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCapacity: number;
  capacityRate: number | null;
  rateTone: RateTone;
  runwayMonths: number | null;
  emergencyTarget: number | null;
  emergencyCoveragePct: number | null;
  hasEmergencyFundFlag: boolean;
  savingsGoals: Goal[];
  primarySavingsGoal: Goal | null;
  totalGoalsTarget: number;
  globalGoalsCoveragePct: number | null;
  formatMoney: (n: number) => string;
};

export default async function DesignMatchEpargneV3() {
  /* ------------------------------------------------------------------ */
  /*  Data fetch + agrégats finance                                      */
  /* ------------------------------------------------------------------ */

  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const monthlyExpenses = fixedExpenses + variableExpenses;
  // Capacité d'épargne mensuelle = cashflow positif. Source de vérité
  // unique alignée sur Dashboard / Plan / Opportunités.
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const monthlyCapacity = Math.max(0, cashflow);
  const capacityRate =
    monthlyIncome > 0 ? monthlyCapacity / monthlyIncome : null;
  const rateTone: RateTone =
    capacityRate === null
      ? "improve"
      : capacityRate >= 0.2
        ? "excellent"
        : capacityRate >= 0.1
          ? "good"
          : cashflow >= 0
            ? "improve"
            : "negative";

  const totalSavings = data.financialProfile?.current_savings ?? 0;
  const hasSavings = totalSavings > 0;
  const runwayRaw = calculateRunway({
    currentSavings: totalSavings,
    monthlyExpenses,
  });
  const runwayMonths =
    Number.isFinite(runwayRaw) && monthlyExpenses > 0 ? runwayRaw : null;
  const emergencyTarget =
    monthlyExpenses > 0 ? monthlyExpenses * 3 : null;
  const emergencyCoveragePct =
    emergencyTarget !== null && emergencyTarget > 0
      ? Math.min(100, Math.round((totalSavings / emergencyTarget) * 100))
      : null;

  /* ------------------------------------------------------------------ */
  /*  Goals — filtrés type "épargne"                                     */
  /* ------------------------------------------------------------------ */

  const savingsGoals = data.goals.filter(
    (g) => !g.is_completed && SAVINGS_GOAL_TYPES.has(g.type),
  );
  // Goal "primaire" pour le hero : un emergency_fund actif en priorité,
  // sinon le goal d'épargne avec la plus grande target_amount.
  const emergencyGoal =
    savingsGoals.find((g) => g.type === "emergency_fund") ?? null;
  const primarySavingsGoal =
    emergencyGoal ??
    [...savingsGoals].sort((a, b) => b.target_amount - a.target_amount)[0] ??
    null;
  const totalGoalsTarget = savingsGoals.reduce(
    (acc, g) => acc + g.target_amount,
    0,
  );
  const totalGoalsCurrent = savingsGoals.reduce(
    (acc, g) => acc + g.current_amount,
    0,
  );
  const globalGoalsCoveragePct =
    totalGoalsTarget > 0
      ? Math.min(100, Math.round((totalGoalsCurrent / totalGoalsTarget) * 100))
      : null;

  /* ------------------------------------------------------------------ */
  /*  Format helper                                                       */
  /* ------------------------------------------------------------------ */

  const profile = {
    currency: data.profile.currency,
    locale: data.profile.locale ?? null,
    country: data.profile.country ?? null,
  };
  const formatMoney = (n: number) => formatUserCurrency(n, profile);

  // Eslint silencieux : cashflow gardé pour cohérence inter-pages V3.
  void cashflow;

  const wired: SavingsWired = {
    totalSavings,
    hasSavings,
    monthlyIncome,
    monthlyExpenses,
    monthlyCapacity,
    capacityRate,
    rateTone,
    runwayMonths,
    emergencyTarget,
    emergencyCoveragePct,
    hasEmergencyFundFlag: data.financialProfile?.has_emergency_fund ?? false,
    savingsGoals,
    primarySavingsGoal,
    totalGoalsTarget,
    globalGoalsCoveragePct,
    formatMoney,
  };

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-epa-row] { grid-template-columns: 1fr !important; }
          [data-epa-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-epa-sidebar] { display: none !important; }
          [data-epa-content] { margin-left: 0 !important; }
          [data-epa-main] { padding: 0 16px 16px 16px !important; }
          [data-epa-topbar] { padding: 0 16px !important; }
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
        <div data-epa-sidebar>
          <Sidebar />
        </div>
        <div data-epa-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-epa-main
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
            <div data-epa-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 6 }}>
              <EpargneHero wired={wired} />
              <RythmeEpargneCard wired={wired} />
            </div>
            <div data-epa-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 6 }}>
              <RepartitionCard wired={wired} />
              <ObjectifsEpargneCard wired={wired} />
              <RecommandationsCard wired={wired} />
            </div>
            <div data-epa-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 6 }}>
              <EvolutionCard />
              <SimulateurCard wired={wired} />
              <ProduitsCard />
            </div>
            <ConseilIAFooter wired={wired} />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Épargne actif) ═══════════════ */

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
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" active />
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
      data-epa-topbar
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
          Développez votre épargne et sécurisez votre avenir.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <V3TopbarMenu fullName={fullName} />
      </div>
    </header>
  );
}
/* ═══════════════ ROW 1 ═══════════════ */

function EpargneHero({ wired }: { wired: SavingsWired }) {
  const {
    totalSavings,
    hasSavings,
    primarySavingsGoal,
    formatMoney,
  } = wired;
  const target =
    primarySavingsGoal?.target_amount && primarySavingsGoal.target_amount > 0
      ? primarySavingsGoal.target_amount
      : null;
  const pct =
    target !== null
      ? Math.min(100, Math.max(0, Math.round((totalSavings / target) * 100)))
      : null;
  const goalLabel =
    primarySavingsGoal?.title?.trim() ||
    (primarySavingsGoal ? goalTypeLabel(primarySavingsGoal.type) : null);
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
            Épargne totale
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
              {hasSavings ? formatMoney(totalSavings) : "Non renseignée"}
            </p>
          </div>
          {target !== null && goalLabel ? (
            <>
              <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
                {goalLabel}&nbsp;:{" "}
                <span style={{ fontWeight: 600, color: "white", fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(target)}
                </span>
              </p>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
                  <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
                  {pct}%
                </span>
              </div>
            </>
          ) : (
            <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, maxWidth: 360 }}>
              {hasSavings
                ? "Définissez un objectif d'épargne pour suivre votre progression."
                : "Renseignez votre épargne actuelle dans votre profil financier."}
            </p>
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
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" />
            <path d="M2 9v1c0 1.1.9 2 2 2h1" />
            <path d="M16 11h0" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function RythmeEpargneCard({ wired }: { wired: SavingsWired }) {
  const { monthlyCapacity, capacityRate, rateTone, formatMoney } = wired;
  const tones: Record<RateTone, { label: string; color: string; bg: string }> = {
    excellent: { label: "Excellent rythme", color: C.success, bg: C.successBg },
    good: { label: "Bon rythme", color: C.primary, bg: C.primaryBg },
    improve: { label: "Marge à améliorer", color: C.amber, bg: C.amberBg },
    negative: { label: "Cashflow négatif", color: C.coral, bg: C.coralBg },
  };
  const tone = tones[rateTone];
  const hasData = wired.monthlyIncome > 0 || wired.monthlyExpenses > 0;
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
        Votre capacité d&apos;épargne
      </p>
      {hasData ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.textDark,
                  fontFamily: "Outfit, Inter, system-ui",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMoney(monthlyCapacity)}
                <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}> /mois</span>
              </p>
              <p style={{ margin: "3px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
                {capacityRate !== null ? (
                  <>
                    <span style={{ color: C.textDark, fontWeight: 600 }}>
                      {Math.round(capacityRate * 100)}%
                    </span>{" "}
                    de vos revenus
                  </>
                ) : (
                  <>Revenus non renseignés</>
                )}
              </p>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              padding: "2px 7px",
              borderRadius: 999,
              backgroundColor: tone.bg,
              fontSize: 10,
              fontWeight: 700,
              color: tone.color,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {tone.label}
          </span>
        </>
      ) : (
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
          Renseignez vos revenus et dépenses pour révéler votre capacité d&apos;épargne mensuelle.
        </p>
      )}
      <Link
        href="/coach"
        style={{
          marginTop: "auto",
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
        Voir mes recommandations
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function RepartitionCard({ wired }: { wired: SavingsWired }) {
  // Le modèle de données stocke un total unique (current_savings) :
  // aucune ventilation par type (fonds d'urgence / projets / retraite /
  // libre) n'est trackée. Empty state honnête + total centré.
  const { totalSavings, hasSavings, formatMoney } = wired;
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Par type d&apos;épargne
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flex: 1 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" width={104} height={104}>
            <circle cx={50} cy={50} r={42} fill={C.pageBg} />
            <circle cx={50} cy={50} r={28} fill={C.cardBg} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {hasSavings ? (
              <>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {formatMoney(totalSavings)}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  Total
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 9, color: C.textMuted, textAlign: "center", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Non<br />renseigné
              </p>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Ventilation non disponible
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>
            Votre épargne est stockée comme un total unique. La répartition par type (fonds d&apos;urgence, projets, retraite, libre) n&apos;est pas encore trackée.
          </p>
        </div>
      </div>
    </div>
  );
}

function ObjectifsEpargneCard({ wired }: { wired: SavingsWired }) {
  const { savingsGoals, formatMoney } = wired;
  // Top 3 par target_amount desc — pour mettre en avant les goals
  // structurants.
  const goals = [...savingsGoals]
    .sort((a, b) => b.target_amount - a.target_amount)
    .slice(0, 3);
  const palette = [
    { color: C.success, bg: C.successBg },
    { color: C.primary, bg: C.primaryBg },
    { color: C.violet, bg: C.violetBg },
  ];
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Objectifs d&apos;épargne
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Suivi de vos objectifs
      </p>
      {goals.length === 0 ? (
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
            Aucun objectif d&apos;épargne
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 200 }}>
            Définissez un fonds d&apos;urgence ou un objectif d&apos;épargne pour suivre votre progression.
          </p>
          <Link
            href="/goals"
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: C.primary,
              textDecoration: "none",
            }}
          >
            Définir un objectif
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          {goals.map((g, i) => {
            const target = g.target_amount;
            const current = g.current_amount;
            const pct =
              target > 0
                ? Math.min(100, Math.max(0, Math.round((current / target) * 100)))
                : 0;
            const tone = palette[i % palette.length];
            const label = g.title?.trim() || goalTypeLabel(g.type);
            return (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, backgroundColor: tone.bg, flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={tone.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 9.5, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                      {formatMoney(current)} / {formatMoney(target)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: tone.color, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 9.5, color: tone.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecommandationsCard({ wired }: { wired: SavingsWired }) {
  // Recommandations dérivées des métriques réelles uniquement — pas
  // de catalogue mocké. Chaque item s'affiche seulement si la
  // condition factuelle est vraie.
  const items: {
    label: string;
    sub: string;
    action: string;
    href: string;
    color: string;
    bg: string;
    iconPath: string;
  }[] = [];
  if (wired.runwayMonths !== null && wired.runwayMonths < 3) {
    items.push({
      label: "Constituer un fonds d'urgence",
      sub: `Vous avez ${wired.runwayMonths.toFixed(1)} mois de sécurité. Cible : 3 mois.`,
      action: "Alimenter",
      href: "/coach",
      color: C.coral,
      bg: C.coralBg,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    });
  }
  if (wired.savingsGoals.length === 0) {
    items.push({
      label: "Définir un objectif d'épargne",
      sub: "Aucun objectif d'épargne actif aujourd'hui.",
      action: "Définir",
      href: "/goals",
      color: C.primary,
      bg: C.primaryBg,
      iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    });
  }
  if (wired.monthlyCapacity > 0 && wired.capacityRate !== null && wired.capacityRate < 0.1) {
    items.push({
      label: "Augmenter votre taux d'épargne",
      sub: `${Math.round(wired.capacityRate * 100)}% aujourd'hui. Cible de démarrage : 10%.`,
      action: "Voir comment",
      href: "/coach",
      color: C.amber,
      bg: C.amberBg,
      iconPath: "M3 3v18h18|M7 14l4-4 4 4 5-5",
    });
  }
  if (wired.monthlyCapacity <= 0 && wired.monthlyIncome > 0) {
    items.push({
      label: "Cashflow à équilibrer",
      sub: "Vos dépenses dépassent vos revenus mensuels.",
      action: "Auditer",
      href: "/design-match/depenses-v3",
      color: C.coral,
      bg: C.coralBg,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    });
  }
  if (wired.runwayMonths !== null && wired.runwayMonths >= 3 && wired.monthlyCapacity > 0) {
    items.push({
      label: "Continuer ce rythme",
      sub: "Votre fonds d'urgence est constitué — restez régulier.",
      action: "Voir le plan",
      href: "/plan",
      color: C.success,
      bg: C.successBg,
      iconPath: "M9 11 12 14 22 4",
    });
  }
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Recommandations
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Que faire avec mon épargne
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
            Aucune recommandation
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 200 }}>
            Complétez vos revenus, dépenses et objectifs pour révéler des actions concrètes.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {items.slice(0, 3).map((it) => (
            <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: it.bg, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                  {it.label}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {it.sub}
                </p>
              </div>
              <Link
                href={it.href}
                style={{
                  padding: "3px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: it.color,
                  backgroundColor: "white",
                  border: `1px solid ${C.borderGhost}`,
                  borderRadius: 6,
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                {it.action}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionCard() {
  // Empty state honnête : la base ne stocke qu'une snapshot
  // (current_savings) sans série temporelle. Aucune courbe 12 mois
  // ne peut être reconstituée sans inventer les valeurs.
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
          Seul votre solde d&apos;épargne actuel est stocké. La série temporelle 12 mois sera tracée dès la mise en place du suivi mensuel.
        </p>
      </div>
    </div>
  );
}

function SimulateurCard({ wired }: { wired: SavingsWired }) {
  const { totalSavings, monthlyCapacity, runwayMonths, formatMoney } = wired;
  // Aucun moteur de rendement composé fiable n'existe (pas de taux
  // calibré, pas de scénarios). On affiche uniquement les faits
  // observables : épargne actuelle, capacité mensuelle, autonomie.
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Vos chiffres réels
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Pas de projection 10 ans
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4 }}>
        LIBERIA n&apos;invente pas de rendement futur. Tes chiffres réels :
      </p>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Épargne actuelle</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            {totalSavings > 0 ? formatMoney(totalSavings) : "—"}
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Capacité / mois</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            {monthlyCapacity > 0 ? formatMoney(monthlyCapacity) : "—"}
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Autonomie</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            {runwayMonths !== null ? `${runwayMonths.toFixed(1)} mois` : "—"}
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Cible urgence</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            {wired.emergencyTarget !== null ? formatMoney(wired.emergencyTarget) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProduitsCard() {
  // Empty state honnête : aucun catalogue de produits financiers
  // (taux, partenaires, avantages fiscaux) n'est intégré. Afficher
  // des taux comme 1.25% / 1.60% serait inventer des données.
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Produits recommandés
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sélection personnalisée
      </p>
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Aucun produit à recommander
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35, maxWidth: 260 }}>
          LIBERIA ne recommande aucun produit d&apos;épargne nommé. Ton coach peut t&apos;orienter sur les principes (comptes, 3e pilier, comptes à terme).
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 4 — CONSEIL IA FOOTER ═══════════════ */

function ConseilIAFooter({ wired }: { wired: SavingsWired }) {
  const { runwayMonths, monthlyCapacity, formatMoney, savingsGoals } = wired;
  // Copie adaptative pilotée par les faits :
  //  1. cashflow négatif → priorité équilibre budget
  //  2. runway < 3 mois → priorité constitution coussin
  //  3. aucun goal d'épargne → priorité définition objectif
  //  4. cas favorable → encouragement régularité
  const copy = (() => {
    if (monthlyCapacity <= 0 && wired.monthlyIncome > 0) {
      return "Vos dépenses dépassent vos revenus ce mois-ci. Auditons d'abord vos charges avant de viser une cible d'épargne.";
    }
    if (runwayMonths !== null && runwayMonths < 1) {
      return `Vous avez moins d'un mois de coussin. Construire un fonds d'urgence est votre priorité absolue avant tout autre objectif.`;
    }
    if (runwayMonths !== null && runwayMonths < 3) {
      return `Vous couvrez ${runwayMonths.toFixed(1)} mois de dépenses. La cible canonique est 3 mois — c'est votre prochain palier.`;
    }
    if (savingsGoals.length === 0) {
      return "Votre fonds de sécurité est en place. Définissez un objectif d'épargne pour donner une direction à votre capacité mensuelle.";
    }
    if (monthlyCapacity > 0) {
      return `Vous dégagez ${formatMoney(monthlyCapacity)} d'épargne mensuelle. Restez régulier — c'est votre meilleur levier.`;
    }
    return "Complétez vos revenus, dépenses et objectifs pour révéler votre prochaine action.";
  })();
  return (
    <div
      style={{
        padding: "15px 16px",
        backgroundColor: C.navy,
        borderRadius: 12,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.14)",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Conseil de votre coach IA
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            {copy}
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
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}


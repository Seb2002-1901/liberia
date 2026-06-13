/**
 * Phase 5.0 — /design-match/budget-v3
 *
 * Page Budget V3 — cockpit financier dense aligné sur dashboard-v3,
 * coach-v3, plan-v3, revenus-v3 et depenses-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 : BudgetHero navy · AperçuRapideCard
 *   Row 2 : BudgetCategorieCard · SanteBudgetCard
 *   Row 3 : EvolutionBudgetCard · AlerteBudgetaireCard
 *   Row 4 : ProjectionEpargneCard · RepartitionIdealeCard · ActionsRapidesCard
 *   Row 5 : ConseilIACard (bandeau pleine largeur)
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatUserCurrency } from "@/lib/utils";
import {
  computeBudgetProgress,
  computeGoalAchievementScore,
  type BudgetProgress,
} from "@/lib/calculations/budget-goals";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return { title: `${t("budget")} — LIBERIA` };
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
  dangerBg: "#FEE2E2",
  donutGrey: "#CBD5E1",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

/* ═══════════════ TYPES & HELPERS ═══════════════ */

type Profile = Parameters<typeof formatUserCurrency>[1];

interface CategoryRow {
  id: string;
  label: string;
  prevu: number;
  reel: number;
  pct: number;
  color: string;
  status: "ok" | "warn" | "over";
}

const CATEGORY_COLORS_BUDGET: string[] = [
  "#2563EB", // primary
  "#10A37F", // success
  "#F59E0B", // amber
  "#9061F9", // violet
  "#F97757", // coral
  "#CBD5E1", // donutGrey
];

function getExpenseLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? "Autre";
}

function isEssentialCategory(id: string): boolean {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.essential ?? false;
}

function statusFromProgress(p: BudgetProgress): "ok" | "warn" | "over" {
  if (p.status === "SUCCESS") return "ok";
  if (p.status === "WARNING") return "warn";
  return "over";
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchBudgetV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats budget                                                   */
  /* ------------------------------------------------------------------ */

  const budgets = data.categoryBudgets;
  const hasBudgets = budgets.length > 0;

  // Progression par catégorie (prévu vs réel ce mois)
  const progressList = hasBudgets
    ? computeBudgetProgress(
        budgets.map((b) => ({
          category: b.category,
          monthly_limit: b.monthly_limit,
        })),
        data.expenses,
      )
    : [];

  // Totaux
  const totalBudget = budgets.reduce((s, b) => s + (b.monthly_limit || 0), 0);
  const totalSpentBudgeted = progressList.reduce(
    (s, p) => s + p.currentSpent,
    0,
  );
  const remaining = totalBudget - totalSpentBudgeted;
  const utilizationPct =
    totalBudget > 0
      ? Math.max(0, Math.round((totalSpentBudgeted / totalBudget) * 100))
      : null;

  // Revenus prévus = totalMonthly(data.incomes) ou financialProfile
  const monthlyIncome =
    totalMonthly(data.incomes) ||
    data.financialProfile?.monthly_income ||
    0;
  const hasIncome = monthlyIncome > 0;
  const expectedSavings = monthlyIncome - totalBudget;

  // Rows pour le tableau / donut Budget par catégorie
  const sortedProgress = [...progressList].sort(
    (a, b) => b.targetAmount - a.targetAmount,
  );
  const TOP_N = 5;
  const topRows = sortedProgress.slice(0, TOP_N);
  const restRows = sortedProgress.slice(TOP_N);
  const categoryRows: CategoryRow[] = topRows.map((p, idx) => ({
    id: p.category,
    label: getExpenseLabel(p.category),
    prevu: p.targetAmount,
    reel: p.currentSpent,
    pct:
      totalBudget > 0
        ? Math.round((p.targetAmount / totalBudget) * 100)
        : 0,
    color: CATEGORY_COLORS_BUDGET[idx % CATEGORY_COLORS_BUDGET.length],
    status: statusFromProgress(p),
  }));
  if (restRows.length > 0) {
    const restPrevu = restRows.reduce((s, p) => s + p.targetAmount, 0);
    const restReel = restRows.reduce((s, p) => s + p.currentSpent, 0);
    const restOverrun = restRows.some((p) => p.status !== "SUCCESS");
    categoryRows.push({
      id: "autres",
      label: "Autres",
      prevu: restPrevu,
      reel: restReel,
      pct:
        totalBudget > 0
          ? Math.round((restPrevu / totalBudget) * 100)
          : 0,
      color: "#CBD5E1",
      status: restOverrun ? "warn" : "ok",
    });
  }

  // Santé du budget — score sur 100
  const achievement = computeGoalAchievementScore(progressList);
  const healthScore = hasBudgets
    ? Math.round(achievement.score * 100)
    : null;

  // Alerte budgétaire — première catégorie en overrun (puis warning sinon)
  const overrunCandidate =
    progressList.find((p) => p.status === "OVER_LIMIT") ??
    progressList.find((p) => p.status === "WARNING") ??
    null;
  const overBudgetCount = progressList.filter(
    (p) => p.status === "OVER_LIMIT",
  ).length;

  // Répartition 50/30/20 — basée sur les budgets configurés
  const besoinsBudget = budgets
    .filter((b) => isEssentialCategory(b.category))
    .reduce((s, b) => s + b.monthly_limit, 0);
  const enviesBudget = budgets
    .filter((b) => !isEssentialCategory(b.category))
    .reduce((s, b) => s + b.monthly_limit, 0);
  const epargneBudget = Math.max(0, monthlyIncome - totalBudget);
  const splitBase = besoinsBudget + enviesBudget + epargneBudget;
  const splitRows =
    splitBase > 0 && hasIncome
      ? [
          {
            tag: "50%",
            label: "Besoins",
            amount: besoinsBudget,
            pct: Math.round((besoinsBudget / splitBase) * 100),
            color: "#2563EB",
          },
          {
            tag: "30%",
            label: "Envies",
            amount: enviesBudget,
            pct: Math.round((enviesBudget / splitBase) * 100),
            color: "#F97757",
          },
          {
            tag: "20%",
            label: "Épargne",
            amount: epargneBudget,
            pct: Math.round((epargneBudget / splitBase) * 100),
            color: "#CBD5E1",
          },
        ]
      : [];

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-bud-row] { grid-template-columns: 1fr !important; }
          [data-bud-main] { padding: 0 20px 12px 20px !important; gap: 12px !important; }
        }
        @media (max-width: 999px) {
          [data-bud-sidebar] { display: none !important; }
          [data-bud-content] { margin-left: 0 !important; }
          [data-bud-main] { padding: 0 16px 16px 16px !important; }
          [data-bud-topbar] { padding: 0 16px !important; }
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
        <div data-bud-sidebar>
          <Sidebar />
        </div>
        <div data-bud-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-bud-main
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
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <BudgetHero
                remaining={remaining}
                totalBudget={totalBudget}
                utilizationPct={utilizationPct}
                profile={data.profile}
              />
              <AperçuRapideCard
                monthlyIncome={monthlyIncome}
                totalBudget={totalBudget}
                expectedSavings={expectedSavings}
                hasIncome={hasIncome}
                hasBudgets={hasBudgets}
                profile={data.profile}
              />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <BudgetCategorieCard
                rows={categoryRows}
                totalBudget={totalBudget}
                profile={data.profile}
              />
              <SanteBudgetCard
                score={healthScore}
                respected={achievement.respected}
                total={achievement.total}
              />
              <AlerteBudgetaireCard
                candidate={overrunCandidate}
                overrunCount={overBudgetCount}
                hasBudgets={hasBudgets}
                profile={data.profile}
              />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
              <EvolutionBudgetCard />
              <ProjectionEpargneCard
                expectedSavings={expectedSavings}
                hasIncome={hasIncome}
                hasBudgets={hasBudgets}
                profile={data.profile}
              />
              <RepartitionIdealeCard rows={splitRows} profile={data.profile} />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 8 }}>
              <ActionsRapidesCard />
              <ConseilIACard
                hasBudgets={hasBudgets}
                healthScore={healthScore}
                overrunCount={overBudgetCount}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Budget actif) ═══════════════ */

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
          <NavItem label="Budget" href="/design-match/budget-v3" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" active />
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
  const displayName = firstName ?? "";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-bud-topbar
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
          Gérez votre budget et gardez le contrôle de vos finances.
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
/* ═══════════════ ROW 1 ═══════════════ */

function BudgetHero({
  remaining,
  totalBudget,
  utilizationPct,
  profile,
}: {
  remaining: number;
  totalBudget: number;
  utilizationPct: number | null;
  profile: Profile;
}) {
  const hasBudget = totalBudget > 0;
  const isOver = remaining < 0;
  const amountText = hasBudget
    ? formatUserCurrency(Math.abs(remaining), profile)
    : "À configurer";
  const amountSubline = hasBudget
    ? isOver
      ? `dépassement sur ${formatUserCurrency(totalBudget, profile)}`
      : `restants sur ${formatUserCurrency(totalBudget, profile)}`
    : "Définis tes budgets par catégorie";
  const pct = utilizationPct ?? 0;
  const barWidth = `${Math.min(100, pct)}%`;
  const badgeKind: "success" | "warning" | "danger" | null = hasBudget
    ? pct > 100
      ? "danger"
      : pct >= 80
        ? "warning"
        : "success"
    : null;
  const badgeText =
    badgeKind === "success"
      ? "Sur la bonne voie"
      : badgeKind === "warning"
        ? "Vigilance"
        : badgeKind === "danger"
          ? "Dépassement"
          : "";
  const badgeBg =
    badgeKind === "success"
      ? "rgba(16, 163, 127, 0.20)"
      : badgeKind === "warning"
        ? "rgba(245, 158, 11, 0.22)"
        : badgeKind === "danger"
          ? "rgba(249, 119, 87, 0.22)"
          : "rgba(255,255,255,0.12)";
  const badgeColor =
    badgeKind === "success"
      ? "#5EEAD4"
      : badgeKind === "warning"
        ? "#FCD34D"
        : badgeKind === "danger"
          ? "#FCA5A5"
          : "rgba(255,255,255,0.7)";
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
      <div style={{ position: "relative" }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Budget de ce mois
        </p>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: hasBudget ? 28 : 22,
            fontWeight: 700,
            color: "white",
            lineHeight: 1,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {amountText}
        </p>
        <p style={{ margin: "3px 0 0 0", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          {amountSubline}
        </p>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
          <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>
            {hasBudget ? `${pct} % utilisé` : "Aucun budget défini"}
          </span>
          {badgeKind && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                backgroundColor: badgeBg,
                fontSize: 10,
                fontWeight: 700,
                color: badgeColor,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AperçuRapideCard({
  monthlyIncome,
  totalBudget,
  expectedSavings,
  hasIncome,
  hasBudgets,
  profile,
}: {
  monthlyIncome: number;
  totalBudget: number;
  expectedSavings: number;
  hasIncome: boolean;
  hasBudgets: boolean;
  profile: Profile;
}) {
  // Note : "vs mois dernier" supprimé — aucun historique mensuel
  // n'est tracké pour ces 3 indicateurs.
  const rows = [
    {
      label: "Revenus prévus",
      value: hasIncome ? formatUserCurrency(monthlyIncome, profile) : "—",
    },
    {
      label: "Dépenses prévues",
      value: hasBudgets ? formatUserCurrency(totalBudget, profile) : "—",
    },
    {
      label: "Épargne prévue",
      value:
        hasIncome && hasBudgets
          ? formatUserCurrency(expectedSavings, profile)
          : "—",
    },
  ];
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        minHeight: 116,
      }}
    >
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Aperçu rapide
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 10, flex: 1, alignItems: "center" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>
              {r.label}
            </p>
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: 16,
                fontWeight: 700,
                color: r.value === "—" ? C.textMuted : C.textDark,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function BudgetCategorieCard({
  rows,
  totalBudget,
  profile,
}: {
  rows: CategoryRow[];
  totalBudget: number;
  profile: Profile;
}) {
  let cursor = -90;
  const gap = 1;
  const usableDeg = 360 - gap * Math.max(rows.length, 1);
  const total = rows.reduce((s, x) => s + x.pct, 0) || 1;
  const slicesWithPaths = rows.map((s) => {
    const sweep = (s.pct / total) * usableDeg;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
    cursor = endDeg + gap;
    return { ...s, path };
  });
  // Centre du donut : total budget compact (5K, 18K, etc.) ou —
  const centerAmount = (() => {
    if (totalBudget <= 0) return "—";
    if (totalBudget >= 1_000_000)
      return `${(totalBudget / 1_000_000).toFixed(1)}M`;
    if (totalBudget >= 1_000) return `${Math.round(totalBudget / 1_000)}K`;
    return `${Math.round(totalBudget)}`;
  })();
  const currencyLabel = profile?.currency ?? "CHF";
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Budget par catégorie
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Prévu vs Réel
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucun budget par catégorie défini. Demande à ton coach pour structurer ton premier budget.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
          <div style={{ position: "relative", flexShrink: 0, width: 90, height: 90 }}>
            <svg viewBox="0 0 100 100" width={90} height={90}>
              {slicesWithPaths.map((s) => (
                <path key={s.id} d={s.path} fill={s.color} />
              ))}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {centerAmount}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted, letterSpacing: "0.14em" }}>
                {currencyLabel}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted }}>
                Budget
              </p>
            </div>
          </div>
          <table style={{ flex: 1, borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borderGhost}` }}>
                <th style={{ textAlign: "left", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>CATÉGORIE</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>PRÉVU</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>RÉEL</th>
                <th style={{ width: 22, textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>✓</th>
              </tr>
            </thead>
            <tbody>
              {slicesWithPaths.map((s, i) => {
                const reelColor =
                  s.status === "ok"
                    ? C.textDark
                    : s.status === "warn"
                      ? C.amber
                      : C.danger;
                return (
                  <tr key={s.id} style={{ borderBottom: i === slicesWithPaths.length - 1 ? "none" : `1px solid ${C.borderGhost}` }}>
                    <td style={{ padding: "3px 0", color: C.textDark, fontWeight: 500 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 999, backgroundColor: s.color }} />
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: "3px 0", color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatUserCurrency(s.prevu, profile)}</td>
                    <td style={{ padding: "3px 0", color: reelColor, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatUserCurrency(s.reel, profile)}</td>
                    <td style={{ padding: "3px 0", textAlign: "right" }}>
                      <StatusIcon ok={s.status === "ok"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: ok ? C.successBg : C.amberBg,
      }}
    >
      {ok ? (
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
    </span>
  );
}

function SanteBudgetCard({
  score,
  respected,
  total,
}: {
  score: number | null;
  respected: number;
  total: number;
}) {
  const hasScore = score !== null;
  // Semi-circle gauge : arc top half (-180 to 0 deg)
  const r = 38;
  const cx = 50;
  const cy = 50;
  const startAngle = -180;
  const endAngle = hasScore
    ? startAngle + 180 * (score / 100)
    : startAngle;
  const arcPath = gaugeArcD(cx, cy, r, startAngle, endAngle);
  const trackPath = gaugeArcD(cx, cy, r, -180, 0);
  const scoreColor = !hasScore
    ? C.textLight
    : score >= 75
      ? C.success
      : score >= 50
        ? C.amber
        : C.danger;
  // Texte adaptatif selon score
  const banner: { title: string; body: string; bg: string; fg: string } =
    !hasScore
      ? {
          title: "À configurer",
          body: "Définis tes budgets par catégorie pour calculer ton score.",
          bg: C.pageBg,
          fg: C.textMuted,
        }
      : score >= 75
        ? {
            title: "Excellent !",
            body: `Tu respectes ${respected} budget${respected > 1 ? "s" : ""} sur ${total}.`,
            bg: C.successBg,
            fg: C.success,
          }
        : score >= 50
          ? {
              title: "Vigilance",
              body: `${respected}/${total} budgets respectés ce mois.`,
              bg: C.amberBg,
              fg: C.amber,
            }
          : {
              title: "Attention",
              body: `${respected}/${total} budgets respectés. Plusieurs dépassements.`,
              bg: C.coralBg,
              fg: C.danger,
            };
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Santé du budget
      </p>
      <div style={{ position: "relative", width: 110, height: 62, margin: "4px auto 0 auto" }}>
        <svg viewBox="0 0 100 60" width={110} height={62}>
          <path d={trackPath} fill="none" stroke={C.borderGhost} strokeWidth="8" strokeLinecap="round" />
          {hasScore && (
            <path d={arcPath} fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round" />
          )}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: hasScore ? C.textDark : C.textMuted, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.025em", lineHeight: 1 }}>
            {hasScore ? score : "—"}<span style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 500 }}>/100</span>
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>
            Score budget
          </p>
        </div>
      </div>
      <div style={{ marginTop: 6, padding: "5px 8px", backgroundColor: banner.bg, borderRadius: 7, display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 4, backgroundColor: banner.fg, flexShrink: 0, marginTop: 1 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: banner.fg }}>{banner.title}</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textDark, lineHeight: 1.3 }}>
            {banner.body}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionBudgetCard() {
  // Historique mensuel (bars dépenses réelles + line budget prévu)
  // pas encore matérialisé : aucune table de snapshot budget_history
  // n'existe. Empty state premium.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution du budget
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Sur les 6 derniers mois
          </p>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 105,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 8px",
          textAlign: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
        <p style={{ margin: "8px 0 0 0", fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Historique non disponible
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, maxWidth: 240 }}>
          L&apos;évolution mois après mois de tes dépenses réelles vs ton budget prévu s&apos;affichera dès le deuxième cycle complet.
        </p>
      </div>
    </div>
  );
}

function AlerteBudgetaireCard({
  candidate,
  overrunCount,
  hasBudgets,
  profile,
}: {
  candidate: BudgetProgress | null;
  overrunCount: number;
  hasBudgets: boolean;
  profile: Profile;
}) {
  const isOver = candidate?.status === "OVER_LIMIT";
  const isWarn = candidate?.status === "WARNING";
  const accent = isOver ? C.coral : isWarn ? C.amber : C.success;
  const accentBg = isOver ? C.coralBg : isWarn ? C.amberBg : C.successBg;
  const accentBorder = isOver
    ? "rgba(249, 119, 87, 0.2)"
    : isWarn
      ? "rgba(245, 158, 11, 0.2)"
      : "rgba(16, 163, 127, 0.2)";
  const title = !hasBudgets
    ? "Aucune alerte"
    : !candidate
      ? "Aucun dépassement"
      : "Alerte budgétaire";
  const headline = !hasBudgets
    ? "Définis tes budgets pour activer les alertes."
    : !candidate
      ? "Tous tes budgets sont sous contrôle."
      : isOver
        ? `Dépenses ${getExpenseLabel(candidate.category)} au-dessus du budget`
        : `Dépenses ${getExpenseLabel(candidate.category)} proches du plafond`;
  const subline = !hasBudgets || !candidate
    ? null
    : isOver
      ? `Tu as dépassé de ${formatUserCurrency(candidate.overrun, profile)} ce mois-ci.`
      : `Tu en es à ${Math.round(candidate.percentage * 100)} % du budget ce mois-ci.`;
  const otherCount = overrunCount > 1 ? overrunCount - 1 : 0;
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: accentBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${accentBorder}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          {isOver || isWarn ? (
            <>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </>
          ) : (
            <polyline points="20 6 9 17 4 12" strokeWidth="3" />
          )}
        </svg>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          {title}
        </p>
      </div>
      <p style={{ margin: "8px 0 0 0", fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
        {headline}
      </p>
      {subline && (
        <p style={{ margin: "3px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>
          {subline}
        </p>
      )}
      {isOver && candidate && (
        <>
          <p style={{ margin: "8px 0 0 0", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
            Impact sur ton budget
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.danger, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
            −{formatUserCurrency(candidate.overrun, profile)}
            <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, marginLeft: 5 }}>
              {otherCount > 0
                ? `+ ${otherCount} autre${otherCount > 1 ? "s" : ""} dépassement${otherCount > 1 ? "s" : ""}`
                : "sur ton épargne prévue"}
            </span>
          </p>
        </>
      )}
      <Link
        href="/coach"
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: "white",
          color: isOver ? C.danger : isWarn ? C.amber : C.success,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        {!hasBudgets
          ? "Configurer mes budgets"
          : isOver || isWarn
            ? "Voir comment ajuster"
            : "Continuer comme ça"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 4 ═══════════════ */

function ProjectionEpargneCard({
  expectedSavings,
  hasIncome,
  hasBudgets,
  profile,
}: {
  expectedSavings: number;
  hasIncome: boolean;
  hasBudgets: boolean;
  profile: Profile;
}) {
  // Projection HONNÊTE : extrapolation linéaire de l'épargne mensuelle
  // attendue (revenus - dépenses prévues). Aucune hypothèse de
  // rendement ou de croissance. Si manque d'inputs → empty state.
  const canProject =
    hasIncome && hasBudgets && Number.isFinite(expectedSavings);
  const points = canProject
    ? [
        { label: "Ce mois", value: expectedSavings },
        { label: "Dans 3 mois", value: expectedSavings * 3 },
        { label: "Dans 6 mois", value: expectedSavings * 6 },
        { label: "Dans 12 mois", value: expectedSavings * 12 },
      ]
    : [];
  const isPositive = expectedSavings > 0;
  const lineColor = isPositive ? C.success : C.danger;
  const gradStopColor = isPositive ? C.success : C.danger;
  const W = 240;
  const HH = 95;
  const PAD = { top: 16, right: 12, bottom: 18, left: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const absMax = Math.max(
    ...points.map((p) => Math.abs(p.value)),
    1,
  );
  const minV = 0;
  const maxV = absMax;
  const range = maxV - minV || 1;
  const scaled = points.map((p, i) => {
    const x =
      PAD.left + (i / (points.length - 1 || 1)) * innerW;
    const y =
      PAD.top + innerH - ((Math.abs(p.value) - minV) / range) * innerH;
    return { ...p, x, y };
  });
  const pathD = scaled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.top + innerH;
  const areaD =
    scaled.length > 0
      ? `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Projection d&apos;épargne
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Au rythme de ton budget
      </p>
      {!canProject ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          {!hasBudgets
            ? "Configure ton budget pour voir ta projection."
            : "Renseigne tes revenus pour projeter ton épargne."}
        </p>
      ) : (
        <>
          <div style={{ marginTop: 4, flex: 1 }}>
            <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
              <defs>
                <linearGradient id="bud-proj-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradStopColor} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={gradStopColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#bud-proj-grad)" />
              <path d={pathD} stroke={lineColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {scaled.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={2.5} fill="white" stroke={lineColor} strokeWidth={1.5} />
                  <text x={p.x} y={p.y - 6} fontSize="8.5" fontWeight="700" fill={C.textDark} fontFamily="Outfit, Inter, system-ui" textAnchor="middle">
                    {formatUserCurrency(p.value, profile)}
                  </text>
                </g>
              ))}
              {scaled.map((p) => (
                <text key={`x-${p.label}`} x={p.x} y={HH - 8} fontSize="7.5" fill={C.textLight} textAnchor="middle">
                  {p.label}
                </text>
              ))}
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", backgroundColor: isPositive ? C.successBg : C.coralBg, borderRadius: 7, marginTop: 2 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 4, backgroundColor: lineColor, flexShrink: 0 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                {isPositive ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </>
                )}
              </svg>
            </span>
            <p style={{ margin: 0, fontSize: 9.5, color: C.textDark, lineHeight: 1.3 }}>
              {isPositive
                ? "Tu es sur une trajectoire d'épargne positive."
                : "Ton budget dépasse tes revenus prévus."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function RepartitionIdealeCard({
  rows,
  profile,
}: {
  rows: Array<{ tag: string; label: string; amount: number; pct: number; color: string }>;
  profile: Profile;
}) {
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition idéale
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Règle 50/30/20
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Configure tes revenus et tes budgets par catégorie pour comparer ta répartition à la règle 50/30/20.
        </p>
      ) : (
        <>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "center" }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 28,
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.textDark,
                    fontFamily: "Outfit, Inter, system-ui",
                    letterSpacing: "-0.02em",
                    flexShrink: 0,
                  }}
                >
                  {r.tag}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                    <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {formatUserCurrency(r.amount, profile)}
                    </span>
                  </div>
                  <div style={{ height: 3, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, r.pct * 1.5)}%`, height: "100%", backgroundColor: r.color, borderRadius: 999 }} />
                  </div>
                </div>
                <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 22, textAlign: "right" }}>
                  {r.pct}%
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/coach"
            style={{
              marginTop: 4,
              padding: "4px 0",
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10.5,
              fontWeight: 600,
              color: C.primary,
              textDecoration: "none",
            }}
          >
            En savoir plus
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </>
      )}
    </div>
  );
}

function ActionsRapidesCard() {
  // Toutes les actions de configuration / création / export budget
  // se font aujourd'hui via le coach (pas de form ni d'export câblés
  // sur cette page V3). Liens vers les destinations logiques :
  //   - configuration / création de catégorie → /coach
  //   - abonnements récurrents → /design-match/depenses-v3
  //   - export rapport → /coach (pas encore implémenté)
  const items = [
    {
      title: "Ajuster mon budget",
      sub: "Modifier mes montants",
      href: "/coach",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    },
    {
      title: "Créer une catégorie",
      sub: "Ajouter une nouvelle catégorie",
      href: "/coach",
      bg: C.successBg,
      color: C.success,
      iconPath: "M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 11v6|M9 14h6",
    },
    {
      title: "Voir mes dépenses",
      sub: "Détail des sorties par catégorie",
      href: "/design-match/depenses-v3",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M12 19V5|M5 12l7 7 7-7",
    },
    {
      title: "Demander un rapport",
      sub: "Discute avec ton coach",
      href: "/coach",
      bg: C.amberBg,
      color: C.amber,
      iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3",
    },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Actions rapides
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", flex: 1 }}>
        {items.map((it, idx) => (
          <Link
            key={it.title}
            href={it.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 0",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              textDecoration: "none",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: it.bg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.title}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 5 — CONSEIL IA BANDEAU ═══════════════ */

function ConseilIACard({
  hasBudgets,
  healthScore,
  overrunCount,
}: {
  hasBudgets: boolean;
  healthScore: number | null;
  overrunCount: number;
}) {
  const headline = !hasBudgets
    ? "Configure ton premier budget"
    : healthScore === null
      ? "Conseil personnalisé en cours d'analyse"
      : overrunCount > 0
        ? `${overrunCount} dépassement${overrunCount > 1 ? "s" : ""} ce mois`
        : healthScore >= 75
          ? "Conseil de ton coach IA"
          : "Quelques ajustements à faire";
  const body = !hasBudgets
    ? "Un budget par catégorie te permet de comparer tes dépenses à ce que tu avais prévu."
    : overrunCount > 0
      ? "Identifie avec ton coach les leviers pour rester dans tes plafonds."
      : healthScore !== null && healthScore >= 75
        ? "Tu respectes la majorité de tes budgets. Demande à ton coach les prochains leviers."
        : "Demande à ton coach quelles catégories serrer en priorité.";
  return (
    <div
      style={{
        padding: "5px 16px",
        backgroundColor: C.primaryBg,
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
            backgroundColor: C.primary,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {headline}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textDark, lineHeight: 1.3 }}>
            {body}
          </p>
        </div>
      </div>
      <Link
        href="/coach"
        style={{
          padding: "8px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Parler à mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ HELPERS ═══════════════ */

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

function gaugeArcD(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

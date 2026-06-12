/**
 * Phase 5.0 — /design-match/depenses-v3
 *
 * Page Dépenses V3 — cockpit financier dense aligné sur dashboard-v3,
 * coach-v3, plan-v3 et revenus-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 : DepensesHero navy (1.6fr) · EconomiesPossiblesCard (1fr)
 *   Row 2 : RepartitionCard · AlertesCard · Top5Card (3 × 1fr)
 *   Row 3 : EvolutionCard · RecurrentesCard · ConseilCard (3 × 1fr)
 *   Footer : MissionFooter (full width)
 *
 * MOBILE/TABLET (< 1200) : tout stack verticalement (scrollable).
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getFinanceData } from "@/lib/services/finance";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatUserCurrency } from "@/lib/utils";
import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import { buildCategoryBreakdown } from "@/lib/calculations/analytics";
import {
  computeBudgetProgress,
  type BudgetProgress,
} from "@/lib/calculations/budget-goals";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dépenses — LIBERIA",
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

interface CategorySlice {
  id: string;
  label: string;
  amount: number;
  pct: number; // 0-100
  color: string;
}

interface AlertItem {
  id: string;
  label: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  iconColor: string;
  iconBg: string;
  iconPath: string;
}

interface RecurringItem {
  id: string;
  label: string;
  monthly: number;
}

// Palette cyclique pour les catégories (déjà utilisée sur Revenus
// et Budget — garantit la cohérence visuelle entre les 3 cockpits).
const CATEGORY_COLORS_DEP: string[] = [
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

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchDepensesV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats dépenses                                                 */
  /* ------------------------------------------------------------------ */

  const expenses = data.expenses;
  const monthlyTotal = data.expenseBuckets.total;
  const hasExpenses = expenses.length > 0 && monthlyTotal > 0;

  // Répartition par catégorie ce mois — même primitive que le moteur
  // de progression budget, garantit la cohérence des chiffres.
  const allCategoryIds = EXPENSE_CATEGORIES.map((c) => c.id);
  const breakdown = buildCategoryBreakdown(
    expenses.map((e) => ({
      amount: e.amount,
      category: e.category,
      frequency: e.frequency,
      created_at: e.created_at,
    })),
    "month",
    allCategoryIds,
  ).filter((r) => r.total > 0);

  const TOP_N = 5;
  const topBreakdown = breakdown.slice(0, TOP_N);
  const restBreakdown = breakdown.slice(TOP_N);
  const repartitionSlices: CategorySlice[] = topBreakdown.map((r, idx) => ({
    id: r.category,
    label: getExpenseLabel(r.category),
    amount: r.total,
    pct: Math.round(r.share * 100),
    color: CATEGORY_COLORS_DEP[idx % CATEGORY_COLORS_DEP.length],
  }));
  if (restBreakdown.length > 0) {
    const restTotal = restBreakdown.reduce((s, r) => s + r.total, 0);
    const restShare = restBreakdown.reduce((s, r) => s + r.share, 0);
    repartitionSlices.push({
      id: "autres",
      label: "Autres",
      amount: restTotal,
      pct: Math.round(restShare * 100),
      color: "#CBD5E1",
    });
  }

  // Top 5 catégories (mêmes données que repartition mais sans bucket)
  const top5: CategorySlice[] = topBreakdown.map((r, idx) => ({
    id: r.category,
    label: getExpenseLabel(r.category),
    amount: r.total,
    pct: Math.round(r.share * 100),
    color: CATEGORY_COLORS_DEP[idx % CATEGORY_COLORS_DEP.length],
  }));

  // Progression budget — RÉUTILISÉ depuis le commit Budget pour
  // garantir une cohérence parfaite : si une catégorie est en
  // dépassement sur Budget, elle est marquée en dépassement ici.
  const budgets = data.categoryBudgets;
  const hasBudgets = budgets.length > 0;
  const progressList: BudgetProgress[] = hasBudgets
    ? computeBudgetProgress(
        budgets.map((b) => ({
          category: b.category,
          monthly_limit: b.monthly_limit,
        })),
        expenses,
      )
    : [];

  const overrunCategories = progressList.filter(
    (p) => p.status === "OVER_LIMIT",
  );
  const warningCategories = progressList.filter(
    (p) => p.status === "WARNING",
  );
  const totalOverrun = overrunCategories.reduce(
    (s, p) => s + p.overrun,
    0,
  );

  // Alertes — dérivées des dépassements / warnings ; max 3
  const alertItems: AlertItem[] = [];
  for (const p of overrunCategories) {
    if (alertItems.length >= 3) break;
    alertItems.push({
      id: `over-${p.category}`,
      label: getExpenseLabel(p.category),
      tag: `+${formatUserCurrency(p.overrun, data.profile)}`,
      tagColor: C.danger,
      tagBg: C.dangerBg,
      iconColor: C.danger,
      iconBg: C.dangerBg,
      iconPath:
        "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
    });
  }
  for (const p of warningCategories) {
    if (alertItems.length >= 3) break;
    alertItems.push({
      id: `warn-${p.category}`,
      label: getExpenseLabel(p.category),
      tag: `${Math.round(p.percentage * 100)} %`,
      tagColor: C.amber,
      tagBg: C.amberBg,
      iconColor: C.amber,
      iconBg: C.amberBg,
      iconPath:
        "M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 4h6v3H9V4z",
    });
  }
  if (alertItems.length < 3 && totalOverrun > 0) {
    alertItems.push({
      id: "savings",
      label: "Économies possibles",
      tag: formatUserCurrency(totalOverrun, data.profile),
      tagColor: C.success,
      tagBg: C.successBg,
      iconColor: C.success,
      iconBg: C.successBg,
      iconPath:
        "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22",
    });
  }

  // Dépenses récurrentes — sources qui ne sont PAS one_time, top 6 par
  // montant normalisé en mensuel
  const recurringItems: RecurringItem[] = expenses
    .filter((e) => e.frequency !== "one_time")
    .map((e) => ({
      id: e.id,
      label: e.label,
      monthly: e.amount * frequencyMultiplier(e.frequency),
    }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 6);

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-dep-row] { grid-template-columns: 1fr !important; }
          [data-dep-main] { padding: 0 20px 12px 20px !important; gap: 12px !important; }
        }
        @media (max-width: 999px) {
          [data-dep-sidebar] { display: none !important; }
          [data-dep-content] { margin-left: 0 !important; }
          [data-dep-main] { padding: 0 16px 16px 16px !important; }
          [data-dep-topbar] { padding: 0 16px !important; }
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
        <div data-dep-sidebar>
          <Sidebar />
        </div>
        <div data-dep-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-dep-main
            style={{
              padding: "0 24px 12px 24px",
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div data-dep-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <DepensesHero
                monthlyTotal={monthlyTotal}
                hasExpenses={hasExpenses}
                profile={data.profile}
              />
              <EconomiesPossiblesCard
                totalOverrun={totalOverrun}
                overrunCount={overrunCategories.length}
                hasBudgets={hasBudgets}
                profile={data.profile}
              />
            </div>
            <div data-dep-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <RepartitionCard
                slices={repartitionSlices}
                monthlyTotal={monthlyTotal}
                profile={data.profile}
              />
              <AlertesCard
                items={alertItems}
                hasBudgets={hasBudgets}
                hasExpenses={hasExpenses}
              />
              <Top5Card rows={top5} profile={data.profile} />
            </div>
            <div data-dep-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <EvolutionCard />
              <RecurrentesCard items={recurringItems} profile={data.profile} />
              <ConseilCard
                overruns={overrunCategories}
                hasBudgets={hasBudgets}
                hasExpenses={hasExpenses}
                profile={data.profile}
              />
            </div>
            <MissionFooter
              totalOverrun={totalOverrun}
              overrunCount={overrunCategories.length}
              hasBudgets={hasBudgets}
              hasExpenses={hasExpenses}
              profile={data.profile}
            />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Dépenses actif) ═══════════════ */

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
          <NavItem label="Dépenses" href="/design-match/depenses-v3" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" active />
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
      data-dep-topbar
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
          Voici le détail de vos dépenses et comment les optimiser.
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
/* ═══════════════ ROW 1 : HERO + ECONOMIES ═══════════════ */

function DepensesHero({
  monthlyTotal,
  hasExpenses,
  profile,
}: {
  monthlyTotal: number;
  hasExpenses: boolean;
  profile: Profile;
}) {
  const amountText = hasExpenses
    ? formatUserCurrency(monthlyTotal, profile)
    : "Aucune dépense enregistrée";
  const subline = hasExpenses
    ? "Historique mensuel non disponible"
    : "Ajoute tes premières dépenses pour démarrer ton suivi";
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 20px",
        backgroundColor: C.navy,
        borderRadius: 14,
        boxShadow: SHADOW.navy,
        overflow: "hidden",
        minHeight: 116,
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
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, height: "100%" }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Dépenses totales ce mois
          </p>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: hasExpenses ? 32 : 22,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {amountText}
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 8,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
              fontSize: 10.5,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {subline}
          </span>
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
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function EconomiesPossiblesCard({
  totalOverrun,
  overrunCount,
  hasBudgets,
  profile,
}: {
  totalOverrun: number;
  overrunCount: number;
  hasBudgets: boolean;
  profile: Profile;
}) {
  // Économies possibles = somme des dépassements de tes budgets ce
  // mois. Si tu respectes tes budgets, c'est de l'argent que tu
  // récupères sur ton épargne. Mesure honnête, cohérente avec
  // Budget.AlerteBudgetaireCard.
  const accent = totalOverrun > 0 ? C.success : C.textMuted;
  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        minHeight: 122,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: accent, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Économies possibles
        </p>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      </div>
      {totalOverrun > 0 ? (
        <>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 18,
              fontWeight: 700,
              color: C.textDark,
              lineHeight: 1.1,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatUserCurrency(totalOverrun, profile)}
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}> /mois</span>
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            En revenant dans tes budgets sur {overrunCount} catégorie
            {overrunCount > 1 ? "s" : ""} en dépassement, tu récupères{" "}
            <span style={{ color: C.textDark, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatUserCurrency(totalOverrun * 12, profile)}
            </span>{" "}
            sur l&apos;année.
          </p>
        </>
      ) : (
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
          {hasBudgets
            ? "Tu respectes tes budgets ce mois. Aucune économie urgente à dégager."
            : "Configure tes budgets par catégorie pour identifier où tu peux économiser."}
        </p>
      )}
      <Link
        href="/coach"
        style={{
          marginTop: "auto",
          padding: "7px 12px",
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
        {hasBudgets ? "En parler à mon coach" : "Configurer mes budgets"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 : RÉPARTITION + ALERTES + TOP 5 ═══════════════ */

function RepartitionCard({
  slices,
  monthlyTotal,
  profile,
}: {
  slices: CategorySlice[];
  monthlyTotal: number;
  profile: Profile;
}) {
  let cursor = -90;
  const gap = 1;
  const usableDeg = 360 - gap * Math.max(slices.length, 1);
  const total = slices.reduce((s, x) => s + x.pct, 0) || 1;
  const slicesWithPaths = slices.map((s) => {
    const sweep = (s.pct / total) * usableDeg;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
    cursor = endDeg + gap;
    return { ...s, path };
  });
  // Centre donut : montant compact (5K, 18K, 1.2M)
  const centerAmount = (() => {
    if (monthlyTotal <= 0) return "—";
    if (monthlyTotal >= 1_000_000)
      return `${(monthlyTotal / 1_000_000).toFixed(1)}M`;
    if (monthlyTotal >= 1_000)
      return `${Math.round(monthlyTotal / 1_000)}K`;
    return `${Math.round(monthlyTotal)}`;
  })();
  const currencyLabel = profile?.currency ?? "CHF";
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Par catégorie ce mois
      </p>
      {slices.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucune dépense enregistrée ce mois.
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <div style={{ position: "relative", flexShrink: 0, width: 96, height: 96 }}>
            <svg viewBox="0 0 100 100" width={96} height={96}>
              {slicesWithPaths.map((s) => (
                <path key={s.id} d={s.path} fill={s.color} />
              ))}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {centerAmount}
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: 8.5, color: C.textMuted, letterSpacing: "0.14em" }}>
                {currencyLabel}
              </p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            {slicesWithPaths.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, backgroundColor: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                <span style={{ color: C.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {s.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertesCard({
  items,
  hasBudgets,
  hasExpenses,
}: {
  items: AlertItem[];
  hasBudgets: boolean;
  hasExpenses: boolean;
}) {
  const headline =
    items.length === 0
      ? hasBudgets
        ? "Aucune alerte"
        : "À activer"
      : "Optimisations détectées";
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Alertes
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        {headline}
      </p>
      {items.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          {!hasExpenses
            ? "Aucune dépense enregistrée ce mois."
            : !hasBudgets
              ? "Configure tes budgets par catégorie pour activer la détection automatique."
              : "Tu respectes tes budgets ce mois. Aucune alerte à signaler."}
        </p>
      ) : (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 7px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: it.iconBg, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: it.tagColor, fontVariantNumeric: "tabular-nums", flexShrink: 0, padding: "1px 6px", backgroundColor: it.tagBg, borderRadius: 999 }}>
                {it.tag}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Top5Card({
  rows,
  profile,
}: {
  rows: CategorySlice[];
  profile: Profile;
}) {
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Top {Math.min(rows.length, 5) || 5}
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Postes principaux
          </p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucune dépense enregistrée ce mois.
        </p>
      ) : (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: 999, backgroundColor: C.primary, color: "white", fontSize: 9, fontWeight: 700, fontFamily: "Outfit, Inter, system-ui", flexShrink: 0 }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.label}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {formatUserCurrency(r.amount, profile)}
                  </span>
                </div>
                <div style={{ height: 3, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, r.pct * 2.5)}%`, height: "100%", backgroundColor: r.color, borderRadius: 999 }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 22, textAlign: "right" }}>
                {r.pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ ROW 3 : EVOLUTION + RÉCURRENTES + CONSEIL ═══════════════ */

function EvolutionCard() {
  // Historique mensuel des dépenses agrégées pas encore matérialisé
  // (pas de table expense_snapshots). Empty state premium, cohérent
  // avec Budget.EvolutionBudgetCard et Revenus.EvolutionCard.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            6 derniers mois
          </p>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 120,
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
          Tes dépenses mensuelles apparaîtront ici dès qu&apos;elles seront agrégées mois après mois.
        </p>
      </div>
    </div>
  );
}

function RecurrentesCard({
  items,
  profile,
}: {
  items: RecurringItem[];
  profile: Profile;
}) {
  // Note : pas de status "warn vs ok" affiché par ligne car nous
  // n'avons pas de signal d'usage par dépense récurrente. Toutes les
  // dépenses récurrentes sont juste listées avec leur montant
  // mensuel normalisé.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Récurrentes
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Paiements fixes
      </p>
      {items.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucune dépense récurrente enregistrée.
        </p>
      ) : (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", flex: 1 }}>
          {items.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontSize: 10.5,
                borderBottom: i === items.length - 1 ? "none" : `1px solid ${C.borderGhost}`,
              }}
            >
              <span style={{ flex: 1, color: C.textDark, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.label}
              </span>
              <span style={{ color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {formatUserCurrency(r.monthly, profile)}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: C.successBg,
                  flexShrink: 0,
                }}
              >
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConseilCard({
  overruns,
  hasBudgets,
  hasExpenses,
  profile,
}: {
  overruns: BudgetProgress[];
  hasBudgets: boolean;
  hasExpenses: boolean;
  profile: Profile;
}) {
  // Bullets = top 3 catégories en dépassement avec le montant exact.
  // Cohérent avec Budget.AlerteBudgetaireCard et la EconomiesPossiblesCard.
  const bullets = overruns
    .slice(0, 3)
    .map(
      (p) =>
        `${getExpenseLabel(p.category)} (−${formatUserCurrency(p.overrun, profile)}/mois)`,
    );
  const headline = !hasExpenses
    ? "Démarre ton suivi"
    : !hasBudgets
      ? "Configure tes budgets"
      : overruns.length > 0
        ? `${overruns.length} catégorie${overruns.length > 1 ? "s" : ""} à serrer`
        : "Tes dépenses sont maîtrisées";
  const lead = !hasExpenses
    ? "Enregistre tes premières dépenses pour activer l'analyse."
    : !hasBudgets
      ? "Sans budget par catégorie, impossible de détecter les dépassements."
      : overruns.length > 0
        ? "Le plus grand potentiel d'économies se trouve dans :"
        : "Tu respectes tes budgets ce mois — continue comme ça.";
  return (
    <div
      style={{
        padding: "12px 14px 4px 14px",
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
            backgroundColor: C.navy,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Conseil IA
        </p>
      </div>
      <p style={{ margin: "8px 0 0 0", fontSize: 11, color: C.textDark, lineHeight: 1.4, fontWeight: 600 }}>
        {headline}
      </p>
      <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4 }}>
        {lead}
      </p>
      {bullets.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {bullets.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10.5, color: C.textDark, lineHeight: 1.3 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/coach"
        style={{
          marginTop: bullets.length > 0 ? 8 : "auto",
          width: "100%",
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: "white",
          color: C.primary,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
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

/* ═══════════════ MISSION FOOTER ═══════════════ */

function MissionFooter({
  totalOverrun,
  overrunCount,
  hasBudgets,
  hasExpenses,
  profile,
}: {
  totalOverrun: number;
  overrunCount: number;
  hasBudgets: boolean;
  hasExpenses: boolean;
  profile: Profile;
}) {
  const missionText = !hasExpenses
    ? "Enregistre tes premières dépenses"
    : !hasBudgets
      ? "Configure tes budgets par catégorie"
      : totalOverrun > 0
        ? `Réduire tes dépenses de ${formatUserCurrency(totalOverrun, profile)} ce mois-ci`
        : "Maintiens ton rythme — tes budgets sont respectés";
  const annualGain = totalOverrun > 0 ? totalOverrun * 12 : null;
  const showImpact = totalOverrun > 0;
  return (
    <div
      style={{
        padding: "10px 16px",
        backgroundColor: C.cardBg,
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
            Mission du moment
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 12.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {missionText}
          </p>
          {showImpact && annualGain !== null && (
            <p style={{ margin: "2px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
              {overrunCount} catégorie{overrunCount > 1 ? "s" : ""} en dépassement
              {"  •  "}
              Gain annuel potentiel&nbsp;:{" "}
              <span style={{ color: C.textDark, fontWeight: 600 }}>
                {formatUserCurrency(annualGain, profile)}
              </span>
            </p>
          )}
        </div>
      </div>
      <Link
        href="/coach"
        style={{
          padding: "7px 14px",
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
        {showImpact ? "Discuter avec mon coach" : "Parler à mon coach"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ DONUT HELPERS ═══════════════ */

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

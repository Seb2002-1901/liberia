/**
 * Phase 5.0 — /design-match/revenus-v3
 *
 * Page Revenus V3 — cockpit financier dense aligné sur dashboard-v3,
 * coach-v3 et plan-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 : RevenusHero navy (1.6fr) · PotentielCard (1fr)
 *   Row 2 : SourcesCard · EvolutionCard · ProjectionCard (3 × 1fr)
 *   Row 3 : CategoryTable (1.3fr) · OpportunitesCard · ConseilCard
 *   Footer : MissionFooter (full width)
 *
 * MOBILE/TABLET (< 1200) : tout stack verticalement (scrollable).
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { normalizeToMonthly } from "@/lib/calculations/finance";
import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import { INCOME_CATEGORIES } from "@/lib/constants";
import { formatUserCurrency } from "@/lib/utils";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Revenus — LIBERIA",
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
  donutGrey: "#E2E8F0",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

/* ═══════════════ TYPES & HELPERS ═══════════════ */

type Profile = Parameters<typeof formatUserCurrency>[1];

interface CategoryAggregate {
  id: string;
  label: string;
  monthly: number;
  pct: number; // 0-100
}

const CATEGORY_COLORS: Record<string, string> = {
  salary: C.primary,
  freelance: C.success,
  business: C.success,
  investments: C.violet,
  aid: C.amber,
  rental: C.coral,
  other: C.donutGrey,
};

function getCategoryLabel(id: string): string {
  return (
    INCOME_CATEGORIES.find((c) => c.id === id)?.label ?? "Autre"
  );
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchRevenusV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats revenus                                                  */
  /* ------------------------------------------------------------------ */

  const monthlyTotal = totalMonthly(data.incomes);
  const annualTotal = monthlyTotal * 12;
  const hasIncomes = data.incomes.length > 0 && monthlyTotal > 0;

  // Agrégation par catégorie (montants normalisés en mensuel).
  const byCategoryMap = new Map<string, number>();
  for (const inc of data.incomes) {
    const monthly = normalizeToMonthly(
      inc.amount,
      frequencyMultiplier(inc.frequency),
    );
    if (monthly <= 0) continue;
    const cat = inc.category && inc.category.trim() ? inc.category : "other";
    byCategoryMap.set(cat, (byCategoryMap.get(cat) ?? 0) + monthly);
  }
  const categoryAggregates: CategoryAggregate[] = Array.from(
    byCategoryMap.entries(),
  )
    .map(([id, monthly]) => ({
      id,
      label: getCategoryLabel(id),
      monthly,
      pct: monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0,
    }))
    .sort((a, b) => b.monthly - a.monthly);

  // Donut slices : top 4 catégories + "Autres" si > 4
  const TOP_N = 4;
  const sourcesSlices = (() => {
    if (categoryAggregates.length === 0) return [];
    const top = categoryAggregates.slice(0, TOP_N);
    const rest = categoryAggregates.slice(TOP_N);
    const slices = top.map((c) => ({
      id: c.id,
      label: c.label,
      pct: Math.round(c.pct),
      color: CATEGORY_COLORS[c.id] ?? C.donutGrey,
    }));
    if (rest.length > 0) {
      const restPct = rest.reduce((s, c) => s + c.pct, 0);
      slices.push({
        id: "autres",
        label: "Autres",
        pct: Math.round(restPct),
        color: C.donutGrey,
      });
    }
    return slices;
  })();

  // Détail par catégorie (toutes les catégories réelles)
  const categoryRows = categoryAggregates.map((c) => ({
    id: c.id,
    label: c.label,
    monthly: c.monthly,
  }));

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-rev-row] { grid-template-columns: 1fr !important; }
          [data-rev-main] { padding: 0 20px 12px 20px !important; gap: 12px !important; }
        }
        @media (max-width: 999px) {
          [data-rev-sidebar] { display: none !important; }
          [data-rev-content] { margin-left: 0 !important; }
          [data-rev-main] { padding: 0 16px 16px 16px !important; }
          [data-rev-topbar] { padding: 0 16px !important; }
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
        <div data-rev-sidebar>
          <Sidebar />
        </div>
        <div data-rev-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-rev-main
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
            <div data-rev-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <RevenusHero
                monthlyTotal={monthlyTotal}
                hasIncomes={hasIncomes}
                profile={data.profile}
              />
              <PotentielCard hasIncomes={hasIncomes} />
            </div>
            <div data-rev-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <SourcesCard
                slices={sourcesSlices}
                monthlyTotal={monthlyTotal}
                profile={data.profile}
              />
              <EvolutionCard />
              <ProjectionCard
                monthlyTotal={monthlyTotal}
                annualTotal={annualTotal}
                hasIncomes={hasIncomes}
                profile={data.profile}
              />
            </div>
            <div data-rev-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
              <CategoryTableCard rows={categoryRows} profile={data.profile} />
              <OpportunitesCard />
              <ConseilCard />
            </div>
            <MissionFooter hasIncomes={hasIncomes} />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Revenus actif) ═══════════════ */

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
          <NavItem label="Revenus" href="/design-match/revenus-v3" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" active />
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
      data-rev-topbar
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
          Voici le détail de vos revenus et comment les augmenter.
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
/* ═══════════════ ROW 1 : HERO + POTENTIEL ═══════════════ */

function RevenusHero({
  monthlyTotal,
  hasIncomes,
  profile,
}: {
  monthlyTotal: number;
  hasIncomes: boolean;
  profile: Profile;
}) {
  const amountText = hasIncomes
    ? formatUserCurrency(monthlyTotal, profile)
    : "Aucun revenu enregistré";
  const subtitle = hasIncomes
    ? "Historique trimestriel non disponible"
    : "Ajoute ta première source pour démarrer ton suivi";
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 20px",
        backgroundColor: C.navy,
        borderRadius: 14,
        boxShadow: SHADOW.navy,
        overflow: "hidden",
        minHeight: 122,
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
            Revenus mensuels totaux
          </p>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: hasIncomes ? 32 : 22,
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
            {subtitle}
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

function PotentielCard({ hasIncomes }: { hasIncomes: boolean }) {
  // Moteur de potentiel revenus (opportunités personnalisées par
  // catégorie) pas encore branché. Empty state premium tant qu'il
  // n'existe pas — pas de chiffre inventé.
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
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Potentiel IA
        </p>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      </div>
      <p
        style={{
          margin: "6px 0 0 0",
          fontSize: 12.5,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.3,
          fontFamily: "Outfit, Inter, system-ui",
        }}
      >
        {hasIncomes
          ? "Analyse IA en préparation"
          : "Aucune analyse disponible"}
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.45, flex: 1 }}>
        {hasIncomes
          ? "Demande à ton coach d'identifier des leviers d'augmentation adaptés à ton profil."
          : "Ajoute tes sources de revenus pour débloquer l'analyse personnalisée."}
      </p>
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
        Parler à mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 : SOURCES + EVOLUTION + PROJECTION ═══════════════ */

function SourcesCard({
  slices,
  monthlyTotal,
  profile,
}: {
  slices: Array<{ id: string; label: string; pct: number; color: string }>;
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
  // Centre du donut : montant compact (ex. "25K", "1.2M")
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
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Sources de revenus
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Répartition mensuelle
      </p>
      {slices.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
          Aucune source enregistrée. Ajoute tes revenus pour visualiser la répartition.
        </p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
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
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            {slicesWithPaths.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, backgroundColor: s.color, flexShrink: 0 }} />
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

function EvolutionCard() {
  // Historique mensuel des revenus pas encore stocké (table de
  // snapshots à modéliser dans une phase ultérieure). Empty state
  // premium, aucun graphe inventé.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
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
          minHeight: 110,
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
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, maxWidth: 220 }}>
          Tes revenus historiques apparaîtront ici dès qu&apos;ils seront agrégés mois après mois.
        </p>
      </div>
    </div>
  );
}

function ProjectionCard({
  monthlyTotal,
  annualTotal,
  hasIncomes,
  profile,
}: {
  monthlyTotal: number;
  annualTotal: number;
  hasIncomes: boolean;
  profile: Profile;
}) {
  // Projection au rythme actuel : extrapolation linéaire des revenus
  // mensuels actuels sur 1/3/5 ans. Aucune hypothèse d'augmentation
  // (pas de mock "+300 CHF/mois") tant que le moteur d'opportunités
  // revenus n'est pas connecté.
  const rows = hasIncomes
    ? [
        { label: "Sur 1 an", value: annualTotal },
        { label: "Sur 3 ans", value: annualTotal * 3 },
        { label: "Sur 5 ans", value: annualTotal * 5 },
      ]
    : [];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Projection
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Au rythme actuel
      </p>
      {!hasIncomes ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucun revenu enregistré. Ajoute tes sources pour voir ta projection à 1, 3 et 5 ans.
        </p>
      ) : (
        <>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4 }}>
            Base : {formatUserCurrency(monthlyTotal, profile)} / mois
          </p>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {rows.map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.primaryBg, flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </span>
                <span style={{ flex: 1, fontSize: 11, color: C.textMuted }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
                  {formatUserCurrency(r.value, profile)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════ ROW 3 : TABLE + OPPORTUNITES + CONSEIL ═══════════════ */

function CategoryTableCard({
  rows,
  profile,
}: {
  rows: Array<{ id: string; label: string; monthly: number }>;
  profile: Profile;
}) {
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Détail par catégorie
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sources analysées
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
          Aucune source enregistrée. Ajoute tes revenus pour voir le détail par catégorie.
        </p>
      ) : (
        <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.borderGhost}` }}>
              <th style={{ textAlign: "left", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>CATÉGORIE</th>
              <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>MENSUEL</th>
              <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>ANNUEL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${C.borderGhost}` }}>
                <td style={{ padding: "7px 0", color: C.textDark, fontWeight: 500 }}>{r.label}</td>
                <td style={{ padding: "7px 0", color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatUserCurrency(r.monthly, profile)}</td>
                <td style={{ padding: "7px 0", color: C.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatUserCurrency(r.monthly * 12, profile)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OpportunitesCard() {
  // Moteur de sélection d'opportunités revenus pas encore branché
  // (cf. epargne/investissements/opportunites - V3, priorité P2/P3).
  // En attendant : empty state premium + CTA vers le coach pour
  // poser la question directement.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Opportunités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sélection IA
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 6,
          padding: "8px 4px",
        }}
      >
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.35 }}>
          Aucune opportunité identifiée
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.45 }}>
          La détection automatique d&apos;opportunités revenus arrive prochainement. En attendant, demande directement à ton coach.
        </p>
      </div>
      <Link
        href="/coach"
        style={{
          marginTop: 6,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Demander au coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function ConseilCard() {
  return (
    <div
      style={{
        padding: "12px 14px",
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
      <p style={{ margin: "8px 0 0 0", fontSize: 11.5, color: C.textDark, lineHeight: 1.45 }}>
        L&apos;augmentation de revenus offre un potentiel supérieur à la réduction des dépenses.
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: C.textDark, lineHeight: 1.45 }}>
        Concentrez-vous sur les opportunités à impact rapide et moyen terme.
      </p>
      <Link
        href="/coach"
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: "white",
          color: C.primary,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler au coach
      </Link>
    </div>
  );
}

/* ═══════════════ MISSION FOOTER ═══════════════ */

function MissionFooter({ hasIncomes }: { hasIncomes: boolean }) {
  const missionText = hasIncomes
    ? "Identifier des leviers d'augmentation avec ton coach"
    : "Enregistrer ta première source de revenus";
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
        Commencer
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

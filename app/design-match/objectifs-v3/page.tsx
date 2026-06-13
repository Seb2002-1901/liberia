/**
 * Phase 5.0 — /design-match/objectifs-v3
 *
 * Page Objectifs V3 — cockpit financier dense aligné sur Revenus V3
 * (référence cockpit officielle). Mêmes tokens, mêmes hauteurs,
 * mêmes patterns que dashboard-v3, coach-v3, plan-v3, revenus-v3,
 * depenses-v3 et budget-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr) : ObjectifsHero navy · ResumeCard
 *   Row 2 (3 × 1fr)     : ObjectifsActifsCard · PrioritesIACard · GainsFutursCard
 *   Row 3 (3 × 1fr)     : ProgressionMensuelleCard · JalonsCard · ConseilIACard
 *   Row 4 (full width)  : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import type { Goal } from "@/types/database";
import { getFinanceData } from "@/lib/services/finance";
import { GOAL_TYPES } from "@/lib/constants";
import { formatUserCurrency } from "@/lib/utils";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Objectifs — LIBERIA",
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
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

/* ═══════════════ TYPES & HELPERS ═══════════════ */

type Profile = Parameters<typeof formatUserCurrency>[1];

interface ActiveGoalView {
  id: string;
  title: string;
  typeLabel: string;
  current: number;
  target: number;
  pct: number;
  color: string;
  iconBg: string;
}

interface MilestoneView {
  id: string;
  title: string;
  typeLabel: string;
  deadline: Date;
  day: string;
  month: string;
  delayLabel: string;
  delayColor: string;
}

const GOAL_PALETTE: Array<{ color: string; bg: string }> = [
  { color: "#2563EB", bg: "#EDF2FD" }, // primary
  { color: "#10A37F", bg: "#ECFDF5" }, // success
  { color: "#9061F9", bg: "#F4EBFF" }, // violet
  { color: "#F59E0B", bg: "#FEF3C7" }, // amber
  { color: "#F97757", bg: "#FFF1EC" }, // coral
];

function getGoalTypeLabel(id: string): string {
  return GOAL_TYPES.find((t) => t.id === id)?.label ?? "Autre";
}

const MONTH_LABELS_FR = [
  "JANV.",
  "FÉVR.",
  "MARS",
  "AVR.",
  "MAI",
  "JUIN",
  "JUIL.",
  "AOÛT",
  "SEPT.",
  "OCT.",
  "NOV.",
  "DÉC.",
];

function buildMilestoneView(
  goal: Goal,
  index: number,
  now: Date,
): MilestoneView | null {
  if (!goal.deadline) return null;
  const deadline = new Date(goal.deadline);
  if (Number.isNaN(deadline.getTime())) return null;
  const day = String(deadline.getUTCDate()).padStart(2, "0");
  const month = MONTH_LABELS_FR[deadline.getUTCMonth()] ?? "";
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round(
    (deadline.getTime() - now.getTime()) / msPerDay,
  );
  let delayLabel = "";
  let delayColor = "#64748B"; // textMuted
  if (diffDays < 0) {
    delayLabel = "Échue";
    delayColor = "#F97757"; // coral
  } else if (diffDays === 0) {
    delayLabel = "Aujourd'hui";
    delayColor = "#F97757"; // coral
  } else if (diffDays === 1) {
    delayLabel = "Demain";
    delayColor = "#F97757"; // coral
  } else if (diffDays < 7) {
    delayLabel = `Dans ${diffDays} jours`;
    delayColor = "#F97757"; // coral
  } else if (diffDays < 30) {
    const w = Math.round(diffDays / 7);
    delayLabel = w === 1 ? "Dans 1 semaine" : `Dans ${w} semaines`;
    delayColor = "#F59E0B"; // amber
  } else if (diffDays < 365) {
    const m = Math.round(diffDays / 30);
    delayLabel = m === 1 ? "Dans 1 mois" : `Dans ${m} mois`;
    delayColor = "#64748B"; // textMuted
  } else {
    const y = Math.floor(diffDays / 365);
    delayLabel = y === 1 ? "Dans 1 an" : `Dans ${y} ans`;
    delayColor = "#64748B";
  }
  void index;
  return {
    id: goal.id,
    title: goal.title,
    typeLabel: getGoalTypeLabel(goal.type),
    deadline,
    day,
    month,
    delayLabel,
    delayColor,
  };
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchObjectifsV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats objectifs                                                */
  /* ------------------------------------------------------------------ */

  const goals = data.goals;
  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);
  const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const progressPct =
    totalTarget > 0
      ? Math.max(0, Math.min(100, Math.round((totalSaved / totalTarget) * 100)))
      : null;

  const hasGoals = goals.length > 0;
  const hasActive = activeGoals.length > 0;

  // Cartes "Vos objectifs actifs" — top 4 par progression % desc
  const activeGoalViews: ActiveGoalView[] = activeGoals
    .map((g, idx): ActiveGoalView => {
      const palette = GOAL_PALETTE[idx % GOAL_PALETTE.length];
      const target = g.target_amount || 0;
      const current = g.current_amount || 0;
      const pct =
        target > 0
          ? Math.max(0, Math.min(100, Math.round((current / target) * 100)))
          : 0;
      return {
        id: g.id,
        title: g.title,
        typeLabel: getGoalTypeLabel(g.type),
        current,
        target,
        pct,
        color: palette.color,
        iconBg: palette.bg,
      };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  // Jalons à venir — goals avec deadline, triés par deadline asc, top 3
  const now = new Date();
  const milestoneViews: MilestoneView[] = activeGoals
    .map((g, idx) => buildMilestoneView(g, idx, now))
    .filter((m): m is MilestoneView => m !== null)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 3);

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-obj-row] { grid-template-columns: 1fr !important; }
          [data-obj-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-obj-sidebar] { display: none !important; }
          [data-obj-content] { margin-left: 0 !important; }
          [data-obj-main] { padding: 0 16px 16px 16px !important; }
          [data-obj-topbar] { padding: 0 16px !important; }
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
        <div data-obj-sidebar>
          <Sidebar />
        </div>
        <div data-obj-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-obj-main
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
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 6 }}>
              <ObjectifsHero
                progressPct={progressPct}
                activeCount={activeGoals.length}
              />
              <ResumeCard
                activeCount={activeGoals.length}
                completedCount={completedGoals.length}
                totalTarget={totalTarget}
                totalSaved={totalSaved}
                profile={data.profile}
              />
            </div>
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 6 }}>
              <ObjectifsActifsCard
                goals={activeGoalViews}
                totalActive={activeGoals.length}
                profile={data.profile}
              />
              <PrioritesIACard hasGoals={hasGoals} />
              <GainsFutursCard hasGoals={hasGoals} />
            </div>
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 6 }}>
              <ProgressionMensuelleCard />
              <JalonsCard milestones={milestoneViews} hasActive={hasActive} />
              <ConseilIACard
                progressPct={progressPct}
                hasGoals={hasGoals}
              />
            </div>
            <MissionFooter
              totalSaved={totalSaved}
              progressPct={progressPct}
              hasGoals={hasGoals}
              profile={data.profile}
            />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Objectifs actif) ═══════════════ */

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
          <NavItem label="Objectifs" href="/design-match/objectifs-v3" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" active />
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
      data-obj-topbar
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
          Atteignez vos rêves grâce à des objectifs clairs et un plan d&apos;action personnalisé.
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

function ObjectifsHero({
  progressPct,
  activeCount,
}: {
  progressPct: number | null;
  activeCount: number;
}) {
  const hasPct = progressPct !== null;
  const pctText = hasPct ? `${progressPct} %` : "—";
  const barWidth = hasPct ? `${progressPct}%` : "0%";
  const subline = !hasPct
    ? "Aucun objectif défini"
    : activeCount === 0
      ? "Tous tes objectifs sont atteints"
      : `${activeCount} objectif${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""}`;
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
            Progression globale
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 700,
                color: "white",
                lineHeight: 1,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.025em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pctText}
            </p>
            {hasPct && (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
                de vos objectifs atteints
              </p>
            )}
          </div>
          <div style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 380 }}>
            <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            {subline}
          </p>
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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill={C.primary} />
            <path d="M12 2v3" />
            <path d="M19 5l-2 2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ResumeCard({
  activeCount,
  completedCount,
  totalTarget,
  totalSaved,
  profile,
}: {
  activeCount: number;
  completedCount: number;
  totalTarget: number;
  totalSaved: number;
  profile: Profile;
}) {
  const hasAnyGoal = activeCount + completedCount > 0;
  const rows = [
    {
      label: "Objectifs actifs",
      value: hasAnyGoal ? String(activeCount) : "—",
      color: C.textDark,
    },
    {
      label: "Objectifs atteints",
      value: hasAnyGoal ? String(completedCount) : "—",
      color: completedCount > 0 ? C.success : C.textMuted,
    },
    {
      label: "Montant cible",
      value: totalTarget > 0 ? formatUserCurrency(totalTarget, profile) : "—",
      color: C.textDark,
    },
    {
      label: "Montant épargné",
      value: totalSaved > 0 ? formatUserCurrency(totalSaved, profile) : "—",
      color: totalSaved > 0 ? C.primary : C.textMuted,
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
        Résumé
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, flex: 1, alignContent: "center" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <p style={{ margin: 0, fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}>{r.label}</p>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: 14,
                fontWeight: 700,
                color: r.color,
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

function ObjectifsActifsCard({
  goals,
  totalActive,
  profile,
}: {
  goals: ActiveGoalView[];
  totalActive: number;
  profile: Profile;
}) {
  const headline =
    totalActive === 0
      ? "Aucun objectif"
      : `${totalActive} en cours`;
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Vos objectifs actifs
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        {headline}
      </p>
      {goals.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Aucun objectif actif. Demande à ton coach pour structurer ton premier objectif.
        </p>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {goals.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                  <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.title}
                  </span>
                  <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {formatUserCurrency(g.current, profile)} / {formatUserCurrency(g.target, profile)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${g.pct}%`, height: "100%", backgroundColor: g.color, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 10, color: g.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>
                    {g.pct}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrioritesIACard({ hasGoals }: { hasGoals: boolean }) {
  // Moteur de priorisation d'actions par objectif (épargne/dépenses/
  // invest avec impact estimé) pas encore branché. Empty state honnête
  // + CTA vers le coach pour identifier les leviers personnalisés.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Priorités IA
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Actions à fort impact
      </p>
      <div style={{ marginTop: 8, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 6, padding: "8px 4px" }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.35 }}>
          {hasGoals
            ? "Analyse IA en préparation"
            : "Aucune priorité identifiée"}
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.45 }}>
          {hasGoals
            ? "Demande à ton coach quelles actions accélèrent le plus tes objectifs."
            : "Définis ton premier objectif pour identifier les leviers à activer."}
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

function GainsFutursCard({ hasGoals }: { hasGoals: boolean }) {
  // Projection patrimoine fiable nécessite une combinaison de
  // current_savings + rendement attendu + cashflow net stable. Tant
  // que ce moteur n'est pas validé produit, on n'affiche pas de
  // chiffres extrapolés — empty state premium.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Gains futurs
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Projection patrimoine
      </p>
      <div style={{ marginTop: 8, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 6, padding: "8px 4px" }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.35 }}>
          {hasGoals ? "Projection bientôt disponible" : "Aucune projection disponible"}
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.45 }}>
          La projection patrimoine prendra en compte ton épargne actuelle, tes objectifs et tes flux mensuels une fois le moteur calibré.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function ProgressionMensuelleCard() {
  // Historique mensuel de l'épargne agrégée par objectif pas encore
  // stocké (pas de snapshot mensuel goal_history). Empty state propre
  // tant que la table n'existe pas.
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Progression mensuelle
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            12 derniers mois
          </p>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          flex: 1,
          minHeight: 95,
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
          Ta progression mensuelle apparaîtra ici dès que ton épargne sera agrégée mois après mois.
        </p>
      </div>
    </div>
  );
}

function JalonsCard({
  milestones,
  hasActive,
}: {
  milestones: MilestoneView[];
  hasActive: boolean;
}) {
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Jalons à venir
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Prochaines échéances
      </p>
      {milestones.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          {hasActive
            ? "Aucune échéance définie sur tes objectifs actifs."
            : "Définis tes objectifs pour voir tes échéances à venir."}
        </p>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {milestones.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <div
                style={{
                  width: 32,
                  textAlign: "center",
                  flexShrink: 0,
                  padding: "3px 0",
                  borderRadius: 5,
                  backgroundColor: C.cardBg,
                }}
              >
                <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: C.textMuted, letterSpacing: "0.06em" }}>
                  {it.month}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", lineHeight: 1, letterSpacing: "-0.025em" }}>
                  {it.day}
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                  {it.title}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                  {it.typeLabel}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: 9.5, fontWeight: 700, color: it.delayColor }}>
                  {it.delayLabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConseilIACard({
  progressPct,
  hasGoals,
}: {
  progressPct: number | null;
  hasGoals: boolean;
}) {
  const headline = !hasGoals
    ? "Définis ton premier objectif"
    : progressPct === null
      ? "Active des montants cibles"
      : progressPct >= 75
        ? "Tu es sur la bonne voie !"
        : progressPct >= 40
          ? "Bonne progression à maintenir"
          : "Continue ton effort";
  const body = !hasGoals
    ? "Un objectif clair structure ton effort d'épargne mois après mois."
    : progressPct === null
      ? "Renseigne un montant cible sur chacun de tes objectifs pour suivre ta progression."
      : progressPct >= 75
        ? "Tu atteins bientôt tes objectifs. Identifie le prochain palier avec ton coach."
        : "Identifie avec ton coach les leviers qui accélèrent le plus tes objectifs.";
  return (
    <div
      style={{
        padding: "6px 14px",
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
      <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: C.textDark, fontWeight: 700, lineHeight: 1.3 }}>
        {headline}
      </p>
      <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textDark, lineHeight: 1.35 }}>
        {body}
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
        Parler à mon coach
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter({
  totalSaved,
  progressPct,
  hasGoals,
  profile,
}: {
  totalSaved: number;
  progressPct: number | null;
  hasGoals: boolean;
  profile: Profile;
}) {
  const headline = !hasGoals
    ? "Définis ton premier objectif"
    : totalSaved > 0
      ? `Tu as déjà épargné ${formatUserCurrency(totalSaved, profile)} au total.`
      : "Active tes premiers montants pour démarrer ton suivi";
  const subline =
    !hasGoals
      ? "Commence en parlant à ton coach des montants et échéances qui comptent."
      : progressPct === null
        ? "Renseigne tes montants cibles pour suivre ta progression."
        : `Progression globale : ${progressPct} %`;
  return (
    <div
      style={{
        padding: "8px 16px",
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
            backgroundColor: C.successBg,
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {headline}
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
            {subline}
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
        Discuter avec mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * Phase 5.0 — /design-match/mon-analyse-v3
 *
 * Page Mon Analyse V3 — cockpit d'analyse financière aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que les 10 autres pages V3 verrouillées.
 *
 * Cette page n'est PAS la page Profil utilisateur : elle répond
 * à "Quelle est mon analyse financière ?" et présente le score,
 * la trajectoire, les forces et les axes d'amélioration.
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : AnalyseHero · ScoreGlobalCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : ProfilAnalyseCard · ForcesCard · AxesCard
 *   Row 3 (1.4fr / 1fr / 1fr)  : ProgressionCard · TrajectoireCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/services/finance";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import { listMyRecentSnapshots } from "@/lib/services/health-snapshots";
import { FINANCIAL_SITUATIONS } from "@/lib/constants";
import type {
  DrawerData,
  AxisId,
  AxisResult,
  Band,
  SealedSnapshot,
} from "@/lib/calculations/health/types";
import { V3TopbarMenu } from "@/components/layout/v3-topbar-menu";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return { title: `${t("monAnalyse")} — LIBERIA` };
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

/* ═══════════════ TYPES & HELPERS ═══════════════ */

// Seuils canoniques FHS (lib/calculations/health/constants.ts) :
//   rose < 40, ambre [40, 65), or [65, 85), emeraude ≥ 85
const BAND_THRESHOLD: Record<Band, number> = {
  rose: 0,
  ambre: 40,
  or: 65,
  emeraude: 85,
};

const NEXT_BAND: Record<Band, Band | null> = {
  rose: "ambre",
  ambre: "or",
  or: "emeraude",
  emeraude: null,
};

// Tous les axes FHS dans leur ordre canonique
const AXIS_ORDER: AxisId[] = [
  "discipline",
  "resilience",
  "trajectoire",
  "couverture",
  "objectifs",
  "comportement",
];

function initialsFrom(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || null;
}

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

/** "2026-W23" → "S23". */
function weekToShortLabel(week: string): string {
  const m = /-W(\d{1,2})$/.exec(week);
  return m ? `S${parseInt(m[1], 10)}` : week;
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchMonAnalyseV3() {
  const [data, authedUser] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
  ]);
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;
  const initials = initialsFrom(fullName);

  /* ------------------------------------------------------------------ */
  /*  FHS drawer + snapshots                                            */
  /* ------------------------------------------------------------------ */

  let drawerData: DrawerData | null = null;
  let snapshots: SealedSnapshot[] = [];
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
      snapshots = await listMyRecentSnapshots(12);
    } catch (err) {
      console.error("[mon-analyse] FHS compute failed", err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  i18n — résolus côté serveur                                       */
  /* ------------------------------------------------------------------ */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tAxes = (await getTranslations(
    "dashboard.health.axes.labels",
  )) as (key: string) => string;
  const tBands = (await getTranslations(
    "dashboard.health.bands",
  )) as (key: string) => string;
  const tReco = (await getTranslations(
    "dashboard.health.recommendation",
  )) as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const score = drawerData?.score.display ?? null;
  const band = drawerData?.score.band ?? null;
  const bandLabel = band ? tBands(band) : null;
  const netDelta = drawerData?.delta?.netDelta ?? null;
  const momentum = drawerData?.momentum ?? null;

  // Phrase "Niveau {Band} en progression/stable/repli" — adaptatif et
  // honnête, basé sur la combinaison band + momentum.direction. Si l'un
  // des deux manque, on omet la moitié correspondante.
  const tagline = (() => {
    if (!bandLabel) return null;
    if (!momentum) return `Niveau ${bandLabel}`;
    const dir =
      momentum.direction === "UP"
        ? "en progression"
        : momentum.direction === "DOWN"
          ? "en recul léger"
          : "stable";
    return `Niveau ${bandLabel} · ${dir}`;
  })();

  // Décomposition pour ScoreGlobalCard : Score global + 3 axes
  // (discipline, couverture, trajectoire) avec confidence !== UNKNOWN.
  const axisColor = (v: number): string =>
    v >= 75 ? C.success : v >= 55 ? C.primary : v >= 40 ? C.amber : C.coral;
  const scoreStats: { label: string; value: string; color: string }[] = [];
  if (score !== null) {
    scoreStats.push({
      label: "Score global",
      value: `${score} / 100`,
      color: axisColor(score),
    });
  }
  if (drawerData?.score.axes) {
    for (const id of ["discipline", "couverture", "trajectoire"] as AxisId[]) {
      const a = drawerData.score.axes[id];
      if (a && a.confidence !== "UNKNOWN") {
        scoreStats.push({
          label: tAxes(id),
          value: `${a.score} %`,
          color: axisColor(a.score),
        });
      }
    }
  }

  // Forces et axes de progrès depuis les 6 axes FHS
  const allAxes: { id: AxisId; label: string; score: number }[] = [];
  if (drawerData?.score.axes) {
    for (const id of AXIS_ORDER) {
      const a: AxisResult | undefined = drawerData.score.axes[id];
      if (a && a.confidence !== "UNKNOWN") {
        allAxes.push({ id, label: tAxes(id), score: a.score });
      }
    }
  }
  const forces = allAxes
    .filter((a) => a.score >= 70)
    .sort((b, a) => a.score - b.score)
    .slice(0, 4);
  const lowAxes = allAxes
    .filter((a) => a.score < 70)
    .sort((a, b) => a.score - b.score);
  // Mettre l'axe ciblé par la reco en tête s'il est dans les lowAxes
  const targetAxis = drawerData?.recommendation?.targetAxis ?? null;
  const axesToWork = targetAxis
    ? [
        ...lowAxes.filter((a) => a.id === targetAxis),
        ...lowAxes.filter((a) => a.id !== targetAxis),
      ].slice(0, 4)
    : lowAxes.slice(0, 4);

  // ProfilAnalyseCard — uniquement les vraies signatures
  const situationLabel = data.financialProfile
    ? FINANCIAL_SITUATIONS.find(
        (s) => s.id === data.financialProfile?.situation,
      )?.label ?? null
    : null;
  const profileTraits: { label: string; value: string; color: string }[] = [];
  if (bandLabel) {
    profileTraits.push({
      label: "Niveau",
      value: bandLabel,
      color: score !== null && score >= 65 ? C.success : C.primary,
    });
  }
  if (situationLabel) {
    profileTraits.push({
      label: "Situation",
      value: situationLabel,
      color:
        data.financialProfile?.situation === "comfortable"
          ? C.success
          : data.financialProfile?.situation === "stable"
            ? C.primary
            : data.financialProfile?.situation === "tight"
              ? C.amber
              : C.coral,
    });
  }
  if (data.financialProfile?.main_goal?.trim()) {
    profileTraits.push({
      label: "Objectif principal",
      value: data.financialProfile.main_goal,
      color: C.primary,
    });
  }
  if (drawerData?.recommendation && targetAxis) {
    profileTraits.push({
      label: "Priorité",
      value: tAxes(targetAxis),
      color: C.violet,
    });
  }
  if (momentum) {
    const momText =
      momentum.direction === "UP"
        ? "En progression"
        : momentum.direction === "DOWN"
          ? "En recul léger"
          : "Stable";
    const momColor =
      momentum.direction === "UP"
        ? C.success
        : momentum.direction === "DOWN"
          ? C.coral
          : C.textMuted;
    profileTraits.push({
      label: "Momentum",
      value: momText,
      color: momColor,
    });
  }

  // ProgressionCard — réutilise les snapshots si on en a au moins 2
  const chronoSnapshots = [...snapshots].reverse();
  const progressionPoints = chronoSnapshots.map((s) => ({
    label: weekToShortLabel(s.week),
    value: s.result.display,
  }));
  const hasProgression = progressionPoints.length >= 2;
  const progressionDelta = hasProgression
    ? progressionPoints[progressionPoints.length - 1].value -
      progressionPoints[0].value
    : null;

  // ConseilIACard — issu de recommendation
  const recommendationCopy = drawerData?.recommendation
    ? {
        title: tReco(
          `${drawerData.recommendation.titleKey}.title`,
          drawerData.recommendation.payload,
        ),
        desc: tReco(
          `${drawerData.recommendation.titleKey}.desc`,
          drawerData.recommendation.payload,
        ),
        estimatedGain: drawerData.recommendation.estimatedGain,
      }
    : null;

  // MissionFooter — points pour atteindre le prochain palier
  const nextBand = band ? NEXT_BAND[band] : null;
  const nextBandLabel = nextBand ? tBands(nextBand) : null;
  const nextThreshold = nextBand ? BAND_THRESHOLD[nextBand] : null;
  const ptsToNext =
    score !== null && nextThreshold !== null && score < nextThreshold
      ? nextThreshold - score
      : null;

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-pro-row] { grid-template-columns: 1fr !important; }
          [data-pro-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-pro-sidebar] { display: none !important; }
          [data-pro-content] { margin-left: 0 !important; }
          [data-pro-main] { padding: 0 16px 16px 16px !important; }
          [data-pro-topbar] { padding: 0 16px !important; }
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
        <div data-pro-sidebar>
          <Sidebar />
        </div>
        <div data-pro-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-pro-main
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
            <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <AnalyseHero
                score={score}
                netDelta={netDelta}
                tagline={tagline}
                initials={initials}
              />
              <ScoreGlobalCard stats={scoreStats} />
            </div>
            <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <ProfilAnalyseCard traits={profileTraits} />
              <ForcesCard items={forces} />
              <AxesCard items={axesToWork} />
            </div>
            <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <ProgressionCard
                points={progressionPoints}
                latestScore={score}
                delta={progressionDelta}
              />
              <TrajectoireCard />
              <ConseilIACard
                recommendation={recommendationCopy}
                hasScore={score !== null}
              />
            </div>
            <MissionFooter
              score={score}
              bandLabel={bandLabel}
              nextBandLabel={nextBandLabel}
              ptsToNext={ptsToNext}
            />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Profil actif) ═══════════════ */

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
          <NavItem label="Mon analyse" href="/design-match/mon-analyse-v3" iconPath="M22 12h-4l-3 9L9 3l-3 9H2" active />
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
      data-pro-topbar
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
          Votre analyse financière complète et votre trajectoire personnalisée.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <V3TopbarMenu fullName={fullName} />
      </div>
    </header>
  );
}
/* ═══════════════ ROW 1 ═══════════════ */

function AnalyseHero({
  score,
  netDelta,
  tagline,
  initials,
}: {
  score: number | null;
  netDelta: number | null;
  tagline: string | null;
  initials: string | null;
}) {
  const hasScore = score !== null;
  const scoreText = hasScore ? `${score} / 100` : "—";
  const progressWidth = hasScore
    ? `${Math.max(0, Math.min(100, score))}%`
    : "0%";
  const progressLabel = hasScore ? `${score}%` : "—";
  const deltaText =
    netDelta !== null && netDelta !== 0
      ? `${netDelta > 0 ? "+" : ""}${netDelta} pts`
      : null;
  const deltaColor =
    netDelta !== null && netDelta > 0
      ? "#5EEAD4"
      : netDelta !== null && netDelta < 0
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
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Analyse financière
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
              {scoreText}
            </p>
            {deltaText && (
              <>
                <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor, fontVariantNumeric: "tabular-nums" }}>
                  {deltaText}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>cette semaine</span>
              </>
            )}
          </div>
          {tagline ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              {tagline}
            </p>
          ) : !hasScore ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.3 }}>
              Score pas encore calculé. Complète ton profil financier.
            </p>
          ) : null}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
              <div style={{ width: progressWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              {progressLabel}
            </span>
          </div>
        </div>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 999,
            background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 18px -6px rgba(0, 0, 0, 0.30)",
            color: "white",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.02em",
          }}
          aria-hidden
        >
          {initials ?? "—"}
        </div>
      </div>
    </div>
  );
}

function ScoreGlobalCard({
  stats,
}: {
  stats: { label: string; value: string; color: string }[];
}) {
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
        Décomposition du score
      </p>
      {stats.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Score pas encore calculé.
        </p>
      ) : (
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
      )}
      <Link
        href="/dashboard"
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
        Voir tous les axes
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function ProfilAnalyseCard({
  traits,
}: {
  traits: { label: string; value: string; color: string }[];
}) {
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Signature financière
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre signature financière
      </p>
      {traits.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Complète ton profil financier pour voir ta signature.
        </p>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {traits.map((t) => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ fontSize: 10, color: C.textMuted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.label}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: t.color, fontFamily: "Outfit, Inter, system-ui", textAlign: "right", flexShrink: 0 }}>
                {t.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ForcesCard({
  items,
}: {
  items: { id: AxisId; label: string; score: number }[];
}) {
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Forces financières
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Vos points forts
      </p>
      {items.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Pas encore de point fort identifié. Avance d&apos;abord sur tes axes prioritaires.
        </p>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, backgroundColor: C.successBg, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                {it.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.success, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {it.score} %
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AxesCard({
  items,
}: {
  items: { id: AxisId; label: string; score: number }[];
}) {
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Axes de progrès
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        À travailler ensemble
      </p>
      {items.length === 0 ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Tous tes axes sont au-dessus de 70 % — joli travail.
        </p>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, backgroundColor: C.amberBg, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12" y2="17" />
                </svg>
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                {it.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {it.score} %
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function ProgressionCard({
  points,
  latestScore,
  delta,
}: {
  points: { label: string; value: number }[];
  latestScore: number | null;
  delta: number | null;
}) {
  const hasChart = points.length >= 2;
  const W = 360;
  const HH = 108;
  const PAD = { top: 14, right: 14, bottom: 14, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 0;
  const maxV = 100;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x:
      PAD.left +
      (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.top + innerH;
  const areaD =
    hasChart && scaled.length > 0
      ? `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`
      : "";
  const yTicks = [25, 50, 75];
  const last = scaled[scaled.length - 1];
  const deltaText =
    delta !== null && delta !== 0
      ? `${delta > 0 ? "+" : ""}${delta} pts`
      : null;
  const deltaBg = delta !== null && delta > 0 ? C.successBg : C.coralBg;
  const deltaFg = delta !== null && delta > 0 ? C.success : C.coral;
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Progression
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Score sur 12 dernières semaines
          </p>
        </div>
        {deltaText && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 7px",
              borderRadius: 999,
              backgroundColor: deltaBg,
              fontSize: 10,
              fontWeight: 700,
              color: deltaFg,
            }}
          >
            {deltaText}
          </span>
        )}
      </div>
      {!hasChart ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5, flex: 1 }}>
          Pas encore assez d&apos;historique. Ton score est figé chaque dimanche — reviens après un ou deux dimanches pour voir ta courbe.
        </p>
      ) : (
        <div style={{ marginTop: 4, flex: 1 }}>
          <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
            <defs>
              <linearGradient id="pro-prog-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
                <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((v) => {
              const y = PAD.top + innerH - ((v - minV) / range) * innerH;
              return (
                <g key={v}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.5} />
                  <text x={PAD.left - 4} y={y + 2} fontSize="7.5" fill={C.textLight} textAnchor="end">
                    {v}
                  </text>
                </g>
              );
            })}
            <path d={areaD} fill="url(#pro-prog-grad)" />
            <path d={pathD} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {scaled.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="white" stroke={C.primary} strokeWidth={1.3} />
            ))}
            {last && (
              <>
                <circle cx={last.x} cy={last.y} r={3.5} fill={C.primary} />
                <text x={last.x} y={last.y - 6} fontSize="8.5" fontWeight="700" fill={C.primary} fontFamily="Outfit, Inter, system-ui" textAnchor="end">
                  {latestScore !== null ? `${latestScore} / 100` : `${last.value} / 100`}
                </text>
              </>
            )}
            {scaled.filter((_, i) => i % 2 === 0).map((p, i) => (
              <text key={`x-${i}`} x={p.x} y={HH - 3} fontSize="7" fill={C.textLight} textAnchor="middle">
                {p.label}
              </text>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function TrajectoireCard() {
  // Aucun moteur de projection FHS n'existe aujourd'hui : la
  // projection à 3 ans demanderait au minimum un modèle d'évolution
  // par axe (discipline / résilience / trajectoire / etc.) calibré
  // produit. Tant que ce moteur n'est pas validé, on n'invente PAS
  // de score futur. Empty state premium.
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Trajectoire financière
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre évolution projetée
      </p>
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
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <p style={{ margin: "8px 0 0 0", fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Projection en construction
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, maxWidth: 240 }}>
          Ta trajectoire à 1, 3 et 5 ans s&apos;affinera au fil de tes snapshots hebdomadaires.
        </p>
      </div>
    </div>
  );
}

function ConseilIACard({
  recommendation,
  hasScore,
}: {
  recommendation: {
    title: string;
    desc: string;
    estimatedGain: number | null;
  } | null;
  hasScore: boolean;
}) {
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
      {recommendation ? (
        <>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {recommendation.title}
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            {recommendation.desc}
            {recommendation.estimatedGain !== null && recommendation.estimatedGain > 0 && (
              <>
                {" "}
                <span style={{ color: C.primary, fontWeight: 700 }}>
                  +{recommendation.estimatedGain} pts estimés
                </span>
                .
              </>
            )}
          </p>
        </>
      ) : (
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
          {hasScore
            ? "Pas de conseil prioritaire pour l'instant. Pose une question à ton coach pour avancer."
            : "Complète ton profil financier pour recevoir un conseil personnalisé."}
        </p>
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
        Parler à mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter({
  score,
  bandLabel,
  nextBandLabel,
  ptsToNext,
}: {
  score: number | null;
  bandLabel: string | null;
  nextBandLabel: string | null;
  ptsToNext: number | null;
}) {
  const hasScore = score !== null;
  const scoreText = hasScore ? `${score} / 100` : "—";
  const barWidth = hasScore
    ? `${Math.max(0, Math.min(100, score))}%`
    : "0%";
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
          🏆
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Score financier{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{scoreText}</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            {bandLabel && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                  Niveau {bandLabel}
                </span>
                <span style={{ marginTop: 1, fontSize: 11, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
                  {scoreText}
                </span>
              </div>
            )}
          </div>
          {ptsToNext !== null && nextBandLabel ? (
            <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
              Encore{" "}
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {ptsToNext} point{ptsToNext > 1 ? "s" : ""}
              </span>{" "}
              pour atteindre le niveau {nextBandLabel}.
            </p>
          ) : hasScore && !nextBandLabel ? (
            <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
              Niveau maximal atteint. Maintiens le rythme.
            </p>
          ) : !hasScore ? (
            <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
              Score pas encore calculé. Complète ton profil financier.
            </p>
          ) : null}
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
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        {nextBandLabel
          ? `Atteindre le niveau ${nextBandLabel}`
          : "Parler à mon coach"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

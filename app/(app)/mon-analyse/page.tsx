/**
 * /mon-analyse — Analyse financière (Mon Analyse).
 *
 * Cockpit d'analyse : score FHS, décomposition par axes, forces, axes
 * de progrès, progression, recommandation IA. Aucune donnée mockée
 * affichée comme réelle — chaque carte qui n'a pas de donnée backend
 * affiche un empty state explicite.
 *
 * Sidebar + topbar + greeting fournis par AppShell via (app)/layout.tsx.
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : AnalyseHero · ScoreGlobalCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : ProfilAnalyseCard · ForcesCard · AxesCard
 *   Row 3 (1.4fr / 1fr / 1fr)  : ProgressionCard · MomentumCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/services/finance";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import { listMyRecentSnapshots } from "@/lib/services/health-snapshots";
import { FINANCIAL_SITUATIONS, STRESS_LEVELS } from "@/lib/constants";
import type {
  DrawerData,
  AxisId,
  Band,
  SealedSnapshot,
} from "@/lib/calculations/health/types";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon analyse — LIBERIA",
};

const AXIS_ORDER: AxisId[] = [
  "discipline",
  "resilience",
  "trajectoire",
  "couverture",
  "objectifs",
  "comportement",
];

const BAND_LABEL: Record<Band, string> = {
  rose: "Rose",
  ambre: "Ambre",
  or: "Or",
  emeraude: "Émeraude",
};

const BAND_THRESHOLD: Record<Band, number> = {
  rose: 0,
  ambre: 50,
  or: 70,
  emeraude: 85,
};

const NEXT_BAND: Record<Band, Band | null> = {
  rose: "ambre",
  ambre: "or",
  or: "emeraude",
  emeraude: null,
};

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

export default async function MonAnalysePage() {
  const data = await getFinanceData();

  // FHS drawer (score + axes + delta + recommendation + momentum).
  let drawerData: DrawerData | null = null;
  let snapshots: SealedSnapshot[] = [];
  if (!data.isDemo) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const extras = await gatherExtraSignals({
          userId: user.id,
          financeData: data,
          accountCreatedAt: user.created_at ?? null,
        });
        drawerData = await getOrSealDrawerData({
          userId: user.id,
          financeData: data,
          extras,
        });
        snapshots = await listMyRecentSnapshots(12);
      }
    } catch (err) {
      console.error("[mon-analyse] FHS drawer compute failed", err);
    }
  }

  const fullName = data.profile.full_name ?? null;
  const initials = initialsFrom(fullName);

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

  const score = drawerData?.score.display ?? null;
  const band = drawerData?.score.band ?? null;
  const bandLabel = band ? tBands(band) : null;
  const netDelta = drawerData?.delta?.netDelta ?? null;

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-pro-row] { grid-template-columns: 1fr !important; }
          [data-pro-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-pro-main] { padding: 0 16px 16px 16px !important; }
        }
      `}</style>
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
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
          <AnalyseHero
            score={score}
            bandLabel={bandLabel}
            netDelta={netDelta}
            initials={initials}
          />
          <ScoreGlobalCard
            score={score}
            axes={drawerData?.score.axes ?? null}
            axisLabel={tAxes}
          />
        </div>
        <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
          <ProfilAnalyseCard profile={data.financialProfile} />
          <ForcesCard axes={drawerData?.score.axes ?? null} axisLabel={tAxes} />
          <AxesCard
            axes={drawerData?.score.axes ?? null}
            recommendation={drawerData?.recommendation ?? null}
            axisLabel={tAxes}
          />
        </div>
        <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
          <ProgressionCard snapshots={snapshots} latestScore={score} />
          <MomentumCard momentum={drawerData?.momentum ?? null} />
          <ConseilIACard recommendation={recommendationCopy} />
        </div>
        <MissionFooter score={score} band={band} bandLabel={bandLabel} />
      </main>
    </>
  );
}

/* ═══════════════ ROW 1 ═══════════════ */

function AnalyseHero({
  score,
  bandLabel,
  netDelta,
  initials,
}: {
  score: number | null;
  bandLabel: string | null;
  netDelta: number | null;
  initials: string | null;
}) {
  const hasScore = score !== null;
  const scoreText = hasScore ? `${score} / 100` : "—";
  const progressWidth = hasScore ? `${Math.max(0, Math.min(100, score))}%` : "0%";
  const progressLabel = hasScore ? `${score}%` : "—";
  const deltaText =
    netDelta !== null && netDelta !== 0
      ? `${netDelta > 0 ? "+" : ""}${netDelta} pts`
      : null;
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
                <span style={{ fontSize: 12, fontWeight: 700, color: netDelta && netDelta > 0 ? "#5EEAD4" : "#FCA5A5", fontVariantNumeric: "tabular-nums" }}>
                  {deltaText}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>cette semaine</span>
              </>
            )}
          </div>
          {bandLabel && (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              Niveau {bandLabel}
            </p>
          )}
          {!hasScore && (
            <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.3 }}>
              Données insuffisantes pour calculer ton score. Complète ton profil financier.
            </p>
          )}
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
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
  score,
  axes,
  axisLabel,
}: {
  score: number | null;
  axes: DrawerData["score"]["axes"] | null;
  axisLabel: (key: string) => string;
}) {
  const axisColor = (v: number): string =>
    v >= 75 ? C.success : v >= 55 ? C.primary : v >= 40 ? C.amber : C.coral;
  const stats: { label: string; value: string; color: string }[] = [];
  if (score !== null) {
    stats.push({
      label: "Score financier",
      value: `${score} / 100`,
      color: axisColor(score),
    });
  }
  if (axes) {
    for (const id of ["discipline", "couverture", "trajectoire"] as AxisId[]) {
      const a = axes[id];
      if (a && a.confidence !== "UNKNOWN") {
        stats.push({
          label: axisLabel(id),
          value: `${a.score} %`,
          color: axisColor(a.score),
        });
      }
    }
  }
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
        <EmptyHint>Score pas encore calculé.</EmptyHint>
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "10px 0 0 0",
        flex: 1,
        display: "flex",
        alignItems: "center",
        fontSize: 11,
        color: C.textMuted,
        lineHeight: 1.4,
      }}
    >
      {children}
    </p>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function ProfilAnalyseCard({
  profile,
}: {
  profile: {
    situation: "struggling" | "tight" | "stable" | "comfortable";
    main_goal: string | null;
    has_emergency_fund: boolean;
    perceived_stress: number;
  } | null;
}) {
  const traits: { label: string; value: string; color: string }[] = [];
  if (profile) {
    const situation = FINANCIAL_SITUATIONS.find((s) => s.id === profile.situation);
    if (situation) {
      const color =
        profile.situation === "comfortable"
          ? C.success
          : profile.situation === "stable"
            ? C.primary
            : profile.situation === "tight"
              ? C.amber
              : C.coral;
      traits.push({ label: "Situation", value: situation.label, color });
    }
    if (profile.main_goal && profile.main_goal.trim()) {
      traits.push({
        label: "Objectif principal",
        value: profile.main_goal,
        color: C.primary,
      });
    }
    traits.push({
      label: "Fonds d'urgence",
      value: profile.has_emergency_fund ? "Oui" : "Non",
      color: profile.has_emergency_fund ? C.success : C.amber,
    });
    const stress = STRESS_LEVELS.find((s) => s.value === profile.perceived_stress);
    if (stress) {
      const color =
        profile.perceived_stress <= 2
          ? C.success
          : profile.perceived_stress === 3
            ? C.amber
            : C.coral;
      traits.push({ label: "Stress perçu", value: stress.label, color });
    }
  }
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Signature financière
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre signature financière
      </p>
      {traits.length === 0 ? (
        <EmptyHint>
          Complète ton profil financier pour voir ta signature.
        </EmptyHint>
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
  axes,
  axisLabel,
}: {
  axes: DrawerData["score"]["axes"] | null;
  axisLabel: (key: string) => string;
}) {
  const items: { id: AxisId; label: string; score: number }[] = [];
  if (axes) {
    for (const id of AXIS_ORDER) {
      const a = axes[id];
      if (a && a.confidence !== "UNKNOWN" && a.score >= 70) {
        items.push({ id, label: axisLabel(id), score: a.score });
      }
    }
    items.sort((a, b) => b.score - a.score);
  }
  const top = items.slice(0, 4);
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Forces financières
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Vos points forts
      </p>
      {top.length === 0 ? (
        <EmptyHint>
          Pas encore de point fort identifié. Avance d&apos;abord sur tes axes prioritaires.
        </EmptyHint>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {top.map((it) => (
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
  axes,
  recommendation,
  axisLabel,
}: {
  axes: DrawerData["score"]["axes"] | null;
  recommendation: DrawerData["recommendation"] | null;
  axisLabel: (key: string) => string;
}) {
  const items: { id: AxisId; label: string; score: number }[] = [];
  if (axes) {
    for (const id of AXIS_ORDER) {
      const a = axes[id];
      if (a && a.confidence !== "UNKNOWN" && a.score < 70) {
        items.push({ id, label: axisLabel(id), score: a.score });
      }
    }
    items.sort((a, b) => a.score - b.score);
  }
  const targeted = recommendation?.targetAxis ?? null;
  const ordered = targeted
    ? [
        ...items.filter((it) => it.id === targeted),
        ...items.filter((it) => it.id !== targeted),
      ]
    : items;
  const top = ordered.slice(0, 4);
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Axes de progrès
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        À travailler ensemble
      </p>
      {top.length === 0 ? (
        <EmptyHint>
          Tous tes axes sont au-dessus de 70 % — joli travail.
        </EmptyHint>
      ) : (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
          {top.map((it) => (
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
  snapshots,
  latestScore,
}: {
  snapshots: SealedSnapshot[];
  latestScore: number | null;
}) {
  // listMyRecentSnapshots vient trié DESC (semaine la plus récente en premier).
  // On reconstruit l'ordre chronologique pour la courbe.
  const chrono = [...snapshots].reverse();
  const points = chrono.map((s) => ({
    label: weekToShortLabel(s.week),
    value: s.result.display,
  }));
  const hasChart = points.length >= 2;
  const netDelta = hasChart
    ? points[points.length - 1].value - points[0].value
    : null;
  const deltaText =
    netDelta !== null && netDelta !== 0
      ? `${netDelta > 0 ? "+" : ""}${netDelta} pts`
      : null;
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
              backgroundColor: netDelta && netDelta > 0 ? C.successBg : C.coralBg,
              fontSize: 10,
              fontWeight: 700,
              color: netDelta && netDelta > 0 ? C.success : C.coral,
            }}
          >
            {deltaText}
          </span>
        )}
      </div>
      {!hasChart ? (
        <EmptyHint>
          Pas encore assez d&apos;historique. Ton score est figé chaque
          dimanche — reviens après un ou deux dimanches pour voir ta
          courbe.
        </EmptyHint>
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

/** "2026-W23" → "S23". */
function weekToShortLabel(week: string): string {
  const m = /-W(\d{1,2})$/.exec(week);
  return m ? `S${parseInt(m[1], 10)}` : week;
}

function MomentumCard({
  momentum,
}: {
  momentum: DrawerData["momentum"] | null;
}) {
  const dirLabel: Record<"UP" | "DOWN" | "FLAT", string> = {
    UP: "Progression",
    DOWN: "Repli",
    FLAT: "Stable",
  };
  const strLabel: Record<"WEAK" | "MEDIUM" | "STRONG", string> = {
    WEAK: "léger",
    MEDIUM: "soutenu",
    STRONG: "fort",
  };
  const tone: Record<"UP" | "DOWN" | "FLAT", { bg: string; fg: string }> = {
    UP: { bg: C.successBg, fg: C.success },
    DOWN: { bg: C.coralBg, fg: C.coral },
    FLAT: { bg: C.primaryBg, fg: C.primary },
  };
  const tones = momentum ? tone[momentum.direction] : null;
  const deltaSign =
    momentum && momentum.delta4Weeks > 0
      ? "+"
      : momentum && momentum.delta4Weeks < 0
        ? ""
        : "";
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Momentum
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sur les 4 dernières semaines
      </p>
      {!momentum || !tones ? (
        <EmptyHint>
          Pas encore assez d&apos;historique pour mesurer la tendance.
          Il faut au moins deux semaines de score.
        </EmptyHint>
      ) : (
        <>
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              backgroundColor: tones.bg,
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 9.5, color: tones.fg, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {dirLabel[momentum.direction]} · {strLabel[momentum.strength]}
            </p>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: 20,
                fontWeight: 700,
                color: tones.fg,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.025em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {deltaSign}
              {momentum.delta4Weeks} pts
            </p>
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
            Mesuré sur {momentum.windowSize} snapshot
            {momentum.windowSize > 1 ? "s" : ""} hebdomadaire
            {momentum.windowSize > 1 ? "s" : ""}.
          </p>
        </>
      )}
    </div>
  );
}

function ConseilIACard({
  recommendation,
}: {
  recommendation: {
    title: string;
    desc: string;
    estimatedGain: number | null;
  } | null;
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
            {recommendation.estimatedGain && recommendation.estimatedGain > 0 && (
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
          Pas de conseil prioritaire pour l&apos;instant. Pose une question
          à ton coach pour avancer.
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
  band,
  bandLabel,
}: {
  score: number | null;
  band: Band | null;
  bandLabel: string | null;
}) {
  const hasScore = score !== null;
  const scorePct = hasScore ? `${Math.max(0, Math.min(100, score))}%` : "0%";
  const nextBand = band ? NEXT_BAND[band] : null;
  const nextThreshold = nextBand ? BAND_THRESHOLD[nextBand] : null;
  const ptsToNext =
    hasScore && nextThreshold !== null && score < nextThreshold
      ? nextThreshold - score
      : null;
  const nextBandLabel = nextBand ? BAND_LABEL[nextBand] : null;
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
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {hasScore ? `${score} / 100` : "—"}
            </span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: scorePct, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            {bandLabel && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                  Niveau {bandLabel}
                </span>
                <span style={{ marginTop: 1, fontSize: 11, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
                  {hasScore ? `${score} / 100` : "—"}
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
          ) : hasScore && !nextBand ? (
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

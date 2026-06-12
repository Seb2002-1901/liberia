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
import { getFinanceData } from "@/lib/services/finance";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Match v3 — Mon analyse",
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

export default async function DesignMatchMonAnalyseV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

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
        <div data-pro-content style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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
              <AnalyseHero />
              <ScoreGlobalCard />
            </div>
            <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <ProfilAnalyseCard />
              <ForcesCard />
              <AxesCard />
            </div>
            <div data-pro-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <ProgressionCard />
              <TrajectoireCard />
              <ConseilIACard />
            </div>
            <MissionFooter />
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
        width: 248,
        backgroundColor: C.cardBg,
        borderRight: `1px solid ${C.borderGhost}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            backgroundColor: C.navy,
            borderRadius: 7,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span style={{ color: C.navy, letterSpacing: "0.16em", fontSize: 14, fontWeight: 700 }}>
          LIBERIA
        </span>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
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
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" href="/design-match/profil-v3" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </NavSection>
      </nav>
      <div style={{ padding: 10 }}>
        <div
          style={{
            padding: 12,
            backgroundColor: C.navy,
            borderRadius: 11,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.gold}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "white", letterSpacing: "0.04em" }}>
              LIBERIA PREMIUM
            </span>
          </div>
          <p style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <button
            style={{
              width: "100%",
              marginTop: 8,
              padding: "6px 10px",
              border: "none",
              backgroundColor: "white",
              fontSize: 11.5,
              fontWeight: 500,
              color: C.navy,
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            Gérer mon abonnement
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          padding: "6px 10px 4px 10px",
          fontSize: 10,
          fontWeight: 600,
          color: C.textLight,
          letterSpacing: "0.16em",
          margin: 0,
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
      data-pro-topbar
      style={{
        height: 60,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Bonjour {displayName} <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 2, fontSize: 11.5, color: C.textMuted, margin: "2px 0 0 0" }}>
          Votre analyse financière complète et votre trajectoire personnalisée.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 32,
            height: 32,
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: C.notifBadge,
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            2
          </span>
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "3px 10px 3px 3px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: C.textDark }}>
            {pillName}
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════ ROW 1 ═══════════════ */

function AnalyseHero() {
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
              84 / 100
            </p>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5EEAD4", fontVariantNumeric: "tabular-nums" }}>
              +22 pts
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>cette année</span>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            Profil discipliné en forte progression
          </p>
          <div style={{ marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill={C.gold}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "white", letterSpacing: "0.04em" }}>
              Top 18 % des utilisateurs Liberia
            </span>
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
              <div style={{ width: "84%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              84%
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
          SG
        </div>
      </div>
    </div>
  );
}

function ScoreGlobalCard() {
  const stats = [
    { label: "Score financier", value: "84 / 100", color: C.primary },
    { label: "Discipline", value: "91 %", color: C.success },
    { label: "Épargne", value: "88 %", color: C.success },
    { label: "Investissement", value: "74 %", color: C.primary },
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
        Décomposition du score
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
      <button
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
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir mon analyse
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function ProfilAnalyseCard() {
  const traits = [
    { label: "Profil", value: "Investisseur équilibré", color: C.primary },
    { label: "Niveau", value: "Confirmé", color: C.success },
    { label: "Horizon", value: "Long terme", color: C.violet },
    { label: "Risque", value: "Modéré", color: C.amber },
    { label: "Objectif principal", value: "Liberté financière", color: C.success },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Signature financière
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "1px 7px",
            fontSize: 9,
            fontWeight: 700,
            color: C.gold,
            backgroundColor: "#FFF8E1",
            borderRadius: 999,
            letterSpacing: "0.04em",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
          </svg>
          Top 18 %
        </span>
      </div>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre signature financière
      </p>
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
    </div>
  );
}

function ForcesCard() {
  const items = [
    "Épargne régulière",
    "Budget maîtrisé",
    "Objectifs définis",
    "Progression constante",
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Forces financières
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Vos points forts
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, backgroundColor: C.successBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              {it}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AxesCard() {
  const items = [
    "Revenus passifs",
    "Diversification",
    "Optimisation fiscale",
    "Accélération investissement",
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Axes de progrès
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        À travailler ensemble
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, backgroundColor: C.amberBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12" y2="17" />
              </svg>
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              {it}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function ProgressionCard() {
  const points = [
    { label: "Nov.", value: 62 },
    { label: "Déc.", value: 64 },
    { label: "Janv.", value: 67 },
    { label: "Févr.", value: 69 },
    { label: "Mars", value: 72 },
    { label: "Avr.", value: 74 },
    { label: "Mai", value: 76 },
    { label: "Juin", value: 78 },
    { label: "Juil.", value: 80 },
    { label: "Août", value: 81 },
    { label: "Sept.", value: 83 },
    { label: "Oct.", value: 84 },
  ];
  const W = 360;
  const HH = 108;
  const PAD = { top: 14, right: 14, bottom: 14, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 50;
  const maxV = 100;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [60, 70, 80, 90];
  const last = scaled[scaled.length - 1];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Progression
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Score sur 12 derniers mois
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
            borderRadius: 999,
            backgroundColor: C.successBg,
            fontSize: 10,
            fontWeight: 700,
            color: C.success,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 6 23 6 23 12" />
            <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
          </svg>
          +22 pts
        </span>
      </div>
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
          <circle cx={last.x} cy={last.y} r={3.5} fill={C.primary} />
          <text x={last.x} y={last.y - 6} fontSize="8.5" fontWeight="700" fill={C.primary} fontFamily="Outfit, Inter, system-ui" textAnchor="end">
            84 / 100
          </text>
          {scaled.filter((_, i) => i % 2 === 0).map((p) => (
            <text key={`x-${p.label}`} x={p.x} y={HH - 3} fontSize="7" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function TrajectoireCard() {
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Trajectoire financière
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre évolution projetée
      </p>
      <div style={{ marginTop: 8, padding: "8px 10px", backgroundColor: C.successBg, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 9.5, color: C.success, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Score estimé dans 3 ans
        </p>
        <p
          style={{
            margin: "2px 0 0 0",
            fontSize: 20,
            fontWeight: 700,
            color: C.success,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.025em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          95 / 100
        </p>
      </div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38, fontVariantNumeric: "tabular-nums" }}>2027</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "88%", height: "100%", backgroundColor: C.primary, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            88 / 100
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38, fontVariantNumeric: "tabular-nums" }}>2028</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "91%", height: "100%", backgroundColor: C.primary, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            91 / 100
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38, fontVariantNumeric: "tabular-nums" }}>2029</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "95%", height: "100%", backgroundColor: C.success, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.success, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            95 / 100
          </span>
        </div>
      </div>
    </div>
  );
}

function ConseilIACard() {
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
      <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
        Vous progressez plus vite que 82 % des utilisateurs.
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
        En maintenant votre rythme actuel, vous pourriez atteindre le <span style={{ color: C.primary, fontWeight: 700 }}>niveau Expert</span> en moins de 3 ans.
      </p>
      <button
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
          border: "none",
          cursor: "pointer",
        }}
      >
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter() {
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
            Score financier <span style={{ fontVariantNumeric: "tabular-nums" }}>84 / 100</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: "84%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
                Niveau Confirmé
              </span>
              <span style={{ marginTop: 1, fontSize: 11, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
                84 / 100
              </span>
            </div>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
            Encore <span style={{ fontVariantNumeric: "tabular-nums" }}>11 points</span> pour atteindre le niveau Expert.
          </p>
        </div>
      </div>
      <button
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
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Atteindre le niveau Expert
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

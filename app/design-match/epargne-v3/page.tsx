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
import { getFinanceData } from "@/lib/services/finance";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Match v3 — Épargne",
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

export default async function DesignMatchEpargneV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

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
              <EpargneHero />
              <RythmeEpargneCard />
            </div>
            <div data-epa-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 6 }}>
              <RepartitionCard />
              <ObjectifsEpargneCard />
              <RecommandationsCard />
            </div>
            <div data-epa-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 6 }}>
              <EvolutionCard />
              <SimulateurCard />
              <ProduitsCard />
            </div>
            <ConseilIAFooter />
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

function EpargneHero() {
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
              14 500 CHF
            </p>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5EEAD4", fontVariantNumeric: "tabular-nums" }}>
              +8.7%
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>ce mois-ci</span>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            Objectif&nbsp;: <span style={{ fontWeight: 600, color: "white", fontVariantNumeric: "tabular-nums" }}>50 000 CHF</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
              <div style={{ width: "29%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              29%
            </span>
          </div>
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

function RythmeEpargneCard() {
  // Mini sparkline rising
  const points = [10, 12, 13, 14, 16, 18, 19, 22, 24, 26, 28, 32];
  const W = 100;
  const HH = 38;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - 2) + 1;
    const y = HH - 2 - ((v - min) / range) * (HH - 4);
    return { x, y };
  });
  const pathD = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const last = coords[coords.length - 1];
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
        Votre rythme d&apos;épargne
      </p>
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
            1 200 CHF<span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}> /mois</span>
          </p>
          <p style={{ margin: "3px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
            <span style={{ color: C.textDark, fontWeight: 600 }}>24%</span> de vos revenus
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${HH}`} width={100} height={38} style={{ flexShrink: 0 }}>
          <path d={pathD} stroke={C.success} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last.x} cy={last.y} r={2} fill={C.success} />
        </svg>
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
          backgroundColor: C.successBg,
          fontSize: 10,
          fontWeight: 700,
          color: C.success,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Excellent rythme
      </span>
      <button
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
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir mes recommandations
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function RepartitionCard() {
  const slices = [
    { id: "urgence", label: "Fonds d'urgence", amount: "3 500", pct: 24, color: C.success },
    { id: "projets", label: "Épargne projets", amount: "4 200", pct: 29, color: C.primary },
    { id: "retraite", label: "Épargne retraite", amount: "3 800", pct: 26, color: C.violet },
    { id: "libre", label: "Épargne libre", amount: "2 500", pct: 17, color: C.amber },
    { id: "autres", label: "Autres", amount: "500", pct: 4, color: C.donutGrey },
  ];
  let cursor = -90;
  const gap = 1;
  const usableDeg = 360 - gap * slices.length;
  const total = slices.reduce((s, x) => s + x.pct, 0);
  const slicesWithPaths = slices.map((s) => {
    const sweep = (s.pct / total) * usableDeg;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
    cursor = endDeg + gap;
    return { ...s, path };
  });
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Par type d&apos;épargne
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" width={104} height={104}>
            {slicesWithPaths.map((s) => (
              <path key={s.id} d={s.path} fill={s.color} />
            ))}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              14 500
            </p>
            <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted, letterSpacing: "0.14em" }}>
              CHF
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
              <span style={{ color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {s.amount}
              </span>
              <span style={{ color: C.textMuted, fontWeight: 500, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectifsEpargneCard() {
  const goals = [
    { label: "Fonds d'urgence", amount: "3 500 / 15 000", pct: 23, color: C.success, iconBg: C.successBg, iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { label: "Apport maison", amount: "10 000 / 50 000", pct: 20, color: C.primary, iconBg: C.primaryBg, iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" },
    { label: "Voyage en famille", amount: "1 000 / 5 000", pct: 20, color: C.violet, iconBg: C.violetBg, iconPath: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" },
  ];
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Objectifs d&apos;épargne
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Suivi de vos objectifs
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {goals.map((g) => (
          <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, backgroundColor: g.iconBg, flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={g.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {g.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.label}
                </span>
                <span style={{ fontSize: 9.5, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {g.amount}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${g.pct}%`, height: "100%", backgroundColor: g.color, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 9.5, color: g.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>
                  {g.pct}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommandationsCard() {
  const items = [
    { label: "Fonds d'urgence", sub: "Continuer à alimenter", action: "Alimenter", color: C.success, bg: C.successBg, iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { label: "Épargne projets", sub: "Sur la bonne voie", action: "Planifier", color: C.primary, bg: C.primaryBg, iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    { label: "Épargne retraite", sub: "Optimisez votre 3e pilier", action: "Optimiser", color: C.violet, bg: C.violetBg, iconPath: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" },
  ];
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Recommandations
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Que faire avec mon épargne
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
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
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
            </div>
            <button
              style={{
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 600,
                color: it.color,
                backgroundColor: "white",
                border: `1px solid ${C.borderGhost}`,
                borderRadius: 6,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {it.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionCard() {
  const points = [
    { label: "Nov.", value: 5000 },
    { label: "Déc.", value: 6200 },
    { label: "Janv.", value: 7500 },
    { label: "Févr.", value: 8800 },
    { label: "Mars", value: 9800 },
    { label: "Avr.", value: 10800 },
    { label: "Mai", value: 11500 },
    { label: "Juin", value: 12200 },
    { label: "Juil.", value: 12900 },
    { label: "Août", value: 13400 },
    { label: "Sept.", value: 13900 },
    { label: "Oct.", value: 14500 },
  ];
  const W = 360;
  const HH = 108;
  const PAD = { top: 14, right: 14, bottom: 14, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 0;
  const maxV = 20000;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [5000, 10000, 15000, 20000];
  const last = scaled[scaled.length - 1];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Sur 12 derniers mois
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
          +2 150 CHF
        </span>
      </div>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="epa-evo-grad" x1="0" y1="0" x2="0" y2="1">
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
                  {v / 1000}K
                </text>
              </g>
            );
          })}
          <path d={areaD} fill="url(#epa-evo-grad)" />
          <path d={pathD} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="white" stroke={C.primary} strokeWidth={1.3} />
          ))}
          <circle cx={last.x} cy={last.y} r={3.5} fill={C.primary} />
          <text x={last.x} y={last.y - 6} fontSize="8.5" fontWeight="700" fill={C.primary} fontFamily="Outfit, Inter, system-ui" textAnchor="end">
            14 500 CHF
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

function SimulateurCard() {
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Simulateur d&apos;épargne
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Projection à 10 ans
      </p>
      <div style={{ marginTop: 8, padding: "8px 10px", backgroundColor: C.successBg, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 9.5, color: C.success, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Épargne estimée dans 10 ans
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
          172 592 CHF
        </p>
      </div>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Mensuel</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            1 200 CHF
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Rendement</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            2.5 % / an
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Total versé</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            144 000 CHF
          </p>
        </div>
        <div style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>Intérêts</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 11.5, fontWeight: 700, color: C.success, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            +28 592 CHF
          </p>
        </div>
      </div>
    </div>
  );
}

function ProduitsCard() {
  const products = [
    { label: "Compte épargne", sub: "Haute rémunération", rate: "1.25 %", rateNote: "Taux annuel", color: C.success, bg: C.successBg, featured: true, iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    { label: "3e pilier bancaire", sub: "Profil fiscal optimisé", rate: "Optimisé", rateNote: "Avantage fiscal", color: C.amber, bg: C.amberBg, featured: false, iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" },
    { label: "Compte à terme", sub: "12 mois", rate: "1.60 %", rateNote: "Taux fixe", color: C.violet, bg: C.violetBg, featured: false, iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M12 6v6l4 2" },
  ];
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Produits recommandés
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sélectionnés pour vous
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {products.map((p) => (
          <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: p.bg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {p.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                  {p.label}
                </p>
                {p.featured && (
                  <span style={{ padding: "1px 5px", fontSize: 8.5, fontWeight: 700, color: C.success, backgroundColor: C.successBg, borderRadius: 4, letterSpacing: "0.04em" }}>
                    Recommandé
                  </span>
                )}
              </div>
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {p.sub}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: p.color, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
                {p.rate}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted }}>
                {p.rateNote}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 4 — CONSEIL IA FOOTER ═══════════════ */

function ConseilIAFooter() {
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
            Vous êtes sur la bonne voie ! En épargnant 1 200 CHF par mois, vous atteindrez vos objectifs 1 an plus tôt.
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
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
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

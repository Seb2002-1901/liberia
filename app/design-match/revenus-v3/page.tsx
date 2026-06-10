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

export const metadata = {
  title: "Design Match v3 — Revenus",
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
  donutGrey: "#E2E8F0",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

export default function DesignMatchRevenusV3() {
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
        <div data-rev-content style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
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
              <RevenusHero />
              <PotentielCard />
            </div>
            <div data-rev-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <SourcesCard />
              <EvolutionCard />
              <ProjectionCard />
            </div>
            <div data-rev-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
              <CategoryTableCard />
              <OpportunitesCard />
              <ConseilCard />
            </div>
            <MissionFooter />
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
          <NavItem label="Tableau de bord" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" />
          <NavItem label="Coach IA" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <NavItem label="Plan d'action" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" active />
          <NavItem label="Dépenses" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" />
          <NavItem label="Objectifs" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
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
            Découvrir Premium
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
  iconPath,
  iconCircle,
  active = false,
}: {
  label: string;
  iconPath: string;
  iconCircle?: boolean;
  active?: boolean;
}) {
  const paths = iconPath.split("|");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "5px 8px",
        backgroundColor: active ? C.primaryBg : "transparent",
        borderRadius: 7,
        cursor: "pointer",
        marginBottom: 1,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          backgroundColor: active ? C.primary : "#F1F5F9",
          borderRadius: 5,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : C.textMuted} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          {iconCircle && <circle cx="12" cy="12" r="10" />}
          {paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: active ? 600 : 500,
          color: active ? C.textDark : C.textMuted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ═══════════════ TOPBAR ═══════════════ */

function Topbar() {
  return (
    <header
      data-rev-topbar
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
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 2, fontSize: 11.5, color: C.textMuted, margin: "2px 0 0 0" }}>
          Voici le détail de vos revenus et comment les augmenter.
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
            Sébastien Golay
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════ ROW 1 : HERO + POTENTIEL ═══════════════ */

function RevenusHero() {
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
              fontSize: 32,
              fontWeight: 700,
              color: "white",
              lineHeight: 1,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.025em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            25 000 CHF
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 8,
              padding: "3px 8px",
              borderRadius: 999,
              backgroundColor: "rgba(16, 163, 127, 0.18)",
              fontSize: 10.5,
              fontWeight: 700,
              color: "#5EEAD4",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 6 23 6 23 12" />
              <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
            </svg>
            +4.2%
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>ce trimestre</span>
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

function PotentielCard() {
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
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.success, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Potentiel IA
        </p>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
        +300 CHF/mois identifiés
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9.5, color: C.textMuted, letterSpacing: "0.04em" }}>Score</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 14, fontWeight: 700, color: C.success, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            +12 pts
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 9.5, color: C.textMuted, letterSpacing: "0.04em" }}>Gain/an</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
            3 600 CHF
          </p>
        </div>
      </div>
      <button
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
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir les solutions
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 2 : SOURCES + EVOLUTION + PROJECTION ═══════════════ */

function SourcesCard() {
  const slices = [
    { id: "salaire", label: "Salaire", pct: 72, color: C.primary },
    { id: "secondaire", label: "Activité 2nd.", pct: 12, color: C.success },
    { id: "passifs", label: "Passifs", pct: 8, color: C.amber },
    { id: "dividendes", label: "Dividendes", pct: 6, color: C.violet },
    { id: "autres", label: "Autres", pct: 2, color: C.donutGrey },
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
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Sources de revenus
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Répartition mensuelle
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 96, height: 96 }}>
          <svg viewBox="0 0 100 100" width={96} height={96}>
            {slicesWithPaths.map((s) => (
              <path key={s.id} d={s.path} fill={s.color} />
            ))}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              25K
            </p>
            <p style={{ margin: "2px 0 0 0", fontSize: 8.5, color: C.textMuted, letterSpacing: "0.14em" }}>
              CHF
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
    </div>
  );
}

function EvolutionCard() {
  const points = [
    { label: "Mai", value: 20000 },
    { label: "Juin", value: 20500 },
    { label: "Juil.", value: 21000 },
    { label: "Août", value: 22000 },
    { label: "Sept.", value: 23500 },
    { label: "Oct.", value: 25000 },
  ];
  const W = 280;
  const HH = 120;
  const PAD = { top: 12, right: 10, bottom: 18, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 15000;
  const maxV = 26000;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [15000, 20000, 25000];
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
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "3px 7px",
            backgroundColor: C.pageBg,
            border: `1px solid ${C.borderGhost}`,
            fontSize: 10.5,
            fontWeight: 500,
            color: C.textDark,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          6 mois
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="evo-grad" x1="0" y1="0" x2="0" y2="1">
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
          <path d={areaD} fill="url(#evo-grad)" />
          <path d={pathD} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="white" stroke={C.primary} strokeWidth={1.5} />
          ))}
          {scaled.map((p) => (
            <text key={`x-${p.label}`} x={p.x} y={HH - 4} fontSize="8" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function ProjectionCard() {
  const rows = [
    { label: "Dans 1 an", value: "28 600", delta: "+3 600" },
    { label: "Dans 3 ans", value: "34 800", delta: "+10 800" },
    { label: "Dans 5 ans", value: "43 000", delta: "+18 000" },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Projection
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Avec +300 CHF/mois
      </p>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.successBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 11, color: C.textMuted }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
              {r.value}
            </span>
            <span style={{ fontSize: 10.5, color: C.success, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {r.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 : TABLE + OPPORTUNITES + CONSEIL ═══════════════ */

function CategoryTableCard() {
  const rows = [
    { cat: "Salaire principal", amount: "18 000", evo: "+3.4%", positive: true, sparkline: [10, 12, 13, 14, 16, 18] },
    { cat: "Activité secondaire", amount: "3 000", evo: "+8.7%", positive: true, sparkline: [5, 6, 7, 9, 12, 15] },
    { cat: "Revenus passifs", amount: "2 000", evo: "+2.1%", positive: true, sparkline: [8, 9, 9, 10, 11, 11] },
    { cat: "Dividendes", amount: "1 500", evo: "+1.3%", positive: true, sparkline: [7, 8, 8, 9, 9, 10] },
    { cat: "Autres revenus", amount: "500", evo: "-2.0%", positive: false, sparkline: [12, 11, 10, 8, 7, 6] },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Détail par catégorie
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sources analysées
      </p>
      <table style={{ width: "100%", marginTop: 8, borderCollapse: "collapse", fontSize: 11.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.borderGhost}` }}>
            <th style={{ textAlign: "left", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>CATÉGORIE</th>
            <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>MONTANT</th>
            <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>3M</th>
            <th style={{ textAlign: "right", padding: "4px 0", fontWeight: 600, color: C.textLight, fontSize: 9.5, letterSpacing: "0.06em" }}>TENDANCE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.cat} style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${C.borderGhost}` }}>
              <td style={{ padding: "7px 0", color: C.textDark, fontWeight: 500 }}>{r.cat}</td>
              <td style={{ padding: "7px 0", color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{r.amount}</td>
              <td style={{ padding: "7px 0", color: r.positive ? C.success : "#DC2626", fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{r.evo}</td>
              <td style={{ padding: "7px 0", width: 60, textAlign: "right" }}>
                <MiniSparkline points={r.sparkline} color={r.positive ? C.success : "#DC2626"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const W = 50;
  const HH = 16;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - 2) + 1;
    const y = HH - 2 - ((v - min) / range) * (HH - 4);
    return { x, y };
  });
  const pathD = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return (
    <svg width={W} height={HH} viewBox={`0 0 ${W} ${HH}`} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OpportunitesCard() {
  const items = [
    {
      tag: "RAPIDE",
      tagColor: C.success,
      tagBg: C.successBg,
      title: "Revendre des objets",
      gain: "+500 CHF",
    },
    {
      tag: "MOYEN TERME",
      tagColor: C.primary,
      tagBg: C.primaryBg,
      title: "Mission freelance",
      gain: "+300 CHF/mois",
    },
    {
      tag: "LONG TERME",
      tagColor: C.violet,
      tagBg: C.violetBg,
      title: "Investir en ETF",
      gain: "+8% / an",
    },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Opportunités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sélection IA
      </p>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.title} style={{ padding: "7px 8px", borderRadius: 8, backgroundColor: C.pageBg, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "inline-flex", alignSelf: "flex-start", padding: "1px 6px", borderRadius: 999, backgroundColor: it.tagBg, color: it.tagColor, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em" }}>
              {it.tag}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.title}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.success, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {it.gain}
              </span>
            </div>
          </div>
        ))}
      </div>
      <button
        style={{
          marginTop: 6,
          padding: 0,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir toutes
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
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
      <button
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
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler au conseiller
      </button>
    </div>
  );
}

/* ═══════════════ MISSION FOOTER ═══════════════ */

function MissionFooter() {
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
            Trouver une opportunité pour gagner +300 CHF/mois
          </p>
        </div>
      </div>
      <button
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
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Commencer
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

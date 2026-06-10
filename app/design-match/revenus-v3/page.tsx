/**
 * Phase 5.0 — /design-match/revenus-v3
 *
 * Page Revenus V3 — reproduction fidèle de la maquette de référence.
 * Langage visuel strictement aligné sur dashboard-v3, coach-v3 et
 * plan-v3 (références verrouillées).
 *
 * Structure :
 *   Sidebar 248  ·  Main 1fr  ·  Right rail 320
 *
 * Main column :
 *   RevenusHero · SourcesCard · EvolutionCard · CategoryTableCard
 *
 * Right rail :
 *   PotentielCard · OpportunitesCard · ProjectionCard · ConseilCard
 *
 * Bottom strip (full width) : MissionFooter
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
  successPale: "#F0FAF6",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  gold: "#FBBF24",
  donutAmber: "#F59E0B",
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
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: C.pageBg,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <Sidebar />
      <div style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar />
        <main
          style={{
            padding: "0 24px 16px 24px",
            maxWidth: 1440,
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20 }}>
            <MainColumn />
            <RightRail />
          </div>
          <MissionFooter />
        </main>
      </div>
    </div>
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
      style={{
        height: 64,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 3, fontSize: 12, color: C.textMuted, margin: "3px 0 0 0" }}>
          Voici le détail de vos revenus et comment les augmenter.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 34,
            height: 34,
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
              width: 15,
              height: 15,
              borderRadius: 999,
              backgroundColor: C.notifBadge,
              color: "white",
              fontSize: 9.5,
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
            gap: 8,
            padding: "4px 10px 4px 4px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: C.textDark }}>
            Sébastien Golay
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════ MAIN COLUMN ═══════════════ */

function MainColumn() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 16 }}>
      <RevenusHero />
      <SourcesCard />
      <EvolutionCard />
      <CategoryTableCard />
    </div>
  );
}

function RevenusHero() {
  return (
    <div
      style={{
        position: "relative",
        padding: "22px 28px",
        backgroundColor: C.navy,
        borderRadius: 16,
        boxShadow: SHADOW.navy,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.20) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Revenus mensuels totaux
          </p>
          <p
            style={{
              margin: "10px 0 0 0",
              fontSize: 40,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.05,
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
              gap: 6,
              marginTop: 12,
              padding: "4px 9px",
              borderRadius: 999,
              backgroundColor: "rgba(16, 163, 127, 0.18)",
              fontSize: 11.5,
              fontWeight: 700,
              color: "#5EEAD4",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 6 23 6 23 12" />
              <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
            </svg>
            +4.2%
            <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>ce trimestre</span>
          </span>
        </div>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            backgroundColor: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 8px 20px -6px rgba(0, 0, 0, 0.25)",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ SOURCES CARD (DONUT) ═══════════════ */

function SourcesCard() {
  const slices = [
    { id: "salaire", label: "Salaire principal", amount: "18 000 CHF", pct: 72, color: C.primary },
    { id: "secondaire", label: "Activité secondaire", amount: "3 000 CHF", pct: 12, color: C.success },
    { id: "passifs", label: "Revenus passifs", amount: "2 000 CHF", pct: 8, color: C.amber },
    { id: "dividendes", label: "Dividendes", amount: "1 500 CHF", pct: 6, color: C.violet },
    { id: "autres", label: "Autres revenus", amount: "500 CHF", pct: 2, color: C.donutGrey },
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
    <div
      style={{
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sources de revenus
      </h2>
      <p style={{ margin: "3px 0 0 0", fontSize: 12.5, color: C.textMuted }}>
        Répartition de vos revenus mensuels
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 18 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 180, height: 180 }}>
          <svg viewBox="0 0 100 100" width={180} height={180}>
            {slicesWithPaths.map((s) => (
              <path key={s.id} d={s.path} fill={s.color} />
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: C.textDark,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              25 000
            </p>
            <p style={{ margin: "3px 0 0 0", fontSize: 11, color: C.textMuted, letterSpacing: "0.12em" }}>
              CHF
            </p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {slicesWithPaths.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 100px 44px",
                columnGap: 12,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: C.textDark, fontWeight: 500 }}>{s.label}</span>
              </span>
              <span style={{ color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.amount}
              </span>
              <span style={{ color: C.textMuted, fontWeight: 500, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <button
        style={{
          marginTop: 22,
          width: "100%",
          padding: "12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: "transparent",
          border: `1px solid ${C.borderGhost}`,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.textDark,
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        Voir le détail de chaque source
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ EVOLUTION CHART CARD ═══════════════ */

function EvolutionCard() {
  const points = [
    { label: "Mai", value: 20000 },
    { label: "Juin", value: 20500 },
    { label: "Juil.", value: 21000 },
    { label: "Août", value: 22000 },
    { label: "Sept.", value: 23500 },
    { label: "Oct.", value: 25000 },
  ];
  const W = 600;
  const HH = 200;
  const PAD = { top: 18, right: 14, bottom: 28, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 10000;
  const maxV = 30000;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [10000, 15000, 20000, 25000, 30000];

  return (
    <div
      style={{
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Évolution de vos revenus
          </h2>
          <p style={{ margin: "3px 0 0 0", fontSize: 12.5, color: C.textMuted }}>
            Sur les 6 derniers mois
          </p>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            backgroundColor: C.pageBg,
            border: `1px solid ${C.borderGhost}`,
            fontSize: 12,
            fontWeight: 500,
            color: C.textDark,
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          6 mois
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <div style={{ marginTop: 18, height: 200 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((v) => {
            const y = PAD.top + innerH - ((v - minV) / range) * innerH;
            return (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.6} />
                <text x={PAD.left - 8} y={y + 3} fontSize="10" fill={C.textLight} textAnchor="end">
                  {v / 1000}K CHF
                </text>
              </g>
            );
          })}
          <path d={areaD} fill="url(#revenue-grad)" />
          <path d={pathD} stroke={C.primary} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="white" stroke={C.primary} strokeWidth={2} />
          ))}
          {scaled.map((p) => (
            <text key={`x-${p.label}`} x={p.x} y={HH - 8} fontSize="10" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════ CATEGORY TABLE CARD ═══════════════ */

function CategoryTableCard() {
  const rows = [
    { cat: "Salaire principal", amount: "18 000 CHF", evo: "+3.4%", positive: true, sparkline: [10, 12, 13, 14, 16, 18] },
    { cat: "Activité secondaire", amount: "3 000 CHF", evo: "+8.7%", positive: true, sparkline: [5, 6, 7, 9, 12, 15] },
    { cat: "Revenus passifs", amount: "2 000 CHF", evo: "+2.1%", positive: true, sparkline: [8, 9, 9, 10, 11, 11] },
    { cat: "Dividendes", amount: "1 500 CHF", evo: "+1.3%", positive: true, sparkline: [7, 8, 8, 9, 9, 10] },
    { cat: "Autres revenus", amount: "500 CHF", evo: "-2.0%", positive: false, sparkline: [12, 11, 10, 8, 7, 6] },
  ];

  return (
    <div
      style={{
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Détail par catégorie
      </h2>
      <p style={{ margin: "3px 0 0 0", fontSize: 12.5, color: C.textMuted }}>
        Analyse de vos différentes sources de revenus
      </p>
      <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.borderGhost}` }}>
            <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500, color: C.textMuted, fontSize: 11.5 }}>
              Catégorie
            </th>
            <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500, color: C.textMuted, fontSize: 11.5 }}>
              Montant
            </th>
            <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500, color: C.textMuted, fontSize: 11.5 }}>
              Évolution (3 mois)
            </th>
            <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 500, color: C.textMuted, fontSize: 11.5 }}>
              Tendance
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.cat} style={{ borderBottom: i === rows.length - 1 ? "none" : `1px solid ${C.borderGhost}` }}>
              <td style={{ padding: "14px 0", color: C.textDark, fontWeight: 500 }}>{r.cat}</td>
              <td style={{ padding: "14px 0", color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.amount}</td>
              <td style={{ padding: "14px 0", color: r.positive ? C.success : "#DC2626", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.evo}</td>
              <td style={{ padding: "14px 0", width: 100 }}>
                <MiniSparkline points={r.sparkline} color={r.positive ? C.success : "#DC2626"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        style={{
          marginTop: 18,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir le détail complet
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const W = 80;
  const HH = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - 2) + 1;
    const y = HH - 2 - ((v - min) / range) * (HH - 4);
    return { x, y };
  });
  const pathD = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  return (
    <svg width={W} height={HH} viewBox={`0 0 ${W} ${HH}`} style={{ display: "block" }}>
      <path d={pathD} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════ RIGHT RAIL ═══════════════ */

function RightRail() {
  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <PotentielCard />
      <OpportunitesCard />
      <ProjectionCard />
      <ConseilCard />
    </aside>
  );
}

function PotentielCard() {
  return (
    <div
      style={{
        position: "relative",
        padding: "18px 20px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.success, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Potentiel identifié par votre IA
        </p>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      </div>
      <h3
        style={{
          margin: "10px 0 0 0",
          fontSize: 16,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.3,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
        }}
      >
        Vous pourriez augmenter vos revenus de 300 CHF/mois
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, padding: "12px 14px", backgroundColor: C.pageBg, borderRadius: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>Impact sur votre score</p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 17,
              fontWeight: 700,
              color: C.success,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            +12 pts
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>Gain annuel potentiel</p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 17,
              fontWeight: 700,
              color: C.textDark,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            3 600 CHF
          </p>
        </div>
      </div>
      <button
        style={{
          marginTop: 14,
          width: "100%",
          padding: "11px 14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir les solutions
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function OpportunitesCard() {
  const items = [
    {
      tag: "RAPIDE",
      tagColor: C.success,
      tagBg: C.successBg,
      iconColor: C.success,
      iconBg: C.successBg,
      iconPath: "M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z",
      title: "Revendre des objets inutilisés",
      sub: "Vendez ce que vous n'utilisez plus",
      gain: "+500 CHF",
      gainLabel: "Gain unique estimé",
    },
    {
      tag: "MOYEN TERME",
      tagColor: C.primary,
      tagBg: C.primaryBg,
      iconColor: C.primary,
      iconBg: C.primaryBg,
      iconPath: "M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 4h6v3H9V4z",
      title: "Mission freelance",
      sub: "Développement web / Design / Conseil",
      gain: "+300 CHF / mois",
      gainLabel: "Gain mensuel estimé",
    },
    {
      tag: "LONG TERME",
      tagColor: C.violet,
      tagBg: C.violetBg,
      iconColor: C.violet,
      iconBg: C.violetBg,
      iconPath: "M3 3v18h18|M7 17V9|M11 17v-5|M15 17V7|M19 17v-3",
      title: "Investir en ETF",
      sub: "Faire travailler votre argent",
      gain: "+8% / an",
      gainLabel: "Rendement estimé",
    },
  ];
  return (
    <div
      style={{
        padding: "18px 20px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Opportunités de revenus
      </h3>
      <p style={{ margin: "3px 0 0 0", fontSize: 11.5, color: C.textMuted }}>
        Sélectionnées pour vous par votre IA
      </p>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <button
            key={it.title}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 12px",
              borderRadius: 10,
              border: `1px solid ${C.borderGhost}`,
              backgroundColor: C.cardBg,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: it.iconBg,
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={it.iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: it.tagColor, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                {it.tag}
              </p>
              <p style={{ margin: "3px 0 0 0", fontSize: 12.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
                {it.title}
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>
                {it.sub}
              </p>
              <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.success, fontVariantNumeric: "tabular-nums" }}>
                  {it.gain}
                </span>
                <span style={{ fontSize: 10.5, color: C.textMuted }}>
                  {it.gainLabel}
                </span>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
      <button
        style={{
          marginTop: 14,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir toutes les opportunités
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function ProjectionCard() {
  const rows = [
    { label: "Dans 1 an", value: "28 600 CHF", delta: "+3 600 CHF" },
    { label: "Dans 3 ans", value: "34 800 CHF", delta: "+10 800 CHF" },
    { label: "Dans 5 ans", value: "43 000 CHF", delta: "+18 000 CHF" },
  ];
  return (
    <div
      style={{
        padding: "18px 20px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Projection avec +300 CHF/mois
      </h3>
      <p style={{ margin: "3px 0 0 0", fontSize: 11.5, color: C.textMuted }}>
        Impact sur vos revenus futurs
      </p>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.successBg,
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 12.5, color: C.textDark, fontWeight: 500 }}>
              {r.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
              {r.value}
            </span>
            <span style={{ fontSize: 11.5, color: C.success, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}>
              {r.delta}
            </span>
          </div>
        ))}
      </div>
      <button
        style={{
          marginTop: 16,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir la projection complète
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        padding: "18px 20px",
        backgroundColor: C.primaryBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.primary}>
          <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
        </svg>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Conseil de votre coach IA
        </h3>
      </div>
      <p style={{ margin: "12px 0 0 0", fontSize: 12, color: C.textDark, lineHeight: 1.55 }}>
        Le plus grand levier pour améliorer votre situation financière n&apos;est plus la réduction des dépenses.
      </p>
      <p style={{ margin: "10px 0 0 0", fontSize: 12, color: C.textDark, lineHeight: 1.55 }}>
        L&apos;augmentation de revenus offre un potentiel supérieur dans votre situation actuelle.
      </p>
      <p style={{ margin: "10px 0 0 0", fontSize: 12, color: C.textDark, lineHeight: 1.55 }}>
        Concentrez-vous sur les opportunités à impact rapide et moyen terme.
      </p>
      <button
        style={{
          marginTop: 14,
          width: "100%",
          padding: "10px 14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: "white",
          color: C.primary,
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler à mon conseiller
      </button>
    </div>
  );
}

/* ═══════════════ MISSION FOOTER (full width strip) ═══════════════ */

function MissionFooter() {
  return (
    <div
      style={{
        padding: "16px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: C.primary,
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
            Mission du moment
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 14.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
            Trouver une opportunité pour gagner +300 CHF/mois
          </p>
          <p style={{ margin: "3px 0 0 0", fontSize: 11.5, color: C.textMuted }}>
            Impact&nbsp;:{" "}
            <span style={{ color: C.textDark, fontWeight: 600 }}>+12 pts sur votre score</span>
            {"  •  "}
            Gain annuel&nbsp;: <span style={{ color: C.textDark, fontWeight: 600 }}>3 600 CHF</span>
          </p>
        </div>
      </div>
      <button
        style={{
          padding: "10px 18px",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Commencer maintenant
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

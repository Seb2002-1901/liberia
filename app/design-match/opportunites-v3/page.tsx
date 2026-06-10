/**
 * Phase 5.0 — /design-match/opportunites-v3
 *
 * Page Opportunités V3 — cockpit financier dense aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que les 8 autres pages V3 verrouillées
 * (dashboard, coach, plan, revenus, depenses, budget, objectifs,
 * epargne, investissements).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : HeroOpportunites · ScoreCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : TopOpportunitesCard · GainsFutursCard · PrioritesCard
 *   Row 3 (1.4fr / 1fr / 1fr)  : EvolutionCard · CategoriesCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

export const metadata = {
  title: "Design Match v3 — Opportunités",
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

export default function DesignMatchOpportunitesV3() {
  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-opp-row] { grid-template-columns: 1fr !important; }
          [data-opp-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-opp-sidebar] { display: none !important; }
          [data-opp-content] { margin-left: 0 !important; }
          [data-opp-main] { padding: 0 16px 16px 16px !important; }
          [data-opp-topbar] { padding: 0 16px !important; }
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
        <div data-opp-sidebar>
          <Sidebar />
        </div>
        <div data-opp-content style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main
            data-opp-main
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
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <HeroOpportunites />
              <ScoreCard />
            </div>
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <TopOpportunitesCard />
              <GainsFutursCard />
              <PrioritesCard />
            </div>
            <div data-opp-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <EvolutionCard />
              <CategoriesCard />
              <ConseilIACard />
            </div>
            <MissionFooter />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Opportunités actif) ═══════════════ */

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
          <NavItem label="Revenus" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" />
          <NavItem label="Dépenses" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" />
          <NavItem label="Objectifs" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" active />
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
      data-opp-topbar
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
          Découvrez les meilleures opportunités pour faire grandir votre patrimoine.
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

/* ═══════════════ ROW 1 ═══════════════ */

function HeroOpportunites() {
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
            Opportunités détectées
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
              18 opportunités
            </p>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#5EEAD4", fontVariantNumeric: "tabular-nums" }}>
              +3
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>cette semaine</span>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            Potentiel identifié&nbsp;: <span style={{ fontWeight: 600, color: "white", fontVariantNumeric: "tabular-nums" }}>2 480 CHF / mois</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
              <div style={{ width: "74%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              74%
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
            fontSize: 28,
          }}
          aria-hidden
        >
          🎯
        </div>
      </div>
    </div>
  );
}

function ScoreCard() {
  const stats = [
    { label: "Actives", value: "18", color: C.primary },
    { label: "Fort impact", value: "6", color: C.success },
    { label: "Gain potentiel", value: "29 760 CHF", color: C.success },
    { label: "Score IA", value: "94 / 100", color: C.primary },
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
        Score opportunités
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
        Voir toutes les opportunités
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function TopOpportunitesCard() {
  const items = [
    { label: "Optimisation abonnements", gain: "+180 CHF/mois", impact: "Rapide", color: C.amber, bg: C.amberBg, iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" },
    { label: "Réduction assurances", gain: "+240 CHF/mois", impact: "Immédiat", color: C.coral, bg: C.coralBg, iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { label: "Placement épargne", gain: "+310 CHF/mois", impact: "Stable", color: C.primary, bg: C.primaryBg, iconPath: "M3 3v18h18|M7 14l4-4 4 4 5-5" },
    { label: "Revenus passifs", gain: "+420 CHF/mois", impact: "Long terme", color: C.success, bg: C.successBg, iconPath: "M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Top opportunités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Sélectionnées par votre coach IA
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
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.success, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                {it.gain}
              </p>
            </div>
            <span
              style={{
                padding: "2px 7px",
                fontSize: 9.5,
                fontWeight: 700,
                color: it.color,
                backgroundColor: it.bg,
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              {it.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GainsFutursCard() {
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Gains futurs
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Projection IA
      </p>
      <div style={{ marginTop: 8, padding: "8px 10px", backgroundColor: C.successBg, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 9.5, color: C.success, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Gains cumulés dans 5 ans
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
          165 000 CHF
        </p>
      </div>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38 }}>1 an</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "21%", height: "100%", backgroundColor: C.primary, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            35 000
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38 }}>3 ans</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "56%", height: "100%", backgroundColor: C.primary, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            92 000
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, minWidth: 38 }}>5 ans</span>
          <div style={{ flex: 1, height: 4, backgroundColor: "white", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", backgroundColor: C.success, borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.success, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums" }}>
            165 000
          </span>
        </div>
      </div>
    </div>
  );
}

function PrioritesCard() {
  const items = [
    { tag: "IMMÉDIAT", label: "Réduire assurances", sub: "Économie 240 CHF/mois", color: C.coral, bg: C.coralBg, iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { tag: "RAPIDE", label: "Optimiser abonnements", sub: "Économie 180 CHF/mois", color: C.amber, bg: C.amberBg, iconPath: "M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" },
    { tag: "LONG TERME", label: "Investir 500 CHF/mois", sub: "+62 000 CHF en 5 ans", color: C.success, bg: C.successBg, iconPath: "M3 3v18h18|M7 14l4-4 4 4 5-5" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Priorités IA
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Actions à enclencher
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 6, backgroundColor: it.bg, flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: it.color,
                  backgroundColor: it.bg,
                  borderRadius: 4,
                  letterSpacing: "0.06em",
                }}
              >
                {it.tag}
              </span>
              <p style={{ margin: "2px 0 0 0", fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionCard() {
  const points = [
    { label: "Nov.", value: 900 },
    { label: "Déc.", value: 1050 },
    { label: "Janv.", value: 1180 },
    { label: "Févr.", value: 1310 },
    { label: "Mars", value: 1470 },
    { label: "Avr.", value: 1620 },
    { label: "Mai", value: 1780 },
    { label: "Juin", value: 1920 },
    { label: "Juil.", value: 2080 },
    { label: "Août", value: 2220 },
    { label: "Sept.", value: 2360 },
    { label: "Oct.", value: 2480 },
  ];
  const W = 360;
  const HH = 108;
  const PAD = { top: 14, right: 14, bottom: 14, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 800;
  const maxV = 2600;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [1000, 1500, 2000, 2500];
  const last = scaled[scaled.length - 1];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Potentiel détecté sur 12 mois
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
          +1 580 CHF
        </span>
      </div>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="opp-evo-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.success} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.success} stopOpacity="0" />
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
          <path d={areaD} fill="url(#opp-evo-grad)" />
          <path d={pathD} stroke={C.success} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="white" stroke={C.success} strokeWidth={1.3} />
          ))}
          <circle cx={last.x} cy={last.y} r={3.5} fill={C.success} />
          <text x={last.x} y={last.y - 6} fontSize="8.5" fontWeight="700" fill={C.success} fontFamily="Outfit, Inter, system-ui" textAnchor="end">
            2 480 CHF
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

function CategoriesCard() {
  const cats = [
    { label: "Dépenses", pct: 35, color: C.coral },
    { label: "Investissements", pct: 25, color: C.primary },
    { label: "Fiscalité", pct: 20, color: C.violet },
    { label: "Épargne", pct: 15, color: C.success },
    { label: "Revenus passifs", pct: 5, color: C.amber },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Catégories
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Répartition détectée
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {cats.map((c) => (
          <div key={c.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.label}
              </span>
              <span style={{ fontSize: 9.5, color: c.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {c.pct}%
              </span>
            </div>
            <div style={{ height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${c.pct}%`, height: "100%", backgroundColor: c.color, borderRadius: 999 }} />
            </div>
          </div>
        ))}
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
        2 480 CHF/mois de potentiel inexploité.
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
        En appliquant les recommandations prioritaires, vous pourriez générer près de <span style={{ color: C.primary, fontWeight: 700 }}>30 000 CHF</span> supplémentaires par an.
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
          🚀
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Potentiel annuel identifié <span style={{ fontVariantNumeric: "tabular-nums" }}>29 760 CHF / an</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: "74%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              74 % exploité
            </span>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
            Encore <span style={{ fontVariantNumeric: "tabular-nums" }}>6 opportunités majeures</span> à exploiter.
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
        Activer mes opportunités
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

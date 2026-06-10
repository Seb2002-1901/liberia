/**
 * Phase 5.0 — /design-match/plan-v3
 *
 * Plan d'Action V3 — page autonome, langage visuel strictement aligné
 * sur dashboard-v3 et coach-v3 (références officielles verrouillées).
 *
 * Structure (3 colonnes) :
 *   Sidebar 280  ·  Main 1fr  ·  Right rail 320
 *
 * Main column (top → bottom) :
 *   PlanHeaderCard   ·  MissionCard navy  ·  RoadmapCard
 *   BottomRow (Projection · Actions semaine · Levier identifié)
 *
 * Right rail :
 *   ProgressionGlobale · ImpactPlan · ConseillerRecommande · ActionsRapides
 *
 * Hauteurs cibles ≈ 868 px (cap 900 viewport). Page locked (overflow
 * hidden), right rail scrollable interne si besoin.
 */

export const metadata = {
  title: "Design Match v3 — Plan d'action",
  robots: { index: false, follow: false },
};

const C = {
  navy: "#011E5F",
  navyDeeper: "#011559",
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
  goldSoft: "#FCD34D",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

const H = {
  topbar: 60,
  planHeader: 56,
  mission: 148,
  roadmap: 232,
  bottomRow: 220,
  gap: 8,
  rightCardGap: 6,
};

export default function DesignMatchPlanV3() {
  return (
    <>
      {/* Responsive global :
          - Desktop ≥ 1200 : layout 3 colonnes complet (default inline styles)
          - Laptop 1000-1200 : padding réduit, gap réduit
          - Tablet 768-999 : sidebar cachée, right rail stack
          - Mobile < 768 : single column
          Tous ces overrides utilisent !important pour battre les
          styles inline. */}
      <style>{`
        @media (max-width: 1200px) {
          [data-plan-main] {
            padding: 0 20px 12px 20px !important;
            gap: 20px !important;
          }
          [data-plan-right] { width: 280px !important; }
          [data-plan-grid-cols] { grid-template-columns: minmax(0, 1fr) 280px !important; }
        }
        @media (max-width: 999px) {
          [data-plan-sidebar] { display: none !important; }
          [data-plan-content] { margin-left: 0 !important; }
          [data-plan-grid-cols] { grid-template-columns: 1fr !important; }
          [data-plan-right] { width: auto !important; }
          [data-plan-main] { padding: 0 16px 16px 16px !important; }
        }
        @media (max-width: 767px) {
          [data-plan-topbar] { padding: 0 16px !important; }
          [data-plan-bottom-row] { grid-template-columns: 1fr !important; }
          [data-plan-roadmap-grid] { grid-template-columns: 1fr 1fr !important; }
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
        <div data-plan-sidebar>
          <Sidebar />
        </div>
        <div data-plan-content style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main
            data-plan-main
            data-plan-grid-cols
            style={{
              padding: "0 24px 12px 24px",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 296px",
              gap: 20,
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <MainColumn />
            <div data-plan-right>
              <RightRail />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Plan d'action actif) ═══════════════ */

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
          <NavItem label="Plan d'action" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" active />
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
            backgroundColor: C.cardBg,
            borderRadius: 11,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.gold}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textDark, letterSpacing: "0.04em" }}>
              LIBERIA PREMIUM
            </span>
          </div>
          <p style={{ marginTop: 6, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <button
            style={{
              width: "100%",
              marginTop: 8,
              padding: "6px 10px",
              border: "none",
              backgroundColor: C.pageBg,
              fontSize: 11.5,
              fontWeight: 500,
              color: C.textDark,
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
      data-plan-topbar
      style={{
        height: H.topbar,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: C.textMuted, margin: "4px 0 0 0" }}>
          Voici votre plan d&apos;action personnalisé pour atteindre vos objectifs.
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px 4px 4px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
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
            Sébastien Golay
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: H.gap }}>
      <PlanHeaderCard />
      <MissionCard />
      <RoadmapCard />
      <BottomRow />
    </div>
  );
}

/* ═══════════════ PLAN HEADER CARD ═══════════════ */

function PlanHeaderCard() {
  return (
    <div
      style={{
        minHeight: H.planHeader,
        padding: "11px 20px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 22,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          Votre plan financier personnalisé
        </h2>
        <p style={{ margin: "3px 0 0 0", fontSize: 12, color: C.textMuted, lineHeight: 1.35 }}>
          Basé sur votre situation actuelle, vos objectifs et vos priorités.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <HeaderMetric
          label="Score actuel"
          value="46"
          unit="/ 100"
          iconNode={<ScoreMiniRing />}
        />
        <HeaderMetric
          label="Priorité actuelle"
          value="Fonds d'urgence"
          iconNode={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.coralBg,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
          }
        />
        <HeaderMetric
          label="Progression du plan"
          value="18 %"
          iconNode={
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.successBg,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
          }
          progress={18}
        />
      </div>
    </div>
  );
}

function ScoreMiniRing() {
  const r = 13;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - 0.46);
  return (
    <span style={{ display: "inline-flex", width: 30, height: 30, position: "relative" }}>
      <svg viewBox="0 0 30 30" width={30} height={30}>
        <circle cx="15" cy="15" r={r} fill="none" stroke={C.primaryBg} strokeWidth="3" />
        <circle
          cx="15"
          cy="15"
          r={r}
          fill="none"
          stroke={C.primary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${c.toFixed(2)} ${c.toFixed(2)}`}
          strokeDashoffset={offset.toFixed(2)}
          transform="rotate(-90 15 15)"
        />
      </svg>
    </span>
  );
}

function HeaderMetric({
  label,
  value,
  unit,
  iconNode,
  progress,
}: {
  label: string;
  value: string;
  unit?: string;
  iconNode: React.ReactNode;
  progress?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {iconNode}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.3, letterSpacing: "0.01em" }}>
          {label}
        </span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4, marginTop: 1 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.textDark,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.015em",
              lineHeight: 1.15,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 500 }}>{unit}</span>
          )}
        </span>
        {progress !== undefined && (
          <span
            style={{
              marginTop: 4,
              display: "block",
              width: 90,
              height: 3,
              borderRadius: 999,
              backgroundColor: C.successBg,
              overflow: "hidden",
            }}
            aria-hidden
          >
            <span style={{ display: "block", width: `${progress}%`, height: "100%", backgroundColor: C.success }} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ MISSION CARD ═══════════════ */

function MissionCard() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden", // garde le clip pour le glow + bouclier décoratif uniquement
        minHeight: H.mission,
        padding: "14px 18px",
        backgroundColor: C.navy,
        borderRadius: 18,
        boxShadow: SHADOW.navy,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Décision design : suppression du bouclier décoratif
          (était "ni visible ni invisible") au profit d'un glow
          ambient subtil unique — même langage que dashboard-v3
          ScoreCard et coach-v3 SituationCard. La décoration est
          désormais cohérente avec le système et ne concurrence
          plus aucun chiffre. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      {/* Bouclier décoratif top-right — visible dans la maquette
          de référence. Opacity 0.18 et taille 120 px alignés sur
          la maquette. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 18,
          top: 12,
          width: 84,
          height: 84,
          pointerEvents: "none",
          opacity: 0.18,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={C.gold}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.82)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Mission prioritaire
          </span>
        </div>
        <h3
          style={{
            margin: "6px 0 0 0",
            fontSize: 22,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.18,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.025em",
          }}
        >
          Construire votre fonds d&apos;urgence
        </h3>
        <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
          Vous avez actuellement 0.0 mois de sécurité.
        </p>
      </div>
      {/* Footer row : OBJECTIF + PROGRESSION à gauche, CTA à droite.
          marginTop:auto pousse la row en bas ; alignItems:center
          réintègre le CTA dans le flux (axe vertical aligné avec
          les valeurs progression). */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 26, flex: 1, minWidth: 0 }}>
          <div style={{ flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Objectif
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: 13.5, fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>
              3 mois de dépenses
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 360 }}>
            <p
              style={{
                margin: 0,
                fontSize: 9.5,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Progression
            </p>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "white", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                500 CHF <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>/ 15 000 CHF</span>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
                3 %
              </span>
            </div>
            <div
              style={{
                marginTop: 6,
                height: 5,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.16)",
                overflow: "hidden",
              }}
              role="progressbar"
              aria-valuenow={3}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: "3%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
          </div>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            backgroundColor: "white",
            color: C.navy,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 6px -2px rgba(0, 0, 0, 0.10)",
          }}
        >
          Continuer cette mission
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════ ROADMAP CARD ═══════════════ */

function RoadmapCard() {
  return (
    <div
      style={{
        minHeight: H.roadmap,
        padding: "10px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        Votre feuille de route
      </h2>

      {/* Rail icônes — compression supplémentaire (36 → 32 px,
          icons 32 → 28). Marges 12 → 10 sur les 2 axes du rail.
          Connecteur : ligne pleine au lieu du dashed dashboard-v3
          (plan = chemin progressif). 25 % du tracé en primary
          (Phase 1 done, 4 colonnes équilibrées). */}
      <div style={{ position: "relative", marginTop: 6, height: 28 }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "12.5%",
            right: "12.5%",
            top: 13,
            height: 2,
            background: `linear-gradient(to right, ${C.primary} 0%, ${C.primary} 25%, ${C.borderGhost} 25%, ${C.borderGhost} 100%)`,
            borderRadius: 999,
          }}
        />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: "100%" }}>
          <PhaseHead variant="done" icon="check" />
          <PhaseHead variant="future" icon="chart" />
          <PhaseHead variant="future" icon="rocket" />
          <PhaseHead variant="future" icon="home" />
        </div>
      </div>

      <div data-plan-roadmap-grid style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 8 }}>
        <PhaseColumn
          phase="Phase 1"
          title="Sécuriser"
          duration="3 mois"
          tasks={[
            { label: "Ajouter toutes les dépenses", state: "done" },
            { label: "Définir un objectif", state: "done" },
            { label: "Construire 1 mois d'urgence", state: "active", note: "En cours" },
            { label: "Construire 3 mois d'urgence", state: "todo", note: "À faire" },
          ]}
        />
        <PhaseColumn
          phase="Phase 2"
          title="Optimiser"
          duration="3-6 mois"
          tasks={[
            { label: "Réduire les dépenses inutiles", state: "todo" },
            { label: "Automatiser l'épargne", state: "todo" },
            { label: "Optimiser les abonnements", state: "todo" },
          ]}
        />
        <PhaseColumn
          phase="Phase 3"
          title="Accélérer"
          duration="6-24 mois"
          tasks={[
            { label: "Augmenter les revenus", state: "todo" },
            { label: "Construire une réserve long terme", state: "todo" },
            { label: "Développer vos compétences", state: "todo" },
          ]}
        />
        <PhaseColumn
          phase="Phase 4"
          title="Investir"
          duration="2 ans et +"
          tasks={[
            { label: "Commencer les investissements", state: "todo" },
            { label: "Diversifier", state: "todo" },
            { label: "Construire le patrimoine", state: "todo" },
          ]}
        />
      </div>
    </div>
  );
}

function PhaseHead({ variant, icon }: { variant: "done" | "active" | "future"; icon: "check" | "chart" | "rocket" | "home" }) {
  const fill =
    variant === "done" ? C.primary : variant === "active" ? "white" : "white";
  const stroke =
    variant === "done" ? "white" : C.primary;
  const ring =
    variant === "done"
      ? "none"
      : variant === "active"
        ? `2px solid ${C.primary}`
        : `1.5px solid ${C.borderGhost}`;
  const strokeFuture = variant === "future" ? C.textLight : C.primary;
  const SIZE = 24;
  const ICON = 12;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: SIZE,
          height: SIZE,
          borderRadius: 999,
          backgroundColor: fill,
          border: ring === "none" ? "none" : ring,
          boxShadow:
            variant === "done"
              ? "0 0 0 4px rgba(37, 99, 235, 0.12)"
              : variant === "active"
                ? "0 0 0 4px rgba(37, 99, 235, 0.10)"
                : "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {icon === "check" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {icon === "chart" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        )}
        {icon === "rocket" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        )}
        {icon === "home" && (
          <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" stroke={strokeFuture} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </span>
    </div>
  );
}

function PhaseColumn({
  phase,
  title,
  duration,
  tasks,
}: {
  phase: string;
  title: string;
  duration: string;
  tasks: { label: string; state: "done" | "active" | "todo"; note?: string }[];
}) {
  return (
    <div
      style={{
        padding: "6px 10px",
        backgroundColor: C.pageBg,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textLight, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {phase}
      </p>
      <p
        style={{
          margin: "1px 0 0 0",
          fontSize: 12.5,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {title}
      </p>
      <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.3 }}>
        Durée estimée&nbsp;: {duration}
      </p>
      <ul style={{ marginTop: 6, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
        {tasks.map((t) => (
          <li key={t.label} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <TaskBullet state={t.state} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 500,
                  color: C.textDark,
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {t.label}
              </p>
              {t.note && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 9,
                    color: t.state === "active" ? C.primary : C.textLight,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {t.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaskBullet({ state }: { state: "done" | "active" | "todo" }) {
  if (state === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: 999,
          backgroundColor: C.success,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: 999,
          backgroundColor: "white",
          border: `2px solid ${C.primary}`,
          flexShrink: 0,
          marginTop: 1,
        }}
      />
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        borderRadius: 999,
        border: `1.5px solid ${C.borderGhost}`,
        backgroundColor: "white",
        flexShrink: 0,
        marginTop: 1,
      }}
    />
  );
}

/* ═══════════════ BOTTOM ROW ═══════════════ */

function BottomRow() {
  return (
    <div data-plan-bottom-row style={{ minHeight: H.bottomRow, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <ProjectionCard />
      <ActionsSemaineCard />
      <LevierCard />
    </div>
  );
}

function ProjectionCard() {
  const points = [
    { label: "Aujourd'hui", value: 46 },
    { label: "Dans 3 mois", value: 58 },
    { label: "Dans 6 mois", value: 67 },
    { label: "Dans 12 mois", value: 78 },
  ];
  const W = 280;
  const HH = 110;
  const PAD = { top: 22, right: 28, bottom: 14, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 40;
  const maxV = 80;
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
  // Y-axis ticks alignés sur les valeurs réelles (40 / 60 / 80)
  // pour donner du contexte de progression — même langage que
  // dashboard-v3 EvolutionCard.
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Si vous suivez ce plan
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
        }}
      >
        Projection de votre score
      </p>
      <div style={{ marginTop: 6, height: 105 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id="proj-grad-v3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#proj-grad-v3)" />
          <path d={pathD} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3.4} fill="white" stroke={C.primary} strokeWidth={1.8} />
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={C.textDark}
                fontFamily="Outfit, Inter, system-ui"
              >
                {p.value}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textMuted, marginTop: 4, fontWeight: 500, whiteSpace: "nowrap" }}>
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
      <p style={{ margin: "10px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
        En suivant ce plan, votre score pourrait augmenter de{" "}
        <strong style={{ color: C.textDark, fontWeight: 600 }}>32 points</strong> en 12 mois.
      </p>
    </div>
  );
}

function ActionsSemaineCard() {
  // Format maquette : titre complet + sous-texte "Impact : +X pts
  // sur votre score" sous chaque action (pas de chip). Chevron à
  // droite.
  const actions = [
    { num: 1, title: "Ajouter votre assurance maladie", impact: "+2 pts sur votre score" },
    { num: 2, title: "Mettre 500 CHF de côté", impact: "+4 pts sur votre score" },
    { num: 3, title: "Créer un objectif immobilier", impact: "+3 pts sur votre score" },
  ];
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Cette semaine
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
        }}
      >
        Vos 3 prochaines actions
      </p>
      <div style={{ marginTop: 10, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {actions.map((a) => (
          <button
            key={a.num}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
              borderRadius: 10,
              border: "none",
              backgroundColor: C.pageBg,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: C.primary,
                color: "white",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Outfit, Inter, system-ui",
                flexShrink: 0,
              }}
            >
              {a.num}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3, wordBreak: "break-word" }}>
                {a.title}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}>
                Impact&nbsp;: <span style={{ color: C.success, fontWeight: 600 }}>{a.impact}</span>
              </p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
      <button
        style={{
          marginTop: 10,
          padding: 0,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12.5,
          fontWeight: 600,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir toutes les actions
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function LevierCard() {
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Le plus gros levier identifié
      </p>
      <p
        style={{
          margin: "6px 0 0 0",
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.015em",
          lineHeight: 1.25,
        }}
      >
        Augmenter vos revenus de 300&nbsp;CHF/mois
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: C.textMuted, lineHeight: 1.4 }}>
        Impact&nbsp;:{" "}
        <span style={{ color: C.success, fontWeight: 700 }}>+12 pts sur votre score</span>
      </p>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 10px",
          backgroundColor: C.successBg,
          borderRadius: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.success, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Gain annuel potentiel
          </p>
          <p
            style={{
              margin: "3px 0 0 0",
              fontSize: 17,
              fontWeight: 700,
              color: C.success,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            3 600 CHF
          </p>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      </div>
      <button
        style={{
          marginTop: "auto",
          padding: "10px 14px",
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

/* ═══════════════ RIGHT RAIL ═══════════════ */

function RightRail() {
  return (
    <aside
      style={{
        display: "flex",
        flexDirection: "column",
        gap: H.rightCardGap,
        minWidth: 0,
      }}
    >
      <ProgressionGlobaleCard />
      <ImpactPlanCard />
      <ConseillerRecommandeCard />
      <ActionsRapidesRailCard />
    </aside>
  );
}

function ProgressionGlobaleCard() {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - 0.18);
  return (
    <div
      style={{
        padding: "9px 11px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Progression globale
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 7 }}>
        <div style={{ flexShrink: 0, width: 52, height: 52, position: "relative" }}>
          <svg viewBox="0 0 52 52" width={52} height={52}>
            <circle cx="26" cy="26" r={r} fill="none" stroke={C.primaryBg} strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              stroke={C.primary}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${c.toFixed(2)} ${c.toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform="rotate(-90 26 26)"
            />
            <text x="26" y="30" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={C.textDark} fontFamily="Outfit, Inter, system-ui" letterSpacing="-0.02em">
              18 %
            </text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.textDark, lineHeight: 1.25 }}>
            Plan en cours
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>
            4 étapes sur 22 complétées
          </p>
        </div>
      </div>
      <button
        style={{
          marginTop: 8,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir le détail
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function ImpactPlanCard() {
  const rows = [
    {
      label: "Score amélioré",
      value: "+32 pts",
      bg: C.successBg,
      color: C.success,
      iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4 12 14.01 9 11.01",
    },
    {
      label: "Épargne constituée",
      value: "+14 500 CHF",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22",
    },
    {
      label: "Revenus supplémentaires",
      value: "+3 600 CHF/an",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    },
    {
      label: "Sécurité financière",
      value: "+2.5 mois",
      bg: C.amberBg,
      color: C.amber,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
  ];
  return (
    <div
      style={{
        padding: "8px 12px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Impact de votre plan
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textLight }}>Sur 12 mois</p>
      <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: r.bg,
                flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                {r.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.2 }}>
                {r.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: C.textDark,
                  fontFamily: "Outfit, Inter, system-ui",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConseillerRecommandeCard() {
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Votre conseiller recommande
      </p>
      <p
        style={{
          margin: "5px 0 0 0",
          fontSize: 11.5,
          color: C.textDark,
          lineHeight: 1.25,
          fontStyle: "italic",
        }}
      >
        «&nbsp;Commencez par compléter toutes vos dépenses, puis construisez votre premier mois de sécurité. Chaque petite action vous rapproche de vos objectifs.&nbsp;»
      </p>
      <button
        style={{
          marginTop: 6,
          width: "100%",
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: C.primaryBg,
          color: C.primary,
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler au coach IA
      </button>
    </div>
  );
}

function ActionsRapidesRailCard() {
  const items = [
    {
      title: "Simuler un scénario",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M22 7L13.5 15.5 8.5 10.5 2 17|M17 7 22 7 22 12",
    },
    {
      title: "Analyser ma situation",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    },
    {
      title: "Voir mes objectifs",
      bg: C.successBg,
      color: C.success,
      iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M22 4 12 14.01 9 11.01",
    },
    {
      title: "Parler à mon conseiller",
      bg: C.coralBg,
      color: C.coral,
      iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    },
  ];
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
        Actions rapides
      </p>
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column" }}>
        {items.map((it, idx) => (
          <button
            key={it.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "5px 0",
              background: "none",
              border: "none",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: 999,
                backgroundColor: it.bg,
                flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
              {it.title}
            </p>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

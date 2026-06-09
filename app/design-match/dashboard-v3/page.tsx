/**
 * Phase 5.0 — /design-match/dashboard-v3
 *
 * Reconstruction "surfaces flottantes" — perception visuelle prioritaire.
 *
 * PHILOSOPHIE :
 * - Pas de "cartes bordées" → des SURFACES qui flottent sur le fond
 * - La hiérarchie domine : Score > Hero secondaires > Roadmap > KPI > Bottom > Coach
 * - Roadmap = UN ruban intégré, pas 5 mini-cartes
 * - Ombres SOFT et DIFFUSES, pas tight et défined
 * - Bordures quasi-invisibles ou absentes
 *
 * Changements clés vs v2 :
 *   1. Pas de border sur les cards blanches (ou border: #F2F4F8 invisible)
 *   2. Roadmap milestones : 0 border, 0 shadow, 0 bg différent → flottent dans le parent
 *   3. Score "46" 92px (vs 80) + Ring 115px (vs 130) + thickness 7 (vs 9)
 *   4. Page bg #F9FAFD (vs #F5F7FA)
 *   5. Notif badge #7FA2E6 (vs #2563EB)
 *   6. Ombres : blur étendu, opacité réduite — quasi-imperceptibles mais profondes
 *   7. Score card : shadow navy plus forte pour "lévitation premium"
 *
 * Aucun composant @/components ni @/lib réutilisé. Fichier autonome.
 */

export const metadata = {
  title: "Design Match v3 — Dashboard",
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
  successText: "#10A37F",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  gold: "#FBBF24",
};

// Ombres "premium floating surfaces" — plus diffuses, plus discrètes
const SHADOW = {
  // White cards : presque invisible mais crée profondeur
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  // Score navy : plus forte pour lévitation premium
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  // KPI : ultra-light, presque rien
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  // Coach CTA : flat
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

const H = {
  topbar: 68,
  scoreCard: 172,
  roadmap: 135,
  kpi: 96,
  bottomRow: 192,
  coachCta: 41,
  gapHR: 12,
  gapRK: 10,
  gapKB: 10,
  gapBC: 12,
};

export default function DesignMatchDashboardV3() {
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
      <div style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ flex: 1, padding: "0 42px 16px 42px" }}>
          <div style={{ maxWidth: 1176, margin: "0 auto" }}>
            <Hero />
            <div style={{ height: H.gapHR }} />
            <Roadmap />
            <div style={{ height: H.gapRK }} />
            <KpiRow />
            <div style={{ height: H.gapKB }} />
            <BottomRow />
            <div style={{ height: H.gapBC }} />
            <CoachCta />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ SIDEBAR ═══════════════ */

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
        // Bordure ultra-subtile (quasi-invisible)
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
          <NavItem label="Tableau de bord" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" active />
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
          <NavItem label="Opportunités" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </NavSection>
      </nav>

      {/* Premium card — SURFACE flottante, pas bordée */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            padding: 16,
            backgroundColor: C.cardBg,
            borderRadius: 12,
            // Pas de border. Juste shadow ultra-subtle.
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
          <button
            style={{
              width: "100%",
              marginTop: 12,
              padding: "8px 12px",
              border: "none",
              backgroundColor: C.pageBg,
              fontSize: 12,
              fontWeight: 500,
              color: C.textDark,
              borderRadius: 8,
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
        gap: 10,
        padding: "7px 10px",
        backgroundColor: active ? C.primaryBg : "transparent",
        borderRadius: 8,
        cursor: "pointer",
        marginBottom: 1,
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
    </div>
  );
}

/* ═══════════════ TOPBAR ═══════════════ */

function Topbar() {
  return (
    <header
      style={{
        height: H.topbar,
        padding: "0 42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0 }}>
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: C.textMuted }}>
          Voici votre situation mise à jour aujourd&apos;hui.
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
          {/* Badge corrigé : couleur #7FA2E6 (mesurée) */}
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

/* ═══════════════ HERO — 3 surfaces flottantes ═══════════════ */

function Hero() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <ScoreCard />
      <PriorityCard />
      <MissionCard />
    </div>
  );
}

function ScoreCard() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: H.scoreCard,
        padding: 20,
        backgroundColor: C.navy,
        borderRadius: 18,
        // Shadow plus forte pour LÉVITATION premium → hiérarchie
        boxShadow: SHADOW.navy,
      }}
    >
      <div style={{ display: "flex", height: "100%", justifyContent: "space-between", alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Score de santé financière
          </p>
          {/* Score "46" MASSIF — 92 px pour dominer la page */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 78,
                fontWeight: 700,
                color: "white",
                lineHeight: 0.95,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
              }}
            >
              46
            </span>
            <span style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
              /100
            </span>
          </div>
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.success,
                letterSpacing: "0.06em",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textTransform: "uppercase",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 6 23 6 23 12" />
                <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
              </svg>
              EN PROGRESSION
            </p>
            <p style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
              +6 pts depuis la semaine dernière
            </p>
          </div>
        </div>
        {/* Ring RÉDUIT — 115 px (vs 130) pour rééquilibrer en faveur du "46" */}
        <div style={{ position: "relative", flexShrink: 0, width: 100, height: 100, alignSelf: "center" }}>
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.12)",
              filter: "blur(24px)",
            }}
          />
          <svg viewBox="0 0 100 100" width={100} height={100} style={{ position: "relative" }}>
            <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="43"
              fill="none"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="270 271"
              strokeDashoffset="68"
              transform="rotate(-90 50 50)"
              style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.35))" }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PriorityCard() {
  return (
    <div
      style={{
        height: H.scoreCard,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        // PAS DE BORDER — juste shadow soft
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Votre priorité actuelle
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 18 }}>
          <span
            style={{
              flexShrink: 0,
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: C.coralBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: C.textDark,
              lineHeight: 1.25,
              margin: 0,
              fontFamily: "Outfit, Inter, system-ui",
            }}
          >
            Construire votre fonds d&apos;urgence
          </h3>
        </div>
        <p style={{ marginTop: 14, fontSize: 13, color: C.textMuted }}>
          0.0 mois de sécurité disponible
        </p>
      </div>
      <button
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        Voir pourquoi
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function MissionCard() {
  return (
    <div
      style={{
        height: H.scoreCard,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        // PAS DE BORDER
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              backgroundColor: C.primaryBg,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={C.primary}>
              <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
            </svg>
          </span>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Mission du moment
          </p>
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.25,
            margin: "18px 0 0 0",
            fontFamily: "Outfit, Inter, system-ui",
          }}
        >
          Constituez votre premier fonds d&apos;urgence
        </h3>
        <p style={{ marginTop: 8, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
          Commencez par économiser 500 CHF ce mois-ci.
        </p>
      </div>
      {/* Bouton CORRIGÉ : padding 8/16 + radius 8 (mesure maquette : 28 px de haut) */}
      <button
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          backgroundColor: C.navy,
          color: "white",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        Agir maintenant
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROADMAP — RUBAN INTÉGRÉ ═══════════════ */

function Roadmap() {
  return (
    <div
      style={{
        height: H.roadmap,
        padding: "14px 18px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        // Pas de border, shadow soft
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "Outfit, Inter, system-ui" }}>
          Votre avenir, notre feuille de route
        </h2>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 500,
            color: C.primary,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          Voir toutes les projections
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", gap: 0 }}>
        <Milestone eyebrow="AUJOURD'HUI" title="Score actuel" subtitle="Posez les bases solides" isToday score={46} />
        <RoadmapConnector />
        <Milestone
          eyebrow="DANS 4 MOIS"
          title="Fonds d'urgence complet"
          subtitle="3 mois de dépenses couvertes"
          icon="shield"
          bg={C.successBg}
          fg={C.success}
        />
        <RoadmapConnector />
        <Milestone
          eyebrow="DANS 12 MOIS"
          title="15 000 CHF d'épargne"
          subtitle="Votre épargne prend de l'élan"
          icon="trend"
          bg={C.violetBg}
          fg={C.violet}
        />
        <RoadmapConnector />
        <Milestone
          eyebrow="DANS 3 ANS"
          title="Apport immobilier"
          subtitle="Atteignez votre objectif"
          icon="home"
          bg={C.successBg}
          fg={C.success}
        />
      </div>
    </div>
  );
}

function Milestone({
  eyebrow,
  title,
  subtitle,
  isToday,
  score,
  icon,
  bg,
  fg,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  isToday?: boolean;
  score?: number;
  icon?: "shield" | "trend" | "home";
  bg?: string;
  fg?: string;
}) {
  return (
    // RUBAN INTÉGRÉ : pas de border, pas de bg différent, pas d'ombre.
    // Compact pour tenir dans roadmap 140 px.
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "4px 10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          backgroundColor: isToday ? "transparent" : bg,
          color: isToday ? C.primary : fg,
          borderRadius: 999,
          border: isToday ? `2px solid ${C.primary}` : "none",
          flexShrink: 0,
        }}
      >
        {isToday ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: "Outfit, Inter, system-ui" }}>
            {score}
          </span>
        ) : (
          <MilestoneIcon name={icon!} color={fg!} />
        )}
      </span>
      <p
        style={{
          marginTop: 8,
          fontSize: 9,
          fontWeight: 600,
          color: C.textLight,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          marginTop: 3,
          fontSize: 12,
          fontWeight: 600,
          color: C.textDark,
          lineHeight: 1.25,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
        }}
        title={title}
      >
        {title}
      </p>
      <p
        style={{
          marginTop: 2,
          fontSize: 10.5,
          color: C.textMuted,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
        }}
        title={subtitle}
      >
        {subtitle}
      </p>
    </div>
  );
}

function MilestoneIcon({ name, color }: { name: "shield" | "trend" | "home"; color: string }) {
  if (name === "shield") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    );
  }
  if (name === "trend") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function RoadmapConnector() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 36,
        alignSelf: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 36 12" width={32} height={10}>
        <line
          x1="2"
          y1="6"
          x2="24"
          y2="6"
          stroke={C.primary}
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 3"
        />
        <path
          d="M 25 1.5 L 33 6 L 25 10.5"
          stroke={C.primary}
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/* ═══════════════ KPI ROW — surfaces très légères ═══════════════ */

function KpiRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <KpiCard
        label="REVENUS MENSUELS"
        value="25 000 CHF"
        delta={{ sign: "+", value: "3.2%", direction: "up", color: C.success }}
        hint="Après impôts"
        sparkline={{ points: [30, 35, 32, 40, 38, 45, 50, 55], color: "#10A37F" }}
      />
      <KpiCard
        label="DÉPENSES MENSUELLES"
        value="15 893 CHF"
        delta={{ sign: "-", value: "2.1%", direction: "down", color: C.success }}
        hint="63% de vos revenus"
        sparkline={{ points: [50, 55, 48, 52, 45, 40, 38, 35], color: "#DC2626" }}
      />
      <KpiCard
        label="RESTE À VIVRE"
        value="9 107 CHF"
        delta={{ sign: "+", value: "5.3%", direction: "up", color: C.success }}
        hint="36.6% de vos revenus"
        sparkline={{ points: [25, 28, 32, 30, 38, 42, 45, 52], color: "#10A37F" }}
      />
      <KpiCard
        label="FONDS D'URGENCE"
        value="0.0 mois"
        delta={{ sign: "", value: "—", direction: "none", color: C.amber }}
        hint="500 CHF disponibles"
        sparkline={{ points: [40, 30, 25, 35, 28, 38, 32, 36], color: "#F59E0B" }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  sparkline,
}: {
  label: string;
  value: string;
  delta: { sign: string; value: string; direction: "up" | "down" | "none"; color: string };
  hint: string;
  sparkline: { points: number[]; color: string };
}) {
  return (
    <div
      style={{
        height: H.kpi,
        padding: 14,
        backgroundColor: C.cardBg,
        borderRadius: 16,
        // PAS DE BORDER. Shadow ultra-light.
        boxShadow: SHADOW.kpi,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <p
          style={{
            fontSize: 21,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1,
            fontFamily: "Outfit, Inter, system-ui",
            margin: 0,
          }}
        >
          {value}
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            fontSize: 12,
            fontWeight: 600,
            color: delta.color,
          }}
        >
          {delta.direction === "up" && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          )}
          {delta.direction === "down" && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 7 17 17" />
              <polyline points="7 17 17 17 17 7" />
            </svg>
          )}
          {delta.direction === "none" ? delta.value : `${delta.sign}${delta.value}`}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 11.5, color: C.textMuted, margin: 0 }}>{hint}</p>
        <Sparkline points={sparkline.points} color={sparkline.color} />
      </div>
    </div>
  );
}

/* Mini sparkline SVG — 80×24 px, smooth line + subtle area */
function Sparkline({ points, color }: { points: number[]; color: string }) {
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
  const areaD = `${pathD} L ${coords[coords.length - 1].x.toFixed(2)} ${HH - 1} L ${coords[0].x.toFixed(2)} ${HH - 1} Z`;
  return (
    <svg width={W} height={HH} viewBox={`0 0 ${W} ${HH}`} style={{ flexShrink: 0 }}>
      <path d={areaD} fill={color} fillOpacity={0.12} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════ BOTTOM ROW ═══════════════ */

function BottomRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
      <OpportunityCard />
      <RepartitionCard />
      <EvolutionCard />
    </div>
  );
}

function OpportunityCard() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: H.bottomRow,
        padding: 18,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
      }}
    >
      {/* Flèche financière premium — segments droits, sharp angles
          (style Bloomberg/TradingView/Stripe). Aucune courbe. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 14,
          top: 58,
          width: 64,
          height: 64,
          opacity: 0.9,
          color: C.success,
        }}
      >
        <svg viewBox="0 0 80 80" fill="none" width="100%" height="100%">
          {/* Trend stepped line : montée → petite correction → remontée forte */}
          <polyline
            points="8 62 22 50 32 56 62 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
            fill="none"
          />
          {/* Pointe de flèche angulaire nette pointant NE */}
          <polyline
            points="50 22 62 18 58 30"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
            fill="none"
          />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: C.successBg,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </span>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Opportunité du moment
        </p>
      </div>
      <p style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: C.success, lineHeight: 1.4 }}>
        Le plus grand impact pour vous
      </p>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.25,
          maxWidth: "65%",
          margin: "8px 0 0 0",
          fontFamily: "Outfit, Inter, system-ui",
        }}
      >
        Augmentez vos revenus de 300 CHF/mois
      </h3>
      <p style={{ marginTop: 6, fontSize: 11.5, color: C.textMuted, lineHeight: 1.4, maxWidth: "65%" }}>
        aurait plus d&apos;impact que réduire vos dépenses de 100 CHF/mois.
      </p>
      <p style={{ marginTop: 10, fontSize: 11.5, color: C.textMuted }}>
        Impact potentiel :{" "}
        <span style={{ fontWeight: 700, color: C.success }}>+12 points sur votre score</span>
      </p>
      <button
        style={{
          marginTop: 10,
          padding: "7px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        Explorer comment
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function RepartitionCard() {
  // Donut palette MONOCHROME BLEUE (capture maquette) — du navy
  // profond aux gris-bleu pâles. Plus de couleurs accents.
  const slices = [
    { id: "logement", label: "Logement", pct: 35, amount: "5 500 CHF", color: "#011E5F" },
    { id: "alimentation", label: "Alimentation", pct: 20, amount: "3 200 CHF", color: "#2563EB" },
    { id: "transport", label: "Transport", pct: 15, amount: "2 400 CHF", color: "#60A5FA" },
    { id: "assurances", label: "Assurances", pct: 10, amount: "1 600 CHF", color: "#A5B4DC" },
    { id: "loisirs", label: "Loisirs & divers", pct: 20, amount: "3 193 CHF", color: "#C7CFE3" },
  ];
  const slicesWithPaths = (() => {
    let cursor = -90;
    const gap = 1;
    const usableDeg = 360 - gap * slices.length;
    const total = slices.reduce((s, x) => s + x.pct, 0);
    return slices.map((s) => {
      const share = s.pct / total;
      const sweep = usableDeg * share;
      const startDeg = cursor;
      const endDeg = cursor + sweep;
      const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
      cursor = endDeg + gap;
      return { ...s, path };
    });
  })();

  return (
    <div
      style={{
        height: H.bottomRow,
        padding: 18,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition des dépenses
      </p>
      <p style={{ marginTop: 2, fontSize: 11.5, color: C.textLight }}>Ce mois-ci</p>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 100, height: 100 }}>
          <svg viewBox="0 0 100 100" width={100} height={100}>
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
                fontSize: 13,
                fontWeight: 700,
                color: C.textDark,
                margin: 0,
                fontFamily: "Outfit, Inter, system-ui",
              }}
            >
              15 893
            </p>
            <p
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                color: C.textMuted,
                letterSpacing: "0.18em",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              CHF
            </p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {slicesWithPaths.map((s) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto",
                gap: 6,
                padding: "1px 0",
                fontSize: 11,
                alignItems: "baseline",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </span>
              <span style={{ color: C.textDark, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {s.pct}%
              </span>
              <span style={{ color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {s.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 13,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        Voir le détail
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function EvolutionCard() {
  const points = [22, 30, 38, 32, 42, 50, 54, 46];
  const W = 320;
  const HH = 105;
  const PAD = { top: 8, right: 36, bottom: 18, left: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const scaled = points.map((v, i) => ({
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - (v / 100) * innerH,
    v,
  }));
  const pathD = scaled
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const last = scaled[scaled.length - 1];

  return (
    <div
      style={{
        height: H.bottomRow,
        padding: 18,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Évolution du score
      </p>
      <p style={{ marginTop: 2, fontSize: 11.5, color: C.textLight }}>Votre progression</p>
      <div style={{ marginTop: 6 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH}>
          <defs>
            <linearGradient id="evo-gradient-v3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.5} />;
          })}
          {[25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <text key={`y-${v}`} x={W - PAD.right + 6} y={y + 3} fontSize="9" fill={C.textMuted}>
                {v}
              </text>
            );
          })}
          <path d={areaD} fill="url(#evo-gradient-v3)" />
          <path d={pathD} stroke={C.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {scaled.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={C.cardBg} stroke={C.primary} strokeWidth={1.5} />
          ))}
          <circle cx={last.x} cy={last.y} r={4} fill={C.primary} />
          <rect x={last.x + 8} y={last.y - 14} width={40} height={24} rx={5} fill={C.navy} />
          <text x={last.x + 28} y={last.y - 3} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
            46
          </text>
          <text x={last.x + 28} y={last.y + 7} textAnchor="middle" fontSize="6" fill="white" fillOpacity="0.85">
            Score actuel
          </text>
        </svg>
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: C.textMuted,
            display: "flex",
            justifyContent: "space-between",
            paddingLeft: PAD.left,
            paddingRight: PAD.right,
          }}
        >
          <span>1 avr.</span>
          <span>15 avr.</span>
          <span>1 mai</span>
          <span>15 mai</span>
          <span>1 juin</span>
        </div>
      </div>
      <button
        style={{
          marginTop: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        Voir l&apos;historique
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ COACH CTA ═══════════════ */

function CoachCta() {
  return (
    <div
      style={{
        height: H.coachCta,
        padding: "0 18px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark, margin: 0 }}>
            Parler à mon conseiller
          </p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            Posez une question, obtenez des conseils personnalisés.
          </p>
        </div>
      </div>
      <button
        style={{
          padding: "9px 16px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        Démarrer une conversation
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ HELPERS DONUT ═══════════════ */

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

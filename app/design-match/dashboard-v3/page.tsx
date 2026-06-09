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
  scoreCard: 178,
  roadmap: 140,
  kpi: 102,
  bottomRow: 200,
  coachCta: 56,
  gapHR: 14,
  gapRK: 12,
  gapKB: 12,
  gapBC: 14,
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
  // Ring progress math : circumference = 2π * r = 2π * 43 ≈ 270.18 px.
  // Score 46/100 → fraction visible = 0.46. dashoffset = C * (1 - 0.46).
  const ringR = 43;
  const ringCirc = 2 * Math.PI * ringR;
  const scoreFraction = 0.46;
  const ringOffset = ringCirc * (1 - scoreFraction);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        height: H.scoreCard,
        padding: "22px 24px",
        backgroundColor: C.navy,
        borderRadius: 18,
        // Shadow plus forte pour LÉVITATION premium → hiérarchie
        boxShadow: SHADOW.navy,
      }}
    >
      {/* Glow décoratif derrière la ring — profondeur premium */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", height: "100%", justifyContent: "space-between", alignItems: "stretch", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.72)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Score de santé financière
          </p>
          {/* Score "46" — 76 px, tracking serré pour densité premium */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontSize: 76,
                fontWeight: 700,
                color: "white",
                lineHeight: 0.92,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.035em",
              }}
            >
              46
            </span>
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              /100
            </span>
          </div>
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                backgroundColor: "rgba(16, 163, 127, 0.18)",
                fontSize: 10.5,
                fontWeight: 700,
                color: "#5EEAD4",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 6 23 6 23 12" />
                <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
              </svg>
              EN PROGRESSION
            </span>
            <p style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>
              +6 pts depuis la semaine dernière
            </p>
          </div>
        </div>
        {/* Ring 108 px — équilibre visuel avec le score 76 px */}
        <div style={{ position: "relative", flexShrink: 0, width: 108, height: 108, alignSelf: "center" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.10)",
              filter: "blur(28px)",
            }}
          />
          <svg viewBox="0 0 100 100" width={108} height={108} style={{ position: "relative" }}>
            <circle cx="50" cy="50" r={ringR} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r={ringR}
              fill="none"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${ringCirc.toFixed(2)} ${ringCirc.toFixed(2)}`}
              strokeDashoffset={ringOffset.toFixed(2)}
              transform="rotate(-90 50 50)"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
            />
            {/* Centre de la ring : tier label (poids visuel ≤ score externe) */}
            <text
              x="50"
              y="46"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="600"
              fill="rgba(255,255,255,0.55)"
              letterSpacing="1.5"
            >
              NIVEAU
            </text>
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fontSize="13.5"
              fontWeight="700"
              fill="white"
              fontFamily="Outfit, Inter, system-ui"
              letterSpacing="-0.01em"
            >
              Fragile
            </text>
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
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: C.coralBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
            Votre priorité actuelle
          </p>
        </div>
        <h3
          style={{
            fontSize: 16.5,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.25,
            margin: "14px 0 0 0",
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.01em",
          }}
        >
          Construire votre fonds d&apos;urgence
        </h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.coral,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            0.0
          </span>
          <span style={{ fontSize: 12, color: C.textMuted }}>mois sur 3 mois</span>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 999,
            backgroundColor: C.coralBg,
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={3}
        >
          <div style={{ width: "2%", height: "100%", backgroundColor: C.coral, borderRadius: 999 }} />
        </div>
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
        Voir pourquoi c&apos;est critique
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
        padding: "22px 24px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              backgroundColor: C.primaryBg,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.primary}>
              <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
            </svg>
          </span>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
            Mission du moment
          </p>
        </div>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.25,
            margin: "16px 0 0 0",
            fontFamily: "Outfit, Inter, system-ui",
          }}
        >
          Économisez 500 CHF ce mois-ci
        </h3>
        <p style={{ marginTop: 6, fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, margin: "6px 0 0 0" }}>
          Premier palier vers votre fonds d&apos;urgence.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 9,
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
        <span style={{ fontSize: 11.5, color: C.textLight, whiteSpace: "nowrap" }}>
          ~17 CHF / jour
        </span>
      </div>
    </div>
  );
}

/* ═══════════════ ROADMAP — RUBAN INTÉGRÉ ═══════════════ */

function Roadmap() {
  return (
    <div
      style={{
        height: H.roadmap,
        padding: "16px 22px 14px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Votre feuille de route
          </h2>
          <p style={{ marginTop: 2, fontSize: 11.5, color: C.textMuted, margin: "2px 0 0 0" }}>
            Projection sur 3 ans, mise à jour chaque mois
          </p>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12.5,
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
      {/* Grille stricte : 4 colonnes 25% chacune, milestones centrés
          horizontalement dans leur colonne. Connecteurs en overlay
          positionné aux frontières 25/50/75 %. */}
      <div style={{ flex: 1, position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Milestone eyebrow="AUJOURD'HUI" title="Score actuel" subtitle="Posez les bases solides" isToday score={46} />
        <Milestone
          eyebrow="DANS 4 MOIS"
          title="1er coussin d'urgence"
          subtitle="2 000 CHF d'avance disponibles"
          icon="shield"
          bg={C.successBg}
          fg={C.success}
        />
        <Milestone
          eyebrow="DANS 12 MOIS"
          title="6 000 CHF d'épargne"
          subtitle="Fonds d'urgence en bonne voie"
          icon="trend"
          bg={C.violetBg}
          fg={C.violet}
        />
        <Milestone
          eyebrow="DANS 3 ANS"
          title="Apport immobilier"
          subtitle="60 000 CHF capitalisés"
          icon="home"
          bg={C.successBg}
          fg={C.success}
        />
        {/* Connecteurs en overlay aux frontières 25/50/75 % :
            chaque connecteur est centré entre deux badges
            (les badges sont au centre optique de leur colonne).
            top: 10 → connector centré sur l'axe vertical des
            badges (badge 32 px → centre à y=16, connecteur 12 px
            de haut → top = 16 - 6 = 10). */}
        {[25, 50, 75].map((pct) => (
          <div
            key={pct}
            aria-hidden
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: 10,
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          >
            <RoadmapConnector />
          </div>
        ))}
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
    // Milestone CENTRÉ optiquement dans sa colonne 25 % : alignItems
    // center pour aligner badge + textes sur l'axe vertical de la
    // colonne. Connecteurs (overlay aux 25 / 50 / 75 %) tombent ainsi
    // exactement à mi-chemin entre deux badges → équilibre parfait.
    <div
      style={{
        minWidth: 0,
        padding: "0 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          backgroundColor: isToday ? "white" : bg,
          color: isToday ? C.primary : fg,
          borderRadius: 999,
          border: isToday ? `2px solid ${C.primary}` : "none",
          boxShadow: isToday
            ? `0 0 0 4px ${C.primaryBg}`
            : "none",
          flexShrink: 0,
        }}
      >
        {isToday ? (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.primary, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em" }}>
            {score}
          </span>
        ) : (
          <MilestoneIcon name={icon!} color={fg!} />
        )}
      </span>
      <p
        style={{
          marginTop: 10,
          fontSize: 9,
          fontWeight: 700,
          color: C.textLight,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
          margin: 0,
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          marginTop: 4,
          fontSize: 12.5,
          fontWeight: 600,
          color: C.textDark,
          lineHeight: 1.25,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          margin: 0,
        }}
        title={title}
      >
        {title}
      </p>
      <p
        style={{
          marginTop: 2,
          fontSize: 11,
          color: C.textMuted,
          lineHeight: 1.35,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
          maxWidth: "100%",
          margin: 0,
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
        width: 80,
        height: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 80 12" width={80} height={12}>
        <line
          x1="2"
          y1="6"
          x2="66"
          y2="6"
          stroke={C.primary}
          strokeOpacity="0.45"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
        <path
          d="M 67 1.5 L 77 6 L 67 10.5"
          stroke={C.primary}
          strokeOpacity="0.55"
          strokeWidth="1.8"
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
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.kpi,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      {/* Ligne 1 : label + delta pill (alignés sur même baseline) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {label}
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            padding: "2px 6px",
            borderRadius: 999,
            backgroundColor:
              delta.direction === "none"
                ? "#FEF3C7"
                : delta.color === C.success
                  ? C.successBg
                  : "#FEE2E2",
            fontSize: 10.5,
            fontWeight: 700,
            color: delta.color,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          {delta.direction === "up" && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          )}
          {delta.direction === "down" && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 7 17 17" />
              <polyline points="7 17 17 17 17 7" />
            </svg>
          )}
          {delta.direction === "none" ? delta.value : `${delta.sign}${delta.value}`}
        </span>
      </div>
      {/* Ligne 2 : valeur (massive) + sparkline collée à droite,
          baselines alignées sur l'axe visuel central de la carte. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1,
            fontFamily: "Outfit, Inter, system-ui",
            margin: 0,
            letterSpacing: "-0.025em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {value}
        </p>
        <div style={{ width: 60, height: 24, flexShrink: 0 }}>
          <Sparkline points={sparkline.points} color={sparkline.color} />
        </div>
      </div>
      {/* Ligne 3 : hint, une ligne, ne se brise jamais */}
      <p
        style={{
          fontSize: 11,
          color: C.textMuted,
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {hint}
      </p>
    </div>
  );
}

/* Mini sparkline SVG. Scaled à 100 % du conteneur, stroke
   vector-effect non-scaling pour garder une épaisseur uniforme
   quelle que soit la largeur réelle. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const W = 60;
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
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${HH}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={areaD} fill={color} fillOpacity={0.14} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
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
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Décor subtil — pattern radial vert dans le coin sup. droit
          (style Stripe). Donne du caractère sans concurrencer le texte. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, rgba(16, 163, 127, 0.10) 0%, rgba(16, 163, 127, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
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
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Opportunité du moment
        </p>
      </div>
      <h3
        style={{
          marginTop: 14,
          fontSize: 16,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.3,
          margin: "14px 0 0 0",
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        Augmentez vos revenus de 300 CHF/mois
      </h3>
      <p style={{ marginTop: 6, fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: "6px 0 0 0" }}>
        Plus d&apos;impact que réduire vos dépenses de 100 CHF/mois.
      </p>
      {/* Bloc impact — callout structuré, plus de flèche décorative */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 10,
          backgroundColor: C.successBg,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.success, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Impact score
          </span>
          <span
            style={{
              marginTop: 2,
              fontSize: 18,
              fontWeight: 700,
              color: C.success,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
            }}
          >
            +12 pts
          </span>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Explorer
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
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
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Répartition des dépenses
        </p>
        <span style={{ fontSize: 10.5, color: C.textLight, fontWeight: 500 }}>Ce mois</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 14, gap: 16, flex: 1 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" width={104} height={104}>
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
                fontSize: 14,
                fontWeight: 700,
                color: C.textDark,
                margin: 0,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
              }}
            >
              15 893
            </p>
            <p
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                color: C.textLight,
                letterSpacing: "0.2em",
                margin: 0,
                textTransform: "uppercase",
                marginTop: 1,
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
                gridTemplateColumns: "minmax(0, 1fr) 28px 64px",
                columnGap: 8,
                height: 22,
                fontSize: 11,
                alignItems: "center",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
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
                <span style={{ color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {s.label}
                </span>
              </span>
              <span style={{ color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.pct}%
              </span>
              <span style={{ color: C.textMuted, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {s.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button
        style={{
          marginTop: 4,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
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
  const HH = 110;
  // PAD.right large (60) pour héberger le badge "46" sans qu'il
  // touche le bord. PAD.bottom 22 pour X-axis intégrés au SVG.
  const PAD = { top: 8, right: 60, bottom: 22, left: 4 };
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
  const xLabels = ["1 avr", "15 avr", "1 mai", "15 mai", "1 juin"];

  return (
    <div
      style={{
        height: H.bottomRow,
        padding: 20,
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
          Évolution du score
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
            borderRadius: 999,
            backgroundColor: C.successBg,
            fontSize: 10.5,
            fontWeight: 700,
            color: C.success,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 17 17 7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
          +24 pts (60j)
        </span>
      </div>
      <div style={{ marginTop: 10, flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
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
              <text key={`y-${v}`} x={W - PAD.right + 6} y={y + 3} fontSize="8.5" fill={C.textLight}>
                {v}
              </text>
            );
          })}
          <path d={areaD} fill="url(#evo-gradient-v3)" />
          <path d={pathD} stroke={C.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={C.cardBg} stroke={C.primary} strokeWidth={1.5} />
          ))}
          {/* Last point : cercle plus marqué (highlight current) */}
          <circle cx={last.x} cy={last.y} r={5} fill="white" stroke={C.primary} strokeWidth={2} />
          <circle cx={last.x} cy={last.y} r={2.5} fill={C.primary} />
          {/* Badge "46 Score actuel" : positionné AU-DESSUS du point
              (vs à côté) pour ne pas toucher le bord droit ni la courbe.
              Pointe légère vers le point en dessous. */}
          <g transform={`translate(${last.x - 22}, ${last.y - 38})`}>
            <rect x="0" y="0" width="44" height="28" rx="6" fill={C.navy} />
            <text x="22" y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="Outfit, Inter, system-ui">
              46
            </text>
            <text x="22" y="22" textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.7)" letterSpacing="0.5">
              SCORE ACTUEL
            </text>
            <path d="M 18 28 L 22 32 L 26 28 Z" fill={C.navy} />
          </g>
          {xLabels.map((label, i) => {
            const x = PAD.left + (i / (xLabels.length - 1)) * innerW;
            const anchor = i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle";
            return (
              <text
                key={label}
                x={x}
                y={HH - 6}
                fontSize="8.5"
                fill={C.textLight}
                textAnchor={anchor}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
      <button
        style={{
          marginTop: 6,
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
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
        padding: "0 20px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: C.textDark, margin: 0, lineHeight: 1.3 }}>
            Parler à votre conseiller
          </p>
          <p
            style={{
              fontSize: 12,
              color: C.textMuted,
              margin: 0,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Posez une question, obtenez des conseils personnalisés.
          </p>
        </div>
      </div>
      <button
        style={{
          padding: "9px 18px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 9,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
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

/**
 * Phase 5.0 S3.1 — page isolée /design-match/dashboard
 *
 * Reproduction visuelle pure de docs/design-system/mockups/dashboard.png.
 * Toutes les valeurs hardcodées. Aucune logique métier importée.
 * Aucun composant existant réutilisé. Couleurs et dimensions
 * extraites par analyse pixel Python/PIL.
 *
 * Quand cette page atteint la fidélité maquette validée par le
 * fondateur, on remplace progressivement les valeurs hardcodées
 * par les vraies données (un par un, sans toucher au visuel).
 *
 * Cette page sort du système d'auth (/(app)) et de l'AppShell —
 * elle est intentionnellement self-contained.
 */

export const metadata = {
  title: "Design Match — Dashboard",
  robots: { index: false, follow: false },
};

const COLORS = {
  navy: "#011E5F",
  navyLight: "#0A2A6F",
  pageBg: "#F5F7FA",
  cardBg: "#FFFFFF",
  border: "#E5E9F0",
  textPrimary: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primaryBlue: "#2563EB",
  brightBlue: "#2563EB",
  success: "#10A37F",
  successBg: "#ECFDF5",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  emerald: "#22C55E",
  emeraldLight: "#D1FAE5",
  amber: "#F59E0B",
  gold: "#FBBF24",
  destructive: "#DC2626",
  sidebarActiveBg: "#EDF2FD",
} as const;

export default function DesignMatchDashboardPage() {
  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: COLORS.pageBg, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col" style={{ marginLeft: 280 }}>
        <Topbar />
        <main className="flex-1" style={{ padding: "20px 40px 32px 40px" }}>
          <div className="mx-auto" style={{ maxWidth: 1176 }}>
            <DashboardContent />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ========================================================================= */
/*  SIDEBAR — 280 px, fond blanc, logo + 4 sections + premium card           */
/* ========================================================================= */

function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 flex flex-col"
      style={{
        width: 280,
        backgroundColor: COLORS.cardBg,
        borderRight: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5" style={{ padding: "24px 24px 20px 24px" }}>
        <span
          className="inline-flex items-center justify-center rounded-lg"
          style={{ width: 32, height: 32, backgroundColor: COLORS.navy }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span
          className="font-semibold uppercase"
          style={{ color: COLORS.navy, letterSpacing: "0.18em", fontSize: 16 }}
        >
          LIBERIA
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "0 12px" }}>
        <NavSection title="PRINCIPAL">
          <NavItem label="Tableau de bord" icon={IconHome} active />
          <NavItem label="Coach IA" icon={IconMessage} />
          <NavItem label="Plan d'action" icon={IconCheckSquare} />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" icon={IconArrowUpCircle} />
          <NavItem label="Dépenses" icon={IconWallet} />
          <NavItem label="Budget" icon={IconPieChart} />
          <NavItem label="Objectifs" icon={IconFlag} />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" icon={IconPiggyBank} />
          <NavItem label="Investissements" icon={IconTrendUp} />
          <NavItem label="Opportunités" icon={IconCompass} />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" icon={IconSettings} />
          <NavItem label="Profil" icon={IconUser} />
        </NavSection>
      </nav>

      {/* Premium card */}
      <div style={{ padding: 12 }}>
        <div
          className="rounded-xl"
          style={{
            padding: 16,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.cardBg,
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: COLORS.gold, fontSize: 16 }}>👑</span>
            <span
              className="font-semibold"
              style={{ fontSize: 13, color: COLORS.textPrimary, letterSpacing: "0.04em" }}
            >
              LIBERIA PREMIUM
            </span>
          </div>
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: COLORS.textMuted,
              lineHeight: 1.5,
            }}
          >
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <button
            className="w-full rounded-lg"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              border: `1px solid ${COLORS.border}`,
              backgroundColor: COLORS.cardBg,
              fontSize: 13,
              fontWeight: 500,
              color: COLORS.textPrimary,
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
    <div style={{ marginBottom: 16 }}>
      <p
        className="uppercase"
        style={{
          padding: "8px 12px 4px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.textLight,
          letterSpacing: "0.16em",
        }}
      >
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function NavItem({
  label,
  icon: Icon,
  active = false,
}: {
  label: string;
  icon: React.FC<{ color: string }>;
  active?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg"
      style={{
        padding: "8px 12px",
        backgroundColor: active ? COLORS.sidebarActiveBg : "transparent",
        cursor: "pointer",
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-md"
        style={{
          width: 28,
          height: 28,
          backgroundColor: active ? COLORS.primaryBlue : "#F1F5F9",
        }}
      >
        <Icon color={active ? "#FFFFFF" : COLORS.textMuted} />
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: active ? COLORS.textPrimary : COLORS.textMuted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ========================================================================= */
/*  TOPBAR                                                                    */
/* ========================================================================= */

function Topbar() {
  return (
    <header
      className="flex items-center justify-between"
      style={{
        height: 80,
        padding: "0 40px",
        backgroundColor: COLORS.pageBg,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            lineHeight: 1.1,
          }}
        >
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: COLORS.textMuted,
          }}
        >
          Voici votre situation mise à jour aujourd&apos;hui.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Notification bell with badge "2" */}
        <button
          className="relative inline-flex items-center justify-center rounded-full"
          style={{
            width: 36,
            height: 36,
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.cardBg,
          }}
          aria-label="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span
            className="absolute flex items-center justify-center rounded-full text-white"
            style={{
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              backgroundColor: COLORS.primaryBlue,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            2
          </span>
        </button>
        {/* Avatar + name */}
        <div
          className="flex items-center gap-2 rounded-full"
          style={{
            padding: "4px 12px 4px 4px",
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.cardBg,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span
            style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary }}
          >
            Sébastien Golay
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}

/* ========================================================================= */
/*  DASHBOARD CONTENT — 5 blocs                                              */
/* ========================================================================= */

function DashboardContent() {
  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      <HeroRow />
      <RoadmapCard />
      <KpiRow />
      <BottomRow />
      <CoachCta />
    </div>
  );
}

/* ----- BLOC 1 — Hero (Score / Priorité / Mission) ------------------------- */

function HeroRow() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      <ScoreCard />
      <PriorityCard />
      <MissionCard />
    </div>
  );
}

function ScoreCard() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        backgroundColor: COLORS.navy,
        padding: 24,
        height: 200,
        boxShadow: "0 1px 3px rgb(0 0 0 / 0.06), 0 10px 30px -10px rgb(2 30 95 / 0.20)",
      }}
    >
      <div className="flex h-full items-start justify-between">
        <div className="flex flex-col justify-between" style={{ height: "100%" }}>
          {/* Eyebrow */}
          <p
            className="uppercase"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.75)",
              letterSpacing: "0.2em",
            }}
          >
            Score de santé financière
          </p>

          {/* Score */}
          <div className="flex items-baseline" style={{ gap: 4 }}>
            <span
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "white",
                lineHeight: 1,
                fontFamily: "Outfit, Inter, system-ui",
              }}
            >
              46
            </span>
            <span style={{ fontSize: 18, color: "rgba(255, 255, 255, 0.55)" }}>
              /100
            </span>
          </div>

          {/* Delta */}
          <div>
            <p
              className="inline-flex items-center"
              style={{
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.emerald,
                letterSpacing: "0.06em",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 6 23 6 23 12" />
                <path d="M22 6L13.5 14.5 8.5 9.5 1 17" />
              </svg>
              EN PROGRESSION
            </p>
            <p
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              +6 pts depuis la semaine dernière
            </p>
          </div>
        </div>

        {/* Ring */}
        <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
          <div
            className="absolute rounded-full"
            style={{
              inset: -4,
              backgroundColor: "rgba(255, 255, 255, 0.10)",
              filter: "blur(20px)",
            }}
          />
          <svg viewBox="0 0 100 100" className="relative h-full w-full">
            {/* Track */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            {/* Arc — 75% (simulé pour le visuel) */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="263.9 264"
              strokeDashoffset="66"
              transform="rotate(-90 50 50)"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))" }}
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
      className="overflow-hidden rounded-2xl flex flex-col justify-between"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 24,
        height: 200,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <div>
        <p
          className="uppercase"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: COLORS.textMuted,
            letterSpacing: "0.2em",
          }}
        >
          Votre priorité actuelle
        </p>
        <div className="flex items-start gap-3" style={{ marginTop: 16 }}>
          <span
            className="inline-flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 48, height: 48, backgroundColor: COLORS.coralBg }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: COLORS.textPrimary,
              lineHeight: 1.25,
              fontFamily: "Outfit, Inter, system-ui",
            }}
          >
            Construire votre fonds d&apos;urgence
          </h3>
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: COLORS.textMuted }}>
          0.0 mois de sécurité disponible
        </p>
      </div>
      <button
        className="inline-flex items-center self-start"
        style={{ gap: 4, fontSize: 13, fontWeight: 500, color: COLORS.primaryBlue }}
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
      className="overflow-hidden rounded-2xl flex flex-col justify-between"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 24,
        height: 200,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center rounded-md"
            style={{ width: 22, height: 22, backgroundColor: "#EFF4FF" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={COLORS.primaryBlue} stroke="none">
              <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
            </svg>
          </span>
          <p
            className="uppercase"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textMuted,
              letterSpacing: "0.2em",
            }}
          >
            Mission du moment
          </p>
        </div>
        <h3
          style={{
            marginTop: 16,
            fontSize: 17,
            fontWeight: 700,
            color: COLORS.textPrimary,
            lineHeight: 1.25,
            fontFamily: "Outfit, Inter, system-ui",
          }}
        >
          Constituez votre premier fonds d&apos;urgence
        </h3>
        <p style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
          Commencez par économiser 500 CHF ce mois-ci.
        </p>
      </div>
      <button
        className="inline-flex items-center justify-center rounded-lg self-start"
        style={{
          padding: "10px 16px",
          gap: 8,
          backgroundColor: COLORS.navy,
          color: "white",
          fontSize: 13,
          fontWeight: 600,
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

/* ----- BLOC 2 — Roadmap --------------------------------------------------- */

function RoadmapCard() {
  return (
    <div
      className="rounded-2xl"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 24,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily: "Outfit, Inter, system-ui",
          }}
        >
          Votre avenir, notre feuille de route
        </h2>
        <button
          className="inline-flex items-center"
          style={{ gap: 4, fontSize: 13, fontWeight: 500, color: COLORS.primaryBlue }}
        >
          Voir toutes les projections
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      <div className="flex items-stretch">
        <Milestone
          eyebrow="AUJOURD'HUI"
          title="Score actuel"
          subtitle="Posez les bases solides"
          isToday
          score={46}
        />
        <Connector />
        <Milestone
          eyebrow="DANS 4 MOIS"
          title="Fonds d'urgence complet"
          subtitle="3 mois de dépenses couvertes"
          icon={IconShield}
          bg={COLORS.emeraldLight}
          fg={COLORS.success}
        />
        <Connector />
        <Milestone
          eyebrow="DANS 12 MOIS"
          title="15 000 CHF d'épargne"
          subtitle="Votre épargne prend de l'élan"
          icon={IconLineChart}
          bg={COLORS.violetBg}
          fg={COLORS.violet}
        />
        <Connector />
        <Milestone
          eyebrow="DANS 3 ANS"
          title="Apport immobilier"
          subtitle="Atteignez votre objectif"
          icon={IconHomeRoadmap}
          bg={COLORS.emeraldLight}
          fg={COLORS.success}
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
  icon: Icon,
  bg,
  fg,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  isToday?: boolean;
  score?: number;
  icon?: React.FC<{ color: string }>;
  bg?: string;
  fg?: string;
}) {
  return (
    <div
      className="flex-1 rounded-xl"
      style={{
        padding: 16,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <span
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          backgroundColor: isToday ? "#E8EFFD" : bg,
          color: isToday ? COLORS.primaryBlue : fg,
          border: isToday ? `2px solid ${COLORS.primaryBlue}` : "none",
        }}
      >
        {isToday ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.primaryBlue }}>
            {score}
          </span>
        ) : Icon ? (
          <Icon color={fg ?? COLORS.textMuted} />
        ) : null}
      </span>
      <p
        className="uppercase"
        style={{
          marginTop: 12,
          fontSize: 10,
          fontWeight: 600,
          color: COLORS.textLight,
          letterSpacing: "0.18em",
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          marginTop: 4,
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textPrimary,
          lineHeight: 1.3,
        }}
      >
        {title}
      </p>
      <p style={{ marginTop: 4, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>
        {subtitle}
      </p>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex items-center justify-center self-center" style={{ width: 40 }}>
      <svg viewBox="0 0 40 12" width={32} height={10}>
        <line x1="2" y1="6" x2="28" y2="6" stroke={COLORS.primaryBlue} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
        <path d="M 29 2 L 36 6 L 29 10" stroke={COLORS.primaryBlue} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

/* ----- BLOC 3 — KPI ------------------------------------------------------- */

function KpiRow() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <KpiCard label="REVENUS MENSUELS" value="25 000 CHF" delta={{ value: "+3.2%", direction: "up", color: COLORS.success }} hint="Après impôts" />
      <KpiCard label="DÉPENSES MENSUELLES" value="15 893 CHF" delta={{ value: "-2.1%", direction: "down", color: COLORS.success }} hint="63% de vos revenus" />
      <KpiCard label="RESTE À VIVRE" value="9 107 CHF" delta={{ value: "+5.3%", direction: "up", color: COLORS.success }} hint="36.6% de vos revenus" />
      <KpiCard label="FONDS D'URGENCE" value="0.0 mois" delta={{ value: "—", direction: "neutral", color: COLORS.amber }} hint="500 CHF disponibles" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta: { value: string; direction: "up" | "down" | "neutral"; color: string };
  hint: string;
}) {
  return (
    <div
      className="rounded-2xl flex flex-col justify-between"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 20,
        height: 110,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <p
        className="uppercase"
        style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.18em" }}
      >
        {label}
      </p>
      <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily: "Outfit, Inter, system-ui",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        <span
          className="inline-flex items-center"
          style={{ gap: 2, fontSize: 12, fontWeight: 600, color: delta.color }}
        >
          {delta.direction === "up" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 17 17 7"/><polyline points="7 7 17 7 17 17"/></svg>}
          {delta.direction === "down" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 7 17 17"/><polyline points="7 17 17 17 17 7"/></svg>}
          {delta.value}
        </span>
      </div>
      <p style={{ fontSize: 12, color: COLORS.textMuted }}>{hint}</p>
    </div>
  );
}

/* ----- BLOC 4 — Opportunité / Répartition / Évolution -------------------- */

function BottomRow() {
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      <OpportunityCard />
      <RepartitionCard />
      <EvolutionCard />
    </div>
  );
}

function OpportunityCard() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 20,
        height: 260,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      {/* Green arrow illustration */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 16,
          top: 76,
          width: 90,
          height: 90,
          opacity: 0.85,
        }}
      >
        <svg viewBox="0 0 80 80" fill="none" style={{ width: "100%", height: "100%", color: COLORS.success }}>
          <path d="M 10 64 Q 32 50 44 36 Q 56 22 68 14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 60 12 L 70 12 L 70 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center rounded-md"
          style={{ width: 24, height: 24, backgroundColor: COLORS.successBg }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </span>
        <p
          className="uppercase"
          style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.18em" }}
        >
          Opportunité du moment
        </p>
      </div>

      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.success,
          lineHeight: 1.4,
        }}
      >
        Le plus grand impact pour vous
      </p>

      <h3
        style={{
          marginTop: 12,
          fontSize: 17,
          fontWeight: 700,
          color: COLORS.textPrimary,
          lineHeight: 1.3,
          maxWidth: "70%",
          fontFamily: "Outfit, Inter, system-ui",
        }}
      >
        Augmentez vos revenus de 300 CHF/mois
      </h3>

      <p
        style={{
          marginTop: 8,
          fontSize: 12,
          color: COLORS.textMuted,
          lineHeight: 1.5,
          maxWidth: "70%",
        }}
      >
        aurait plus d&apos;impact que réduire vos dépenses de 100 CHF/mois.
      </p>

      <p style={{ marginTop: 16, fontSize: 12, color: COLORS.textMuted }}>
        Impact potentiel : <span style={{ fontWeight: 600, color: COLORS.success }}>+12 points sur votre score</span>
      </p>

      <button
        className="inline-flex items-center rounded-lg"
        style={{
          marginTop: 12,
          padding: "8px 14px",
          gap: 6,
          backgroundColor: COLORS.navy,
          color: "white",
          fontSize: 12,
          fontWeight: 600,
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
  const slices = [
    { id: "logement", label: "Logement", pct: 35, amount: "5 500 CHF", color: COLORS.navy },
    { id: "alimentation", label: "Alimentation", pct: 20, amount: "3 200 CHF", color: COLORS.primaryBlue },
    { id: "transport", label: "Transport", pct: 15, amount: "2 400 CHF", color: COLORS.success },
    { id: "assurances", label: "Assurances", pct: 10, amount: "1 600 CHF", color: COLORS.coral },
    { id: "loisirs", label: "Loisirs & divers", pct: 20, amount: "3 193 CHF", color: COLORS.violet },
  ];
  // Build donut paths
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
      className="rounded-2xl"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 20,
        height: 260,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <p
        className="uppercase"
        style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.18em" }}
      >
        Répartition des dépenses
      </p>
      <p style={{ marginTop: 2, fontSize: 12, color: COLORS.textLight }}>Ce mois-ci</p>

      <div className="flex items-center" style={{ marginTop: 16, gap: 16 }}>
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 124, height: 124 }}>
          <svg viewBox="0 0 100 100" width={124} height={124}>
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
                fontSize: 15,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: "Outfit, Inter, system-ui",
              }}
            >
              15 893
            </p>
            <p
              className="uppercase"
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: COLORS.textMuted,
                letterSpacing: "0.18em",
              }}
            >
              CHF
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {slicesWithPaths.map((s) => (
            <div
              key={s.id}
              className="grid items-baseline"
              style={{ gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 8, padding: "2px 0", fontSize: 12 }}
            >
              <span className="inline-flex items-center" style={{ gap: 6, minWidth: 0 }}>
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
                <span style={{ color: COLORS.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </span>
              <span style={{ color: COLORS.textPrimary, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {s.pct}%
              </span>
              <span style={{ color: COLORS.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {s.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        className="inline-flex items-center"
        style={{ marginTop: 12, gap: 4, fontSize: 13, fontWeight: 500, color: COLORS.primaryBlue }}
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
  // 8 points montrant une progression
  const points = [22, 30, 38, 32, 42, 50, 54, 46];
  const W = 280;
  const H = 130;
  const PAD = { top: 12, right: 36, bottom: 22, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
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
      className="rounded-2xl"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: 20,
        height: 260,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <p
        className="uppercase"
        style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.18em" }}
      >
        Évolution du score
      </p>
      <p style={{ marginTop: 2, fontSize: 12, color: COLORS.textLight }}>Votre progression</p>

      <div style={{ marginTop: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          <defs>
            <linearGradient id="evo-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.primaryBlue} stopOpacity="0.2" />
              <stop offset="100%" stopColor={COLORS.primaryBlue} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={COLORS.border} strokeWidth={0.5} />
            );
          })}
          {[25, 50, 75, 100].map((v) => {
            const y = PAD.top + ((100 - v) / 100) * innerH;
            return (
              <text key={`y-${v}`} x={W - PAD.right + 6} y={y + 3} fontSize="9" fill={COLORS.textMuted}>
                {v}
              </text>
            );
          })}
          {/* Area */}
          <path d={areaD} fill="url(#evo-gradient)" />
          {/* Line */}
          <path
            d={pathD}
            stroke={COLORS.primaryBlue}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Points */}
          {scaled.slice(0, -1).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={COLORS.cardBg} stroke={COLORS.primaryBlue} strokeWidth={1.5} />
          ))}
          {/* Callout */}
          <circle cx={last.x} cy={last.y} r={4} fill={COLORS.primaryBlue} />
          <rect x={last.x + 8} y={last.y - 14} width={36} height={24} rx={5} fill={COLORS.navy} />
          <text x={last.x + 26} y={last.y - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
            46
          </text>
          <text x={last.x + 26} y={last.y + 7} textAnchor="middle" fontSize="6" fill="white" fillOpacity="0.85">
            Score actuel
          </text>
        </svg>
        <div className="flex justify-between" style={{ marginTop: 4, fontSize: 10, color: COLORS.textMuted, paddingLeft: PAD.left, paddingRight: PAD.right }}>
          <span>1 avr.</span>
          <span>15 avr.</span>
          <span>1 mai</span>
          <span>15 mai</span>
          <span>1 juin</span>
        </div>
      </div>

      <button
        className="inline-flex items-center"
        style={{ marginTop: 12, gap: 4, fontSize: 13, fontWeight: 500, color: COLORS.primaryBlue }}
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

/* ----- BLOC 5 — Coach CTA ------------------------------------------------- */

function CoachCta() {
  return (
    <div
      className="rounded-2xl flex items-center justify-between"
      style={{
        backgroundColor: COLORS.cardBg,
        padding: "12px 20px",
        height: 60,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -8px rgb(15 23 42 / 0.06)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: "#EFF4FF" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.primaryBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
            Parler à mon conseiller
          </p>
          <p style={{ fontSize: 12, color: COLORS.textMuted }}>
            Posez une question, obtenez des conseils personnalisés.
          </p>
        </div>
      </div>
      <button
        className="inline-flex items-center rounded-lg"
        style={{
          padding: "10px 18px",
          gap: 8,
          backgroundColor: COLORS.navy,
          color: "white",
          fontSize: 13,
          fontWeight: 600,
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

/* ========================================================================= */
/*  ICONS — minimal SVG (no external lib dep)                                 */
/* ========================================================================= */

function IconHome({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconMessage({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconCheckSquare({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
function IconArrowUpCircle({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;
}
function IconWallet({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>;
}
function IconPieChart({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
}
function IconFlag({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
}
function IconPiggyBank({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h0"/></svg>;
}
function IconTrendUp({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function IconCompass({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/></svg>;
}
function IconSettings({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IconUser({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function IconShield({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
}
function IconLineChart({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function IconHomeRoadmap({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

/* ========================================================================= */
/*  DONUT helpers                                                             */
/* ========================================================================= */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutSliceD(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const startOuter = polarToCartesian(cx, cy, outerR, startDeg);
  const endOuter = polarToCartesian(cx, cy, outerR, endDeg);
  const startInner = polarToCartesian(cx, cy, innerR, endDeg);
  const endInner = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${startOuter.x.toFixed(3)} ${startOuter.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(3)} ${endOuter.y.toFixed(3)}`,
    `L ${startInner.x.toFixed(3)} ${startInner.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x.toFixed(3)} ${endInner.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

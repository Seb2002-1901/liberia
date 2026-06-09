/**
 * Phase 5.0 — /design-match/coach-v3
 *
 * Coach IA premium, langage visuel strictement aligné sur dashboard-v3
 * (référence officielle validée). Page autonome, sans imports
 * @/components ni @/lib.
 *
 * Structure :
 *   Sidebar 280 (identique v3)
 *   Topbar 68 (identique v3)
 *   Main 1fr → CoachHero · ChatThread · SuggestionChips · Composer
 *   Right rail 300 → SituationCard · ResumeFinancierCard ·
 *                     PrioriteMomentCard · InsightsRapidesCard
 */

export const metadata = {
  title: "Design Match v3 — Coach IA",
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
  assistantBubble: "#F4F6FB",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

const H = {
  topbar: 68,
  coachHero: 44,
  composer: 96,
  privacy: 24,
  rightCardGap: 12,
};

export default function DesignMatchCoachV3() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: C.pageBg,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <Sidebar />
      <div style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Topbar />
        <main
          style={{
            flex: 1,
            minHeight: 0,
            padding: "0 32px 16px 32px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gridTemplateRows: "1fr",
            gap: 24,
            maxWidth: 1440,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <ChatColumn />
          <RightRail />
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ SIDEBAR — identique dashboard-v3 ═══════════════ */

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
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 24px" }}>
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
          <NavItem label="Tableau de bord" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" />
          <NavItem label="Coach IA" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" active />
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
          Votre conseiller IA est en ligne. 2 nouveaux insights vous attendent.
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

/* ═══════════════ CHAT COLUMN ═══════════════ */

function ChatColumn() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, gap: 12 }}>
      <CoachHero />
      <ChatThread />
      <SuggestionChips />
      <Composer />
      <PrivacyFooter />
    </div>
  );
}

function CoachHero() {
  return (
    <div
      style={{
        height: H.coachHero,
        padding: "0 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: C.navy,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui" }}>
          Coach IA Liberia
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 8px",
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            fontSize: 9.5,
            fontWeight: 700,
            color: C.primary,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Premium
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            color: C.textMuted,
            marginLeft: 4,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: C.success,
              boxShadow: `0 0 0 3px ${C.successBg}`,
            }}
          />
          En ligne
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12.5,
            fontWeight: 500,
            color: C.textMuted,
            background: "none",
            border: "none",
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Historique
        </button>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 12px",
            backgroundColor: C.primaryBg,
            color: C.primary,
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle conversation
        </button>
      </div>
    </div>
  );
}

/* ═══════════════ CHAT THREAD ═══════════════ */

function ChatThread() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: "20px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <DateSeparator label="Aujourd'hui" />
      <AssistantMessage time="10:30">
        <p style={{ margin: 0, fontSize: 13.5, color: C.textDark, lineHeight: 1.55 }}>
          Salut Sébastien&nbsp;<span aria-hidden>👋</span>
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 13.5, color: C.textDark, lineHeight: 1.55 }}>
          J&apos;ai analysé votre situation : score{" "}
          <strong style={{ color: C.navy, fontWeight: 700 }}>46/100</strong>, reste à vivre{" "}
          <strong style={{ color: C.navy, fontWeight: 700 }}>9 107 CHF/mois</strong>.
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 13.5, color: C.textDark, lineHeight: 1.55 }}>
          Votre priorité actuelle : construire votre fonds d&apos;urgence. Par quoi voulez-vous commencer ?
        </p>
      </AssistantMessage>
      <UserMessage time="10:31" status="read">
        Comment augmenter mon épargne plus rapidement&nbsp;?
      </UserMessage>
      <AssistantMessage time="10:31">
        <p style={{ margin: 0, fontSize: 13.5, color: C.textDark, lineHeight: 1.55 }}>
          Excellente question. Voici 3 leviers concrets, classés par impact sur votre score :
        </p>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <LeverRow
            rank={1}
            color={C.success}
            colorBg={C.successBg}
            title="Augmenter vos revenus de 300 CHF/mois"
            impact="+12 pts"
            detail="Levier le plus puissant sur votre score (32 % du calcul)."
            isPrimary
          />
          <LeverRow
            rank={2}
            color={C.primary}
            colorBg={C.primaryBg}
            title="Automatiser 500 CHF vers votre épargne"
            impact="+8 pts"
            detail="Versement le 25 du mois, juste après votre salaire."
          />
          <LeverRow
            rank={3}
            color={C.violet}
            colorBg={C.violetBg}
            title="Réduire vos dépenses fixes de 10 %"
            impact="+1 589 CHF/mois"
            detail="Renégociation assurances, abonnements, énergie."
          />
        </div>
        <p style={{ margin: "12px 0 0 0", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
          Lequel souhaitez-vous approfondir&nbsp;?
        </p>
      </AssistantMessage>
      <UserMessage time="10:32" status="read">
        Montre-moi comment réduire mes dépenses fixes.
      </UserMessage>
      <TypingIndicator />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: C.navy,
          marginTop: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
        </svg>
      </span>
      <div>
        <div
          aria-label="Coach IA est en train d'écrire"
          style={{
            padding: "12px 16px",
            backgroundColor: C.assistantBubble,
            borderRadius: "4px 14px 14px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <TypingDot delay="0s" />
          <TypingDot delay="0.16s" />
          <TypingDot delay="0.32s" />
        </div>
        <p style={{ marginTop: 4, fontSize: 10.5, color: C.textLight, margin: "4px 0 0 4px" }}>
          Coach IA écrit…
        </p>
      </div>
      {/* Keyframes inlined via <style> pour rester autonome (pas
          d'imports Tailwind ni de classes globales). */}
      <style>{`@keyframes coach-typing { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }`}</style>
    </div>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: C.textMuted,
        animation: "coach-typing 1.2s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 1, backgroundColor: C.borderGhost }} />
      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: C.borderGhost }} />
    </div>
  );
}

function AssistantMessage({
  children,
  time,
}: {
  children: React.ReactNode;
  time: string;
}) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: C.navy,
          marginTop: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
        </svg>
      </span>
      <div style={{ maxWidth: 580, minWidth: 0 }}>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: C.assistantBubble,
            borderRadius: "4px 14px 14px 14px",
          }}
        >
          {children}
        </div>
        <p style={{ marginTop: 4, fontSize: 10.5, color: C.textLight, marginLeft: 4, margin: "4px 0 0 4px" }}>
          Coach IA · {time}
        </p>
      </div>
    </div>
  );
}

function UserMessage({
  children,
  time,
  status,
}: {
  children: React.ReactNode;
  time: string;
  status: "sent" | "read";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            padding: "11px 16px",
            backgroundColor: C.navy,
            color: "white",
            borderRadius: "14px 4px 14px 14px",
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          {children}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 10.5, color: C.textLight }}>{time}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={status === "read" ? C.primary : C.textLight} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
            <polyline points="22 12 14 20 13 19" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function LeverRow({
  rank,
  color,
  colorBg,
  title,
  impact,
  detail,
  isPrimary = false,
}: {
  rank: number;
  color: string;
  colorBg: string;
  title: string;
  impact: string;
  detail: string;
  isPrimary?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        // Sur le #1 : padding-left renforcé pour héberger l'accent
        // vertical 3 px (success), bg très légèrement tinté
        // (#F4FBF8 ≈ successBg dilué). Aucun effet flashy, juste un
        // shift de lecture côté best lever.
        padding: isPrimary ? "11px 12px 11px 15px" : "10px 12px",
        backgroundColor: isPrimary ? "#F4FBF8" : C.cardBg,
        borderRadius: 10,
        boxShadow: SHADOW.flat,
        overflow: "hidden",
      }}
    >
      {isPrimary && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: "0 3px 3px 0",
            backgroundColor: C.success,
          }}
        />
      )}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: isPrimary ? color : colorBg,
          color: isPrimary ? "white" : color,
          fontSize: 11.5,
          fontWeight: 700,
          fontFamily: "Outfit, Inter, system-ui",
          flexShrink: 0,
          boxShadow: isPrimary ? `0 0 0 3px rgba(16, 163, 127, 0.14)` : "none",
        }}
      >
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: isPrimary ? 700 : 600,
            color: C.textDark,
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
        <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
          {detail}
        </p>
      </div>
      <span
        style={{
          fontSize: isPrimary ? 12.5 : 11.5,
          fontWeight: 700,
          color: color,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {impact}
      </span>
    </div>
  );
}

/* ═══════════════ SUGGESTION CHIPS ═══════════════ */

function SuggestionChips() {
  const suggestions = [
    "Détailler la renégociation assurances",
    "Simuler 500 CHF/mois pendant 12 mois",
    "Quels postes je dépense le plus ?",
    "Optimiser mes impôts",
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, letterSpacing: "0.14em", textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
        Suggestions
      </span>
      {suggestions.map((s) => (
        <button
          key={s}
          style={{
            padding: "7px 12px",
            borderRadius: 999,
            border: `1px solid ${C.borderGhost}`,
            backgroundColor: C.cardBg,
            fontSize: 12,
            fontWeight: 500,
            color: C.textDark,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            boxShadow: SHADOW.flat,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {s}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════ COMPOSER ═══════════════ */

function Composer() {
  return (
    <div
      style={{
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        style={{
          fontSize: 13.5,
          color: C.textDark,
          lineHeight: 1.5,
          padding: "6px 4px",
          minHeight: 24,
          outline: "none",
          fontFamily: "inherit",
        }}
        aria-label="Saisir un message"
      >
        <span style={{ color: C.textLight, userSelect: "none" }}>
          Posez une question à votre conseiller…
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <ComposerAction
            iconPath="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
            label="Joindre un fichier"
          />
          <ComposerAction
            iconPath="M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3"
            label="Analyser mes données"
          />
          <ComposerAction
            iconPath="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z|M19 10v2a7 7 0 0 1-14 0v-2|M12 19v4|M8 23h8"
            label="Dicter un message"
          />
        </div>
        <button
          aria-label="Envoyer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 16px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
          }}
        >
          Envoyer
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ComposerAction({ iconPath, label }: { iconPath: string; label: string }) {
  const paths = iconPath.split("|");
  return (
    <button
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "none",
        backgroundColor: "transparent",
        color: C.textMuted,
        cursor: "pointer",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </button>
  );
}

function PrivacyFooter() {
  return (
    <p
      style={{
        height: H.privacy,
        margin: 0,
        fontSize: 10.5,
        color: C.textLight,
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Vos échanges restent privés. Le Coach IA s&apos;appuie sur vos données et n&apos;est pas un conseil financier réglementé.
    </p>
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
        minHeight: 0,
        overflowY: "auto",
      }}
    >
      <SituationCard />
      <ResumeFinancierCard />
      <PrioriteMomentCard />
      <InsightsRapidesCard />
    </aside>
  );
}

function SituationCard() {
  // Mini-ring : circumference 2π × 32 ≈ 201.06. Score 46 → offset = c * (1 − 0.46).
  // Ring 80 px (vs 72 ≈ +11 %), strokeWidth 7 et glow drop-shadow alignés
  // strictement sur le ScoreCard du dashboard-v3.
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - 0.46);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "18px 20px",
        backgroundColor: C.navy,
        borderRadius: 16,
        boxShadow: SHADOW.navy,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.22) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.72)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
          position: "relative",
        }}
      >
        Votre situation
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, position: "relative" }}>
        <div style={{ flexShrink: 0, width: 80, height: 80, position: "relative" }}>
          {/* Inner glow blur — strict copie du dashboard-v3 (inset:-8 + blur 28) */}
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
          <svg viewBox="0 0 80 80" width={80} height={80} style={{ position: "relative" }}>
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="white"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${c.toFixed(2)} ${c.toFixed(2)}`}
              strokeDashoffset={offset.toFixed(2)}
              transform="rotate(-90 40 40)"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
            />
            <text x="40" y="46" textAnchor="middle" fontSize="22" fontWeight="700" fill="white" fontFamily="Outfit, Inter, system-ui" letterSpacing="-0.025em">
              46
            </text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Score actuel</p>
          <p style={{ margin: "2px 0 0 0", fontSize: 18, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em" }}>
            46 / 100
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              marginTop: 6,
              padding: "2px 7px",
              borderRadius: 999,
              backgroundColor: "rgba(16, 163, 127, 0.18)",
              fontSize: 10,
              fontWeight: 700,
              color: "#5EEAD4",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 6 23 6 23 12" />
              <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
            </svg>
            +6 pts
          </span>
        </div>
      </div>
    </div>
  );
}

function ResumeFinancierCard() {
  const rows = [
    { label: "Revenus mensuels", value: "25 000 CHF", color: C.success, bg: C.successBg, iconPath: "M12 5v14|M5 12l7-7 7 7" },
    { label: "Dépenses mensuelles", value: "15 893 CHF", color: "#DC2626", bg: "#FEE2E2", iconPath: "M12 19V5|M5 12l7 7 7-7" },
    { label: "Reste à vivre", value: "9 107 CHF", color: C.primary, bg: C.primaryBg, iconPath: "M21 12h-7|M14 8l7 4-7 4" },
    {
      label: "Fonds d'urgence",
      value: "0.0 mois",
      sub: "500 CHF disponibles",
      color: C.amber,
      bg: C.amberBg,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
  ];
  return (
    <div
      style={{
        padding: "16px 18px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
        Résumé financier
      </p>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: row.bg,
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={row.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {row.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, lineHeight: 1.3 }}>
                {row.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {row.value}
              </p>
              {row.sub && (
                <p style={{ margin: "1px 0 0 0", fontSize: 10.5, color: C.textLight, lineHeight: 1.3 }}>
                  {row.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrioriteMomentCard() {
  return (
    <div
      style={{
        padding: "16px 18px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 7,
            backgroundColor: C.coralBg,
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Priorité du moment
        </p>
      </div>
      <h3
        style={{
          margin: "12px 0 0 0",
          fontSize: 14.5,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.3,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        Construire votre fonds d&apos;urgence
      </h3>
      {/* Hiérarchie progression :
          0.0 (massif coral) / 3.0 (textLight) mois  →  2 % atteint
          → chiffre dominant + dénominateur lisible + chip pourcentage. */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: C.coral,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            0.0
          </span>
          <span style={{ fontSize: 13, color: C.textLight, fontWeight: 500, fontFamily: "Outfit, Inter, system-ui" }}>
            / 3.0
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 3 }}>mois</span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 7px",
            borderRadius: 999,
            backgroundColor: C.coralBg,
            color: C.coral,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          2 % atteint
        </span>
      </div>
      <div
        style={{
          marginTop: 8,
          height: 6,
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
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: C.textLight }}>
        <span>500 CHF</span>
        <span>Cible 47 679 CHF</span>
      </div>
      <button
        style={{
          marginTop: 10,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        Planifier avec le coach
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function InsightsRapidesCard() {
  const insights = [
    {
      title: "Simuler un scénario",
      detail: "Voir l'impact d'une décision",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M22 7L13.5 15.5 8.5 10.5 2 17|M17 7 22 7 22 12",
    },
    {
      title: "Analyser une dépense",
      detail: "Comprendre et optimiser",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    },
    {
      title: "Définir un objectif",
      detail: "Fixer un nouvel horizon",
      bg: C.successBg,
      color: C.success,
      iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M12 6v6l4 2",
    },
  ];
  return (
    <div
      style={{
        padding: "16px 18px",
        backgroundColor: C.cardBg,
        borderRadius: 16,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
        Actions rapides
      </p>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
        {insights.map((it, idx) => (
          <button
            key={it.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
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
                width: 30,
                height: 30,
                borderRadius: 999,
                backgroundColor: it.bg,
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
                {it.title}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>
                {it.detail}
              </p>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

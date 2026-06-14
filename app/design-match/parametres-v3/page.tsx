/**
 * Phase 5.0 — /design-match/parametres-v3
 *
 * Page Paramètres V3 — cockpit de pilotage du compte aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que les 12 autres pages V3 verrouillées.
 *
 * Cette page n'est PAS un formulaire d'administration. Aucun champ
 * éditable, aucun input visible, aucun upload. Vue de contrôle
 * premium : états + CTAs vers les drill-downs.
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : HeroParametres navy · ScoreParametresCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : PreferencesIACard · NotificationsCard · ConfidentialiteCard
 *   Row 3 (1.2fr / 1fr / 1fr)  : SecuriteCard · IntegrationsCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/services/finance";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getMyUserMemory } from "@/lib/services/memory";
import { COACHING_TONES } from "@/lib/constants";
import { SettingsPreferences } from "@/components/settings/settings-preferences";
import { V3TopbarMenu } from "@/components/layout/v3-topbar-menu";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return { title: `${t("parametres")} — LIBERIA` };
}

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

/* ═══════════════ DATA FETCH ═══════════════ */

/** Toggles persistés dans la table `user_settings`. Identique à
 *  l'ensemble exposé par les server actions setEmail* / setNotificationAlerts. */
const SETTINGS_COLS = [
  "email_weekly_summary",
  "notification_alerts",
  "email_encouragement",
  "email_trial_reminders",
  "email_goal_milestones",
  "email_inactivity_followup",
  "analytics_opt_out",
] as const;

type SettingsRow = Partial<Record<(typeof SETTINGS_COLS)[number], boolean>>;

async function loadAccountData(): Promise<{
  settings: SettingsRow | null;
  accountCreatedAt: string | null;
  lastSignInAt: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { settings: null, accountCreatedAt: null, lastSignInAt: null };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { settings: null, accountCreatedAt: null, lastSignInAt: null };
    }
    const { data } = await supabase
      .from("user_settings")
      .select(SETTINGS_COLS.join(","))
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      settings: (data as SettingsRow | null) ?? null,
      accountCreatedAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    };
  } catch (err) {
    console.error("[parametres-v3] loadAccountData failed", err);
    return { settings: null, accountCreatedAt: null, lastSignInAt: null };
  }
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchParametresV3() {
  const [data, account, memory] = await Promise.all([
    getFinanceData(),
    loadAccountData(),
    getMyUserMemory(),
  ]);

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Calculs dérivés                                                    */
  /* ------------------------------------------------------------------ */

  const settings = account.settings;
  const hasSettings = !!settings;

  // Préférences mémoire IA — 6 champs possibles
  const memoryFlags: boolean[] = memory
    ? [
        !!memory.coaching_tone,
        !!memory.financial_personality,
        !!memory.preferred_motivation_style,
        memory.recurring_challenges.length > 0,
        memory.spending_triggers.length > 0,
        !!memory.progress_notes,
      ]
    : [];
  const memoryFilled = memoryFlags.filter(Boolean).length;
  const memoryTotal = 6;

  // Notifications — 6 toggles (analytics_opt_out exclu, c'est un consentement)
  const NOTIF_KEYS = [
    "email_weekly_summary",
    "notification_alerts",
    "email_encouragement",
    "email_trial_reminders",
    "email_goal_milestones",
    "email_inactivity_followup",
  ] as const;
  const notifActiveCount = settings
    ? NOTIF_KEYS.filter((k) => settings[k] === true).length
    : 0;
  const notifTotal = NOTIF_KEYS.length;

  // % global de configuration : (notifs activées + mémoire renseignée) / total
  const totalConfigFields = notifTotal + memoryTotal;
  const filledConfigFields = notifActiveCount + memoryFilled;
  const configPct = hasSettings || memory
    ? Math.round((filledConfigFields / totalConfigFields) * 100)
    : null;

  const coachingToneLabel = memory?.coaching_tone
    ? COACHING_TONES.find((t) => t.id === memory.coaching_tone)?.label ?? null
    : null;

  // Étiquettes ternaires pour un toggle bool|null
  const labelToggle = (
    v: boolean | undefined,
    onTrue: string,
    onFalse: string,
  ): { value: string; tone: "success" | "primary" | "muted" } => {
    if (v === true) return { value: onTrue, tone: "success" };
    if (v === false) return { value: onFalse, tone: "muted" };
    return { value: "Non configuré", tone: "muted" };
  };

  const notifBudget = labelToggle(
    settings?.notification_alerts,
    "Activées",
    "Désactivées",
  );
  const notifOpportunites = labelToggle(
    settings?.notification_alerts,
    "Activées",
    "Désactivées",
  );
  const notifObjectifs = labelToggle(
    settings?.email_goal_milestones,
    "Activées",
    "Désactivées",
  );
  const notifWeekly = labelToggle(
    settings?.email_weekly_summary,
    "Dimanche",
    "Désactivé",
  );

  // Cartes Préférences IA
  const prefRecommandations = coachingToneLabel
    ? { value: coachingToneLabel, tone: "primary" as const }
    : { value: "Non configuré", tone: "muted" as const };
  const personalizationLevel = (() => {
    if (memoryFilled === 0) return { value: "Non configuré", tone: "muted" as const };
    if (memoryFilled <= 2) return { value: "Basique", tone: "primary" as const };
    if (memoryFilled <= 4) return { value: "Standard", tone: "primary" as const };
    return { value: "Avancé", tone: "success" as const };
  })();
  const prefResumes = labelToggle(
    settings?.email_weekly_summary,
    "Activés",
    "Désactivés",
  );
  const prefAnalyse = labelToggle(
    settings?.notification_alerts,
    "Activée",
    "Désactivée",
  );

  // Cartes Confidentialité
  const histIA = memory
    ? { value: "Activé", tone: "success" as const }
    : { value: "Non configuré", tone: "muted" as const };
  const consentement =
    settings === null
      ? { value: "Non configuré", tone: "muted" as const }
      : settings?.analytics_opt_out === true
        ? { value: "Refusé", tone: "primary" as const }
        : { value: "Accepté", tone: "success" as const };

  // Score global Notifications / Sécurité / Confidentialité / Automatisations
  const scoreNotif = !hasSettings
    ? { value: "Non configuré", color: C.textMuted }
    : notifActiveCount === 0
      ? { value: "Désactivées", color: C.textMuted }
      : notifActiveCount === notifTotal
        ? { value: "Activées", color: C.success }
        : { value: "Partielles", color: C.primary };
  const scoreSecurite = { value: "À compléter", color: C.amber };
  const scoreConfid = !hasSettings
    ? { value: "Non configuré", color: C.textMuted }
    : settings?.analytics_opt_out === true
      ? { value: "Renforcée", color: C.success }
      : { value: "Standard", color: C.primary };
  const scoreAuto = hasSettings
    ? {
        value: `${notifActiveCount} / ${notifTotal} actives`,
        color: notifActiveCount === notifTotal ? C.success : C.primary,
      }
    : { value: "Non configuré", color: C.textMuted };

  const autoItems = [
    {
      label: "Analyse hebdomadaire",
      iconPath: "M3 3v18h18|M7 14l4-4 4 4 5-5",
      ...labelToggle(settings?.email_weekly_summary, "Active", "Désactivée"),
    },
    {
      label: "Détection d'opportunités",
      iconPath:
        "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z",
      ...labelToggle(settings?.notification_alerts, "Active", "Désactivée"),
    },
    {
      label: "Alertes objectifs",
      iconPath:
        "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15",
      ...labelToggle(settings?.email_goal_milestones, "Active", "Désactivée"),
    },
    {
      label: "Rapports automatiques",
      iconPath:
        "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
      ...labelToggle(
        settings?.email_inactivity_followup,
        "Active",
        "Désactivée",
      ),
    },
  ];

  const conseilState = (() => {
    if (configPct === null) {
      return {
        title: "Configuration à compléter.",
        body: "Activez vos préférences IA et vos notifications pour profiter pleinement de Liberia.",
      };
    }
    if (configPct >= 80) {
      return {
        title: `Configuration optimisée à ${configPct} %.`,
        body: "Vos préférences IA sont enregistrées et vos notifications sont actives.",
      };
    }
    if (!coachingToneLabel) {
      return {
        title: `Configuration à ${configPct} %.`,
        body: "Définissez votre ton de coaching IA pour des recommandations sur-mesure.",
      };
    }
    return {
      title: `Configuration à ${configPct} %.`,
      body: "Quelques préférences restent à activer pour profiter pleinement de Liberia.",
    };
  })();

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-par-row] { grid-template-columns: 1fr !important; }
          [data-par-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-par-sidebar] { display: none !important; }
          [data-par-content] { margin-left: 0 !important; }
          [data-par-main] { padding: 0 16px 16px 16px !important; }
          [data-par-topbar] { padding: 0 16px !important; }
        }
      `}</style>
      <MobileNav />
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-par-sidebar>
          <Sidebar />
        </div>
        <div data-par-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-par-main
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
            <div data-par-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <HeroParametres configPct={configPct} />
              <ScoreParametresCard
                scoreNotif={scoreNotif}
                scoreSecurite={scoreSecurite}
                scoreConfid={scoreConfid}
                scoreAuto={scoreAuto}
              />
            </div>
            <div data-par-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <PreferencesIACard
                prefRecommandations={prefRecommandations}
                personalizationLevel={personalizationLevel}
                prefResumes={prefResumes}
                prefAnalyse={prefAnalyse}
              />
              <NotificationsCard
                notifBudget={notifBudget}
                notifOpportunites={notifOpportunites}
                notifObjectifs={notifObjectifs}
                notifWeekly={notifWeekly}
              />
              <ConfidentialiteCard
                histIA={histIA}
                consentement={consentement}
              />
            </div>
            <div data-par-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <SecuriteCard />
              <AutomatisationsIACard
                items={autoItems}
                activeCount={hasSettings ? notifActiveCount : null}
                total={notifTotal}
              />
              <ConseilIACard title={conseilState.title} body={conseilState.body} />
            </div>
            <EditPreferencesCard settings={settings} />
            <MissionFooter configPct={configPct} />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Paramètres actif) ═══════════════ */

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
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" active />
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
  const displayName = firstName ?? "";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-par-topbar
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
          Pilotez votre environnement Liberia en quelques regards.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <V3TopbarMenu fullName={fullName} />
      </div>
    </header>
  );
}
/* ═══════════════ ROW 1 ═══════════════ */

function HeroParametres({ configPct }: { configPct: number | null }) {
  const hasPct = configPct !== null;
  const pctText = hasPct ? `${configPct} % configuré` : "À compléter";
  const barWidth = hasPct ? `${Math.max(0, Math.min(100, configPct))}%` : "0%";
  const pctBadge = hasPct ? `${configPct}%` : "—";
  const subtitle = hasPct
    ? "Votre environnement Liberia est configuré pour une expérience personnalisée."
    : "Activez vos préférences pour personnaliser votre expérience Liberia.";
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
            Paramètres du compte
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
              {pctText}
            </p>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.3 }}>
            {subtitle}
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 360 }}>
              <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              {pctBadge}
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
            fontSize: 30,
          }}
          aria-hidden
        >
          ⚙️
        </div>
      </div>
    </div>
  );
}

function ScoreParametresCard({
  scoreNotif,
  scoreSecurite,
  scoreConfid,
  scoreAuto,
}: {
  scoreNotif: { value: string; color: string };
  scoreSecurite: { value: string; color: string };
  scoreConfid: { value: string; color: string };
  scoreAuto: { value: string; color: string };
}) {
  const stats = [
    { label: "Notifications", value: scoreNotif.value, color: scoreNotif.color },
    { label: "Sécurité", value: scoreSecurite.value, color: scoreSecurite.color },
    { label: "Confidentialité", value: scoreConfid.value, color: scoreConfid.color },
    { label: "Automatisations", value: scoreAuto.value, color: scoreAuto.color },
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
        État des réglages
      </p>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>{s.label}</p>
            <p
              style={{
                margin: "1px 0 0 0",
                fontSize: 11.5,
                fontWeight: 700,
                color: s.color,
                fontFamily: "Outfit, Inter, system-ui",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/settings/memory"
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
          textDecoration: "none",
        }}
      >
        Gérer mes préférences IA
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

type SettingRow = { label: string; value: string; tone?: "success" | "primary" | "muted"; iconPath: string };

function SettingsList({ items, accent, accentBg }: { items: SettingRow[]; accent: string; accentBg: string }) {
  const toneColor = (tone?: SettingRow["tone"]) => {
    if (tone === "success") return C.success;
    if (tone === "primary") return C.primary;
    return C.textMuted;
  };
  return (
    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: accentBg, flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: C.textDark, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {it.label}
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: toneColor(it.tone), textAlign: "right", flexShrink: 0 }}>
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreferencesIACard({
  prefRecommandations,
  personalizationLevel,
  prefResumes,
  prefAnalyse,
}: {
  prefRecommandations: { value: string; tone: "success" | "primary" | "muted" };
  personalizationLevel: { value: string; tone: "success" | "primary" | "muted" };
  prefResumes: { value: string; tone: "success" | "primary" | "muted" };
  prefAnalyse: { value: string; tone: "success" | "primary" | "muted" };
}) {
  const items: SettingRow[] = [
    { label: "Ton de coaching IA", value: prefRecommandations.value, tone: prefRecommandations.tone, iconPath: "M12 8v4l3 3|M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
    { label: "Niveau de personnalisation", value: personalizationLevel.value, tone: personalizationLevel.tone, iconPath: "M3 12h18|M3 6h18|M3 18h12" },
    { label: "Résumés automatiques", value: prefResumes.value, tone: prefResumes.tone, iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { label: "Alertes proactives", value: prefAnalyse.value, tone: prefAnalyse.tone, iconPath: "M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Préférences IA
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Comment Liberia vous accompagne
      </p>
      <SettingsList items={items} accent={C.primary} accentBg={C.primaryBg} />
    </div>
  );
}

function NotificationsCard({
  notifBudget,
  notifOpportunites,
  notifObjectifs,
  notifWeekly,
}: {
  notifBudget: { value: string; tone: "success" | "primary" | "muted" };
  notifOpportunites: { value: string; tone: "success" | "primary" | "muted" };
  notifObjectifs: { value: string; tone: "success" | "primary" | "muted" };
  notifWeekly: { value: string; tone: "success" | "primary" | "muted" };
}) {
  const items: SettingRow[] = [
    { label: "Alertes budget", value: notifBudget.value, tone: notifBudget.tone, iconPath: "M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" },
    { label: "Alertes opportunités", value: notifOpportunites.value, tone: notifOpportunites.tone, iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" },
    { label: "Alertes objectifs", value: notifObjectifs.value, tone: notifObjectifs.tone, iconPath: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" },
    { label: "Résumé hebdomadaire IA", value: notifWeekly.value, tone: notifWeekly.tone, iconPath: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z|M16 2v4|M8 2v4|M3 10h18" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Notifications
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Choisissez ce qui mérite votre attention
      </p>
      <SettingsList items={items} accent={C.amber} accentBg={C.amberBg} />
    </div>
  );
}

function ConfidentialiteCard({
  histIA,
  consentement,
}: {
  histIA: { value: string; tone: "success" | "primary" | "muted" };
  consentement: { value: string; tone: "success" | "primary" | "muted" };
}) {
  const items: SettingRow[] = [
    { label: "Mémoire IA", value: histIA.value, tone: histIA.tone, iconPath: "M3 12a9 9 0 1 0 9-9|M3 4v5h5|M12 8v4l3 2" },
    { label: "Chiffrement", value: "AES-256 (Supabase)", tone: "success", iconPath: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4" },
    { label: "Export des données", value: "Sur demande", tone: "primary", iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3" },
    { label: "Consentement analytique", value: consentement.value, tone: consentement.tone, iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Confidentialité
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Vos données restent les vôtres
      </p>
      <SettingsList items={items} accent={C.violet} accentBg={C.violetBg} />
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function SecuriteCard() {
  // Sécurité : 4 indicateurs qui requièrent l'admin Supabase (MFA factors,
  // sessions, devices). En attendant cette intégration, on affiche un
  // empty state honnête sur les 4 lignes pour ne pas mentir.
  const items: SettingRow[] = [
    { label: "Mot de passe", value: "Non disponible", tone: "muted", iconPath: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4" },
    { label: "Double authentification", value: "Non configurée", tone: "muted", iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4" },
    { label: "Sessions actives", value: "Non disponible", tone: "muted", iconPath: "M2 3h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M8 21h8|M12 17v4" },
    { label: "Appareils connectés", value: "Non disponible", tone: "muted", iconPath: "M5 2h14a2 2 0 0 1 2 2v16l-4-2-3 2-4-2-3 2-4-2V4a2 2 0 0 1 2-2z" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Sécurité
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre compte sous bonne garde
      </p>
      <SettingsList items={items} accent={C.success} accentBg={C.successBg} />
    </div>
  );
}

function AutomatisationsIACard({
  items,
  activeCount,
  total,
}: {
  items: Array<{
    label: string;
    iconPath: string;
    value: string;
    tone: "success" | "primary" | "muted";
  }>;
  activeCount: number | null;
  total: number;
}) {
  const badgeText =
    activeCount === null ? "Non configuré" : `${activeCount} / ${total} actives`;
  const badgeColor =
    activeCount === null
      ? C.textMuted
      : activeCount === total
        ? C.success
        : C.primary;
  const badgeBg =
    activeCount === null
      ? C.pageBg
      : activeCount === total
        ? C.successBg
        : C.primaryBg;
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Automatisations IA
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "1px 7px",
            fontSize: 9,
            fontWeight: 700,
            color: badgeColor,
            backgroundColor: badgeBg,
            borderRadius: 999,
            letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: badgeColor }} />
          {badgeText}
        </span>
      </div>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Fonctionnalités intelligentes actives
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => {
          const itemColor =
            it.tone === "success"
              ? C.success
              : it.tone === "primary"
                ? C.primary
                : C.textMuted;
          return (
            <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.primaryBg, flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: C.textDark, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.label}
              </span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: itemColor, flexShrink: 0 }}>
                {it.value}
              </span>
            </div>
          );
        })}
      </div>
      <Link
        href="/settings/memory"
        style={{
          marginTop: 6,
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: C.primaryBg,
          color: C.primary,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Gérer les automatisations
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function ConseilIACard({ title, body }: { title: string; body: string }) {
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
        {title}
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
        {body}
      </p>
      <Link
        href="/settings/memory"
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
          textDecoration: "none",
        }}
      >
        Optimiser mes paramètres
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ EDIT — Toggles notifications / emails ═══════════════
 *
 * Card pleine largeur hébergeant <SettingsPreferences> (client
 * component shadcn). Permet à l'utilisateur d'activer/désactiver les
 * 7 préférences en temps réel — chaque switch persiste via les server
 * actions setEmailWeeklySummary / setNotificationAlerts /
 * setEmailPreference / setAnalyticsOptOut.
 */

function EditPreferencesCard({
  settings,
}: {
  settings: SettingsRow | null;
}) {
  return (
    <section
      style={{
        padding: "20px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
      }}
    >
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Mes préférences
      </p>
      <p style={{ margin: "2px 0 14px 0", fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Notifications & emails
      </p>
      <SettingsPreferences
        weeklyEnabled={settings?.email_weekly_summary === true}
        alertsEnabled={settings?.notification_alerts === true}
        encouragementEnabled={settings?.email_encouragement === true}
        trialRemindersEnabled={settings?.email_trial_reminders !== false}
        goalMilestonesEnabled={settings?.email_goal_milestones === true}
        inactivityFollowupEnabled={settings?.email_inactivity_followup === true}
        analyticsEnabled={settings?.analytics_opt_out !== true}
      />
    </section>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter({ configPct }: { configPct: number | null }) {
  const hasPct = configPct !== null;
  const pctText = hasPct ? `${configPct} %` : "À compléter";
  const barWidth = hasPct ? `${Math.max(0, Math.min(100, configPct))}%` : "0%";
  const subtitle = !hasPct
    ? "Activez vos préférences pour exploiter pleinement Liberia."
    : configPct >= 80
      ? "Votre compte est prêt à exploiter l'ensemble des fonctionnalités Liberia."
      : "Quelques réglages restent à activer pour profiter pleinement de Liberia.";
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
          ⚙️
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Configuration du compte&nbsp;: <span style={{ fontVariantNumeric: "tabular-nums" }}>{pctText}</span>
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              {pctText}
            </span>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: 10, color: "rgba(255,255,255,0.7)", lineHeight: 1.2 }}>
            {subtitle}
          </p>
        </div>
      </div>
      <Link
        href="/settings/memory"
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
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Vérifier mes paramètres
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

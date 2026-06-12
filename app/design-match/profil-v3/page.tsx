/**
 * Phase 5.0 — /design-match/profil-v3
 *
 * Page Profil V3 — cockpit COMPTE UTILISATEUR aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que les 11 autres pages V3 verrouillées.
 *
 * Cette page n'est PAS une analyse financière — celle-ci vit
 * dans /design-match/mon-analyse-v3. Profil V3 = identité,
 * préférences, abonnement, documents, sécurité, paramètres.
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : ProfilHero (blanc) · CompletudeCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : InfosPersoCard · PreferencesCard · AbonnementCard
 *   Row 3 (1.2fr / 1fr / 1fr)  : DocumentsCard · SecuriteCard · ParametresRapidesCard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getFinanceData } from "@/lib/services/finance";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getMyUserMemory } from "@/lib/services/memory";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil — LIBERIA",
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

/* ═══════════════ TYPES & HELPERS ═══════════════ */

type FinanceProfile = Awaited<ReturnType<typeof getFinanceData>>["profile"];
type Subscription = Awaited<ReturnType<typeof getFinanceData>>["subscription"];

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
}> {
  if (!isSupabaseConfigured()) {
    return { settings: null, accountCreatedAt: null };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { settings: null, accountCreatedAt: null };
    }
    const { data } = await supabase
      .from("user_settings")
      .select(SETTINGS_COLS.join(","))
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      settings: (data as SettingsRow | null) ?? null,
      accountCreatedAt: user.created_at ?? null,
    };
  } catch (err) {
    console.error("[profil-v3] loadAccountData failed", err);
    return { settings: null, accountCreatedAt: null };
  }
}

function initialsFrom(fullName: string | null): string | null {
  if (!fullName) return null;
  const parts = fullName
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || null;
}

function formatLocale(locale: string | null): string {
  if (!locale) return "Non renseigné";
  const map: Record<string, string> = {
    "fr-CH": "Français (Suisse)",
    "fr-FR": "Français (France)",
    "fr": "Français",
    "en": "English",
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "de": "Deutsch",
    "de-CH": "Deutsch (Schweiz)",
    "it": "Italiano",
    "es": "Español",
    "pt": "Português",
  };
  return map[locale] ?? locale;
}

function formatCurrencyLabel(currency: string | null): string {
  if (!currency) return "Non renseigné";
  const map: Record<string, string> = {
    CHF: "CHF · Franc suisse",
    EUR: "EUR · Euro",
    USD: "USD · Dollar US",
    GBP: "GBP · Livre sterling",
  };
  return map[currency] ?? currency;
}

function formatCountry(country: string | null): string {
  if (!country) return "Non renseigné";
  const map: Record<string, string> = {
    CH: "Suisse",
    FR: "France",
    BE: "Belgique",
    LU: "Luxembourg",
    DE: "Allemagne",
    IT: "Italie",
    ES: "Espagne",
    PT: "Portugal",
    GB: "Royaume-Uni",
    US: "États-Unis",
    CA: "Canada",
  };
  return map[country] ?? country;
}

const MONTH_LABELS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = MONTH_LABELS_FR[d.getUTCMonth()];
  return `Membre depuis ${month} ${d.getUTCFullYear()}`;
}

function formatMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = MONTH_LABELS_FR[d.getUTCMonth()];
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${d.getUTCFullYear()}`;
}

function planLabel(sub: Subscription): string {
  if (sub.plan === "premium") return "LIBERIA Premium";
  return "Plan gratuit";
}

function planStatusBadge(
  sub: Subscription,
): { text: string; bg: "success" | "primary" | "amber" | "muted" } | null {
  if (sub.status === "active") return { text: "Premium actif", bg: "success" };
  if (sub.status === "trialing")
    return { text: "Essai en cours", bg: "primary" };
  if (sub.status === "past_due")
    return { text: "Paiement à régulariser", bg: "amber" };
  if (sub.status === "canceled" || sub.status === "incomplete_expired")
    return { text: "Plan inactif", bg: "muted" };
  return null;
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchProfilV3() {
  const [data, account, memory] = await Promise.all([
    getFinanceData(),
    loadAccountData(),
    getMyUserMemory(),
  ]);

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  /* ------------------------------------------------------------------ */
  /*  Agrégats profil                                                    */
  /* ------------------------------------------------------------------ */

  const profile: FinanceProfile = data.profile;
  const subscription: Subscription = data.subscription;
  const initials = initialsFrom(fullName);
  const memberSince = formatMemberSince(account.accountCreatedAt);
  const memberSinceShort = formatMonthYear(account.accountCreatedAt);

  // Calcul de complétude — basé uniquement sur les vrais champs
  // existants côté base. 8 critères × 100 / 8.
  const completionChecks = [
    !!profile.full_name,                       // 1. Nom
    !!profile.email,                           // 2. Email (toujours présent en théorie)
    !!profile.locale,                          // 3. Langue
    !!profile.currency,                        // 4. Devise
    !!profile.country,                         // 5. Pays
    !!data.financialProfile,                   // 6. Profil financier (onboarding)
    !!memory?.coaching_tone,                   // 7. Ton de coaching IA
    !!account.settings,                        // 8. Préférences notifications définies
  ];
  const completionFilled = completionChecks.filter(Boolean).length;
  const completionTotal = completionChecks.length;
  const completionPct =
    completionTotal > 0
      ? Math.round((completionFilled / completionTotal) * 100)
      : 0;

  // Préférences depuis user_settings
  const settings = account.settings;
  const notifChannels: string[] = [];
  if (settings?.email_weekly_summary) notifChannels.push("Email");
  if (settings?.notification_alerts) notifChannels.push("In-app");
  const notifValue =
    settings === null
      ? "Non configuré"
      : notifChannels.length > 0
        ? notifChannels.join(" + ")
        : "Désactivées";
  const weeklySummary = settings?.email_weekly_summary === true
    ? "Hebdomadaire"
    : settings?.email_weekly_summary === false
      ? "Désactivé"
      : "Non configuré";

  // Badge Premium dans le hero
  const isPremiumActive =
    subscription.plan === "premium" &&
    (subscription.status === "active" || subscription.status === "trialing");

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-prof-row] { grid-template-columns: 1fr !important; }
          [data-prof-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-prof-sidebar] { display: none !important; }
          [data-prof-content] { margin-left: 0 !important; }
          [data-prof-main] { padding: 0 16px 16px 16px !important; }
          [data-prof-topbar] { padding: 0 16px !important; }
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
        <div data-prof-sidebar>
          <Sidebar />
        </div>
        <div data-prof-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-prof-main
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
            <div data-prof-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <ProfilHero
                fullName={fullName}
                email={profile.email}
                country={profile.country}
                initials={initials}
                memberSince={memberSince}
                isPremium={isPremiumActive}
              />
              <CompletudeCard
                pct={completionPct}
                filled={completionFilled}
                total={completionTotal}
              />
            </div>
            <div data-prof-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <InfosPersoCard
                fullName={fullName}
                email={profile.email}
                country={profile.country}
              />
              <PreferencesCard
                locale={profile.locale}
                currency={profile.currency}
                notifValue={notifValue}
                weeklySummary={weeklySummary}
              />
              <AbonnementCard
                subscription={subscription}
                memberSinceShort={memberSinceShort}
              />
            </div>
            <div data-prof-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <DocumentsCard />
              <SecuriteCard />
              <ActiviteRecenteCard />
            </div>
            <MissionFooter pct={completionPct} />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Profil actif) ═══════════════ */

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
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" href="/design-match/profil-v3" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active />
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
      data-prof-topbar
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
          Gérez vos informations personnelles, vos préférences et votre sécurité.
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

function ProfilHero({
  fullName,
  email,
  country,
  initials,
  memberSince,
  isPremium,
}: {
  fullName: string | null;
  email: string;
  country: string | null;
  initials: string | null;
  memberSince: string | null;
  isPremium: boolean;
}) {
  const displayName = fullName ?? "Profil";
  const adresseLine = country ? formatCountry(country) : "Non renseigné";
  return (
    <div
      style={{
        padding: "14px 18px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        alignItems: "center",
        gap: 16,
        minHeight: 112,
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.02em",
            boxShadow: "0 6px 18px -6px rgba(245, 158, 11, 0.40)",
          }}
          aria-hidden
        >
          {initials ?? "—"}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.015em", lineHeight: 1.1 }}>
            {displayName}
          </p>
          {isPremium && (
            <span
              style={{
                padding: "1px 7px",
                fontSize: 9,
                fontWeight: 700,
                color: C.gold,
                backgroundColor: "#FFF8E1",
                borderRadius: 999,
                letterSpacing: "0.04em",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
              </svg>
              LIBERIA Premium
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16, rowGap: 3, fontSize: 10.5, color: C.textMuted }}>
          <InfoLine iconPath="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6">
            {email}
          </InfoLine>
          <InfoLine iconPath="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.93.37 1.85.7 2.73a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.35-1.35a2 2 0 0 1 2.11-.45c.88.33 1.8.57 2.73.7A2 2 0 0 1 22 16.92z">
            Téléphone : non renseigné
          </InfoLine>
          <InfoLine iconPath="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z">
            {adresseLine}
          </InfoLine>
          <InfoLine iconPath="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z|M16 2v4|M8 2v4|M3 10h18">
            {memberSince ?? "Date d'inscription non disponible"}
          </InfoLine>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ iconPath, children }: { iconPath: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
      </svg>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
    </div>
  );
}

function CompletudeCard({
  pct,
  filled,
  total,
}: {
  pct: number;
  filled: number;
  total: number;
}) {
  const R = 26;
  const C2 = 2 * Math.PI * R;
  const dash = (pct / 100) * C2;
  const missing = Math.max(0, total - filled);
  const remainingPct = 100 - pct;
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 112,
      }}
    >
      <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
        <svg width={68} height={68} viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={R} fill="none" stroke={C.primaryBg} strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={C.primary}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C2}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {pct}%
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Votre progression
        </p>
        <p style={{ margin: "2px 0 0 0", fontSize: 12.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
          Profil complété
        </p>
        <p style={{ margin: "2px 0 0 0", fontSize: 10, color: pct >= 100 ? C.success : C.textMuted, fontWeight: 600, lineHeight: 1.3 }}>
          {pct >= 100
            ? "Profil complet."
            : missing === 1
              ? `Plus que ${remainingPct} % pour compléter ton profil.`
              : `${filled} / ${total} étapes complétées.`}
        </p>
        <Link
          href="/settings/memory"
          style={{
            marginTop: 6,
            padding: "6px 10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            backgroundColor: C.navy,
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 8,
            textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          Compléter mon profil
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function InfosPersoCard({
  fullName,
  email,
  country,
}: {
  fullName: string | null;
  email: string;
  country: string | null;
}) {
  const items = [
    { label: "Nom complet", value: fullName ?? "Non renseigné", iconPath: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    { label: "Email", value: email || "Non renseigné", iconPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6" },
    { label: "Téléphone", value: "Non renseigné", iconPath: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.93.37 1.85.7 2.73a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.35-1.35a2 2 0 0 1 2.11-.45c.88.33 1.8.57 2.73.7A2 2 0 0 1 22 16.92z" },
    { label: "Pays", value: country ? formatCountry(country) : "Non renseigné", iconPath: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Informations personnelles
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Vos informations de base
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.cardBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.value}
              </p>
            </div>
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
          backgroundColor: C.primaryBg,
          color: C.primary,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Compléter mes informations
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      </Link>
    </div>
  );
}

function PreferencesCard({
  locale,
  currency,
  notifValue,
  weeklySummary,
}: {
  locale: string | null;
  currency: string | null;
  notifValue: string;
  weeklySummary: string;
}) {
  const items = [
    { label: "Langue", value: formatLocale(locale), iconPath: "M5 8h14|M5 12h14|M5 16h10" },
    { label: "Devise", value: formatCurrencyLabel(currency), iconPath: "M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
    { label: "Notifications", value: notifValue, iconPath: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9|M10.3 21a1.94 1.94 0 0 0 3.4 0" },
    { label: "Résumé hebdomadaire", value: weeklySummary, iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Préférences
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Personnalisez votre expérience
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.cardBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.violet} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.value}
              </p>
            </div>
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
          backgroundColor: C.violetBg,
          color: C.violet,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Gérer mes préférences
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function AbonnementCard({
  subscription,
  memberSinceShort,
}: {
  subscription: Subscription;
  memberSinceShort: string | null;
}) {
  const trialEnds = formatMonthYear(subscription.trial_ends_at);
  const items = [
    { label: "Plan actuel", value: planLabel(subscription), iconPath: "M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" },
    {
      label: "Statut",
      value:
        subscription.status === "active"
          ? "Actif"
          : subscription.status === "trialing"
            ? trialEnds
              ? `Essai jusqu'en ${trialEnds}`
              : "Essai en cours"
            : subscription.status === "past_due"
              ? "Paiement à régulariser"
              : subscription.status === "canceled"
                ? "Annulé"
                : "Non actif",
      iconPath:
        "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    },
    { label: "Parrainage", value: "Non disponible", iconPath: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M20 8v6|M23 11h-6" },
    { label: "Membre depuis", value: memberSinceShort ?? "Non disponible", iconPath: "M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z|M16 2v4|M8 2v4|M3 10h18" },
  ];
  const badge = planStatusBadge(subscription);
  const badgeFg =
    badge?.bg === "success"
      ? C.success
      : badge?.bg === "primary"
        ? C.primary
        : badge?.bg === "amber"
          ? C.amber
          : C.textMuted;
  const badgeBgColor =
    badge?.bg === "success"
      ? C.successBg
      : badge?.bg === "primary"
        ? C.primaryBg
        : badge?.bg === "amber"
          ? C.amberBg
          : C.pageBg;
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Abonnement
        </p>
        {badge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "1px 7px",
              fontSize: 9,
              fontWeight: 700,
              color: badgeFg,
              backgroundColor: badgeBgColor,
              borderRadius: 999,
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: badgeFg }} />
            {badge.text}
          </span>
        )}
      </div>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Votre formule Liberia
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.cardBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/settings/subscription"
        style={{
          marginTop: 6,
          padding: "5px 10px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          backgroundColor: "transparent",
          color: C.gold,
          fontSize: 10,
          fontWeight: 600,
          borderRadius: 7,
          border: `1px dashed ${C.amberBg}`,
          textDecoration: "none",
        }}
      >
        <span style={{ fontWeight: 700, color: C.textDark }}>
          Gérer mon abonnement
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function DocumentsCard() {
  // Aucun système de documents utilisateur n'existe aujourd'hui
  // (table user_documents + Supabase Storage à créer dans une phase
  // ultérieure). Empty state premium honnête.
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Documents
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Mes documents et rapports
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 4px",
          textAlign: "center",
          gap: 6,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Aucun document
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, maxWidth: 220 }}>
          Le stockage de documents (pièce d&apos;identité, rapports patrimoine, etc.) arrivera dans une prochaine phase.
        </p>
      </div>
      <Link
        href="/coach"
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
        Discuter avec mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function SecuriteCard() {
  // Sécurité : 4 indicateurs qui requièrent l'admin client Supabase
  // (MFA factors, sessions, appareils) ou un champ last_password_change
  // qui n'existe pas. En attendant cette intégration, empty state
  // honnête sur les 4 lignes pour ne pas mentir.
  const items = [
    { label: "Mot de passe", sub: "Non disponible", color: C.textMuted, bg: C.pageBg, iconPath: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4" },
    { label: "Authentification 2FA", sub: "Non configurée", color: C.textMuted, bg: C.pageBg, iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4" },
    { label: "Sessions actives", sub: "Non disponible", color: C.textMuted, bg: C.pageBg, iconPath: "M2 3h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z|M8 21h8|M12 17v4" },
    { label: "Appareils de confiance", sub: "Non disponible", color: C.textMuted, bg: C.pageBg, iconPath: "M5 2h14a2 2 0 0 1 2 2v16l-4-2-3 2-4-2-3 2-4-2V4a2 2 0 0 1 2-2z" },
  ];
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Sécurité
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Protégez votre compte
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
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/coach"
        style={{
          marginTop: 6,
          padding: "6px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: C.pageBg,
          color: C.textDark,
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        En parler à mon coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function ActiviteRecenteCard() {
  // Aucun log d'activité utilisateur n'est tracké aujourd'hui
  // (table user_activity_log à modéliser, ou élargir health_timeline).
  // Empty state honnête en attendant.
  return (
    <div style={{ padding: "13px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Activité récente
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Ce qui s&apos;est passé récemment sur votre compte
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 4px",
          textAlign: "center",
          gap: 6,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Aucune activité tracée
        </p>
        <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, maxWidth: 220 }}>
          L&apos;historique des actions de ton compte (mises à jour, objectifs, connexions) arrivera plus tard.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter({ pct }: { pct: number }) {
  const barWidth = `${Math.max(0, Math.min(100, pct))}%`;
  const subtitle =
    pct >= 100
      ? "Tu as tout configuré. Liberia est prête à t'accompagner."
      : pct >= 60
        ? "Complète les informations restantes pour une expérience optimale."
        : "Démarre en configurant tes préférences IA et tes notifications.";
  const headline =
    pct >= 100 ? "Profil complet" : `Profil complété à ${pct} %`;
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
          👤
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {headline}
          </p>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 420 }}>
              <div style={{ width: barWidth, height: "100%", backgroundColor: "white", borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
              {pct} %
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
        {pct >= 100 ? "Gérer mon profil" : "Compléter mon profil"}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

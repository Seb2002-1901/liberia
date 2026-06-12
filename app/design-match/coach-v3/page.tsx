/**
 * Phase 5.0 — /design-match/coach-v3
 * Phase 6.0 — branchement données live + composer/chips fonctionnels.
 *
 * Coach IA premium, langage visuel strictement aligné sur dashboard-v3.
 * Cette page sert de WELCOME / landing pour le coach :
 *   - si l'utilisateur a déjà une conversation → redirect vers
 *     /coach/{firstConversationId} (cohérent avec le comportement prod
 *     préservé dans app/(app)/coach/page.tsx avant cette migration).
 *   - sinon → rendu V3 avec composer + suggestions qui CRÉENT une
 *     nouvelle conversation (server action), puis redirect vers
 *     /coach/{newId} où l'utilisateur tape sa première question.
 *
 * Right rail branché aux vraies données : score FHS, agrégats finance,
 * priorité du moment (buildFirstMission).
 *
 * NB : les éléments du chat thread V3 (5 messages mockés avec score
 * 46/100, reste 9 107 CHF…) ont été remplacés par un empty state pour
 * ne JAMAIS afficher du fake data comme du réel.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { formatUserCurrency } from "@/lib/utils";
import { listConversations } from "@/lib/services/coach";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import type { DrawerData } from "@/lib/calculations/health/types";
import { createConversation } from "@/app/actions/conversations";

export const metadata: Metadata = {
  title: "Coach IA — LIBERIA",
};

export const dynamic = "force-dynamic";

/* ═══════════════ HELPERS ═══════════════ */

async function getCurrentAuthUser(): Promise<{
  id: string;
  created_at: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, created_at: user.created_at ?? null };
  } catch {
    return null;
  }
}

/** Server action exécutée par le composer + chaque suggestion chip.
 *  Crée une conversation vide puis redirige vers /coach/{id}.
 *  Le texte tapé est perdu (limitation MVP — cohérente avec la page
 *  welcome prod /coach/page.tsx historique). */
async function startConversationAction() {
  "use server";
  const res = await createConversation();
  if (res.ok) redirect(`/coach/${res.data.id}`);
  redirect("/coach");
}

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function DesignMatchCoachV3() {
  const [data, authedUser] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
  ]);

  // Si l'utilisateur a déjà une conversation, on saute directement
  // dessus (comportement prod préservé).
  if (!data.isDemo) {
    const conversations = await listConversations();
    if (conversations.length > 0) {
      redirect(`/coach/${conversations[0].id}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Agrégats finance pour le right rail                                */
  /* ------------------------------------------------------------------ */

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome,
    monthlyExpenses: totalExpenses,
  });
  const runway = calculateRunway({
    currentSavings,
    monthlyExpenses: totalExpenses,
  });

  /* ------------------------------------------------------------------ */
  /*  FHS drawer (pour SituationCard)                                    */
  /* ------------------------------------------------------------------ */

  let drawerData: DrawerData | null = null;
  if (authedUser?.id) {
    try {
      const extras = await gatherExtraSignals({
        userId: authedUser.id,
        financeData: data,
        accountCreatedAt: authedUser.created_at ?? null,
      });
      drawerData = await getOrSealDrawerData({
        userId: authedUser.id,
        financeData: data,
        extras,
      });
    } catch (err) {
      console.error("[coach-v3] FHS drawer compute failed", err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  First mission (priority + payload pour PrioriteMomentCard)         */
  /* ------------------------------------------------------------------ */

  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const MAJOR_AREAS = [
    "income",
    "housing",
    "insurance",
    "food",
    "transport",
  ] as const;
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;
  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: Number.isFinite(runway) ? runway : 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    monthlyIncome,
    recommendation: drawerData?.recommendation ?? null,
  });

  /* ------------------------------------------------------------------ */
  /*  i18n strings — résolus côté serveur                                */
  /* ------------------------------------------------------------------ */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tFirstMission = (await getTranslations(
    "dashboard.firstMission",
  )) as (key: string, values?: Record<string, string | number>) => string;
  const tBands = (await getTranslations(
    "dashboard.health.bands",
  )) as (key: string) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;
  const score = drawerData?.score.display ?? null;
  const scoreDelta = drawerData?.delta?.netDelta ?? null;
  const tierLabel = drawerData ? tBands(drawerData.score.band) : "—";
  const priorityTitle = tFirstMission(
    `${firstMission.priority}.title`,
    firstMission.payload,
  );

  return (
    <>
      <style>{`
        @media (max-width: 999px) {
          [data-coach-sidebar] { display: none !important; }
          [data-coach-content] { margin-left: 0 !important; }
          [data-coach-main] { grid-template-columns: 1fr !important; padding: 0 16px 16px 16px !important; }
          [data-coach-topbar] { padding: 0 16px !important; }
        }
      `}</style>
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: C.pageBg,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <div data-coach-sidebar><Sidebar /></div>
      <div data-coach-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <Topbar firstName={firstName} fullName={fullName} />
        <main
          data-coach-main
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
          <ChatColumn firstName={firstName} />
          <RightRail
            score={score}
            scoreDelta={scoreDelta}
            tierLabel={tierLabel}
            priorityTitle={priorityTitle}
            runway={runway}
            monthlyIncome={monthlyIncome}
            totalExpenses={totalExpenses}
            cashflow={cashflow}
            currentSavings={currentSavings}
            currency={data.profile.currency}
            profile={data.profile}
          />
        </main>
      </div>
    </div>
    </>
  );
}


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
          <NavItem label="Coach IA" href="/design-match/coach-v3" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" active />
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
  const displayName = firstName ?? "explorer";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-coach-topbar
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
          Votre conseiller IA est prêt à répondre à vos questions.
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
/* ═══════════════ CHAT COLUMN ═══════════════ */

function ChatColumn({ firstName }: { firstName: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, gap: 12 }}>
      <CoachHero />
      <EmptyChatWelcome firstName={firstName} />
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
        <form action={startConversationAction}>
          <button
            type="submit"
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
        </form>
      </div>
    </div>
  );
}

/* ═══════════════ EMPTY CHAT WELCOME (remplace ChatThread mock) ═══════════════ */

/** Audit zéro-tolérance : le ChatThread V3 original affichait 5 messages
 *  mockés ("Salut Sébastien", "46/100", "9 107 CHF/mois", etc.). On
 *  remplace par un empty state propre — le vrai chat vit sous
 *  /coach/[conversationId] et est rejoint dès que l'utilisateur démarre
 *  une conversation via le composer / chips ci-dessous. */
function EmptyChatWelcome({ firstName }: { firstName: string | null }) {
  const greet = firstName ?? "explorer";
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: "32px 22px",
        backgroundColor: C.cardBg,
        borderRadius: 18,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: C.primaryBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: C.textDark,
          fontFamily: "Outfit, Inter, system-ui",
          letterSpacing: "-0.01em",
        }}
      >
        Bonjour {greet}, prêt à démarrer&nbsp;?
      </h2>
      <p style={{ margin: 0, maxWidth: 480, fontSize: 13, color: C.textMuted, lineHeight: 1.55 }}>
        Posez une question dans le composer ci-dessous ou choisissez une
        suggestion pour démarrer votre première conversation avec le
        Coach IA. Vos échanges sont privés et basés sur vos données.
      </p>
    </div>
  );
}

/* ═══════════════ ANCIEN CHAT THREAD (référence design — non utilisé) ═══════════════ */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ChatThreadReference() {
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
  // Audit zéro-tolérance : chaque suggestion devient un form qui crée
  // une vraie conversation (server action) et redirige vers /coach/{id}.
  // Le texte de la suggestion n'est pas (encore) injecté comme premier
  // message — l'utilisateur retape sa question sur la page enfant.
  // Limitation documentée, à améliorer dans une phase ultérieure.
  const suggestions = [
    "Comment augmenter mon épargne ?",
    "Quels postes je dépense le plus ?",
    "Quelle est ma priorité financière ?",
    "Simuler un effort d'épargne",
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textLight, letterSpacing: "0.14em", textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
        Suggestions
      </span>
      {suggestions.map((s) => (
        <form key={s} action={startConversationAction}>
          <button
            type="submit"
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
        </form>
      ))}
    </div>
  );
}

/* ═══════════════ COMPOSER ═══════════════ */

function Composer() {
  // Audit zéro-tolérance : le composer est un vrai <form> qui crée
  // une conversation (server action) et redirige vers /coach/{id}.
  // Le textarea garde le placeholder explicite. Le texte n'est pas
  // injecté comme premier message (limitation MVP, cohérente avec la
  // page welcome prod historique app/(app)/coach/page.tsx).
  return (
    <form
      action={startConversationAction}
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
      <textarea
        name="message"
        rows={1}
        placeholder="Posez une question à votre conseiller…"
        style={{
          fontSize: 13.5,
          color: C.textDark,
          lineHeight: 1.5,
          padding: "6px 4px",
          minHeight: 24,
          outline: "none",
          fontFamily: "inherit",
          border: "none",
          resize: "none",
          width: "100%",
          backgroundColor: "transparent",
        }}
        aria-label="Saisir un message"
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
        <button
          type="submit"
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
          Démarrer la conversation
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ComposerActionReference({ iconPath, label }: { iconPath: string; label: string }) {
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

interface RightRailProps {
  score: number | null;
  scoreDelta: number | null;
  tierLabel: string;
  priorityTitle: string;
  runway: number;
  monthlyIncome: number;
  totalExpenses: number;
  cashflow: number;
  currentSavings: number;
  currency: string;
  profile: { currency: string; locale?: string | null; country?: string | null };
}

function RightRail(props: RightRailProps) {
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
      <SituationCard
        score={props.score}
        scoreDelta={props.scoreDelta}
        tierLabel={props.tierLabel}
      />
      <ResumeFinancierCard
        monthlyIncome={props.monthlyIncome}
        totalExpenses={props.totalExpenses}
        cashflow={props.cashflow}
        runway={props.runway}
        currentSavings={props.currentSavings}
        profile={props.profile}
      />
      <PrioriteMomentCard
        priorityTitle={props.priorityTitle}
        runway={props.runway}
      />
      <InsightsRapidesCard />
    </aside>
  );
}

function SituationCard({
  score,
  scoreDelta,
  tierLabel,
}: {
  score: number | null;
  scoreDelta: number | null;
  tierLabel: string;
}) {
  // Mini-ring : circumference 2π × 32 ≈ 201.06.
  // Ring 80 px, strokeWidth 7, glow drop-shadow alignés strictement sur
  // le ScoreCard du dashboard-v3.
  const r = 32;
  const c = 2 * Math.PI * r;
  const fraction = score !== null ? Math.max(0, Math.min(1, score / 100)) : 0;
  const offset = c * (1 - fraction);
  const deltaSign =
    scoreDelta === null
      ? "none"
      : scoreDelta === 0
        ? "flat"
        : scoreDelta > 0
          ? "up"
          : "down";
  const deltaBadge =
    deltaSign === "up"
      ? { label: `+${Math.round(scoreDelta!)} pts`, color: "#5EEAD4", bg: "rgba(16, 163, 127, 0.18)" }
      : deltaSign === "down"
        ? { label: `${Math.round(scoreDelta!)} pts`, color: "#FBBF24", bg: "rgba(251, 191, 36, 0.18)" }
        : null;
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
              {score ?? "—"}
            </text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{tierLabel}</p>
          <p style={{ margin: "2px 0 0 0", fontSize: 18, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em" }}>
            {score !== null ? `${score} / 100` : "—"}
          </p>
          {deltaBadge && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 6,
                padding: "2px 7px",
                borderRadius: 999,
                backgroundColor: deltaBadge.bg,
                fontSize: 10,
                fontWeight: 700,
                color: deltaBadge.color,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 6 23 6 23 12" />
                <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
              </svg>
              {deltaBadge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeFinancierCard({
  monthlyIncome,
  totalExpenses,
  cashflow,
  runway,
  currentSavings,
  profile,
}: {
  monthlyIncome: number;
  totalExpenses: number;
  cashflow: number;
  runway: number;
  currentSavings: number;
  profile: { currency: string; locale?: string | null; country?: string | null };
}) {
  // Audit zéro-tolérance : 4 lignes branchées aux vraies données.
  // Si aucun revenu/dépense renseigné, on affiche "—" plutôt qu'une
  // valeur factice (cohérent avec KpiCard du dashboard-v3).
  const fmt = (v: number) => formatUserCurrency(v, profile);
  const runwayFinite = Number.isFinite(runway);
  const rows = [
    {
      label: "Revenus mensuels",
      value: monthlyIncome > 0 ? fmt(monthlyIncome) : "—",
      color: C.success,
      bg: C.successBg,
      iconPath: "M12 5v14|M5 12l7-7 7 7",
    },
    {
      label: "Dépenses mensuelles",
      value: totalExpenses > 0 ? fmt(totalExpenses) : "—",
      color: "#DC2626",
      bg: "#FEE2E2",
      iconPath: "M12 19V5|M5 12l7 7 7-7",
    },
    {
      label: "Reste à vivre",
      value:
        monthlyIncome > 0 || totalExpenses > 0 ? fmt(cashflow) : "—",
      color: C.primary,
      bg: C.primaryBg,
      iconPath: "M21 12h-7|M14 8l7 4-7 4",
    },
    {
      label: "Fonds d'urgence",
      value: runwayFinite ? `${Math.max(0, runway).toFixed(1)} mois` : "∞",
      sub:
        currentSavings > 0
          ? `${fmt(currentSavings)} disponibles`
          : "0 disponibles",
      color: C.amber,
      bg: C.amberBg,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
  ] as Array<{
    label: string;
    value: string;
    sub?: string;
    color: string;
    bg: string;
    iconPath: string;
  }>;
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

function PrioriteMomentCard({
  priorityTitle,
  runway,
}: {
  priorityTitle: string;
  runway: number;
}) {
  // Audit zéro-tolérance : titre depuis dashboard.firstMission.<priority>.title
  // (résolu côté serveur). Runway en mois sur 3 mois cible.
  const TARGET = 3;
  const runwayFinite = Number.isFinite(runway);
  const runwayValue = runwayFinite ? Math.max(0, runway) : Infinity;
  const ratio = runwayFinite ? Math.min(1, runwayValue / TARGET) : 1;
  const pct = Math.max(2, Math.round(ratio * 100));
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
        {priorityTitle}
      </h3>
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
            {runwayFinite ? runwayValue.toFixed(1) : "∞"}
          </span>
          <span style={{ fontSize: 13, color: C.textLight, fontWeight: 500, fontFamily: "Outfit, Inter, system-ui" }}>
            / {TARGET}.0
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
          {pct} % atteint
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
        aria-valuenow={runwayFinite ? Math.round(runwayValue * 10) / 10 : TARGET}
        aria-valuemin={0}
        aria-valuemax={TARGET}
      >
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: C.coral, borderRadius: 999 }} />
      </div>
      <Link
        href="/plan"
        style={{
          marginTop: 10,
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12.5,
          fontWeight: 500,
          color: C.primary,
          textDecoration: "none",
        }}
      >
        Planifier avec le coach
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function InsightsRapidesCard() {
  // Audit zéro-tolérance : chaque action devient un vrai Link vers une
  // page prod fonctionnelle (plan, dashboard, goals).
  const insights = [
    {
      title: "Voir mon plan d'action",
      detail: "30/60/90 jours personnalisés",
      href: "/plan",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M22 7L13.5 15.5 8.5 10.5 2 17|M17 7 22 7 22 12",
    },
    {
      title: "Analyser mes dépenses",
      detail: "Vue détaillée par catégorie",
      href: "/expenses",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3",
    },
    {
      title: "Définir un objectif",
      detail: "Fixer un nouvel horizon",
      href: "/goals",
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
          <Link
            key={it.title}
            href={it.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              textAlign: "left",
              textDecoration: "none",
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
          </Link>
        ))}
      </div>
    </div>
  );
}

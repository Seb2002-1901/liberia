/**
 * /coach/[id] — conversation IA réelle, cockpit V3 strict.
 *
 * Phase Stabilisation visuelle V3 (route 1/4) : la page passe d'un
 * V3Shell wrappant <CoachChat> shadcn vers un cockpit V3 strict
 * IDENTIQUE à /design-match/coach-v3 (landing).
 *
 * Structure :
 *  - Sidebar V3 inline 280 px (PRINCIPAL / FINANCES / CROISSANCE /
 *    PLUS, "Coach IA" actif)
 *  - Topbar V3 inline 68 px (Bonjour {prénom}, avatar → /profile)
 *  - MobileNav (hamburger < 999 px)
 *  - Layout 2 colonnes : ChatColumn (Hero + Thread V3 client +
 *    PrivacyFooter) + RightRail (Situation FHS + Résumé financier +
 *    Priorité du moment + Actions rapides)
 *
 * Préservation backend :
 *  - getConversation(id) → messages réels persistés
 *  - getMyUserMemory() + deriveQuickPrompts() → suggestions
 *  - getOrSealDrawerData() → score FHS réel
 *  - buildFirstMission() → priorité réelle
 *  - <CoachConversationV3Client> reprend toute la logique de
 *    <CoachChat> (fetch SSE, scroll multi-stage, expense confirm
 *    cards, abort sur unmount, premium gate serveur)
 *  - /api/ai/chat + confirmProposedExpenseAction intouchés
 *
 * Auth + redirect onboarding reproduits ici (page hors (app)/ pour
 * bypasser l'ancien AppShell).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getConversation, listConversations } from "@/lib/services/coach";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { getMyUserMemory } from "@/lib/services/memory";
import { createClient } from "@/lib/supabase/server";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import {
  calculateNetCashflow,
  calculateRunway,
} from "@/lib/calculations/finance";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import {
  deriveQuickPrompts,
  type QuickPromptCategory,
} from "@/lib/coach/quick-prompts";
import { formatUserCurrency } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { startNewConversationAction } from "@/app/actions/coach-landing";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CoachConversationV3Client } from "@/components/coach/v3-conversation-client";
import type { DrawerData } from "@/lib/calculations/health/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.coach.metadata");
  return { title: t("title") };
}

/* ═══════════════ TOKENS V3 (identiques coach-v3) ═══════════════ */

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
  success: "#10A37F",
  successBg: "#ECFDF5",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  gold: "#FBBF24",
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
  rightCardGap: 12,
};

const MAJOR_AREAS = [
  "income",
  "housing",
  "insurance",
  "food",
  "transport",
] as const;

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

function formatMoney(
  amount: number,
  profile: {
    currency?: string | null;
    locale?: string | null;
    country?: string | null;
  },
): string {
  return formatUserCurrency(amount, profile);
}

type CoachWired = {
  scoreDisplay: number | null;
  scoreDelta: number | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  hasIncome: boolean;
  hasExpenses: boolean;
  currentSavings: number;
  runwayMonths: number | null;
  emergencyTargetMonths: number;
  emergencyTargetAmount: number | null;
  emergencyCoveragePct: number | null;
  priorityTitle: string;
  priorityHref: string;
  priorityKind:
    | "no_goal"
    | "low_resilience"
    | "incomplete_expenses"
    | "fhs_recommendation"
    | "none";
  currency: string;
  locale: string | null;
  country: string | null;
};

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoachConversationPage({ params }: PageProps) {
  const { id } = await params;

  // Auth + onboarding (reproduits car hors (app)/)
  const [data, authedUser, memory, conversations] = await Promise.all([
    getFinanceData(),
    getCurrentAuthUser(),
    getMyUserMemory(),
    listConversations(),
  ]);
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const tSuggestions = await getTranslations("app.coach.chat.suggestions");

  // Agrégats finance — alignés sur coach-v3 / plan-v3 / dashboard-v3
  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const monthlyExpenses = fixedExpenses + variableExpenses;
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const runwayRaw = calculateRunway({ currentSavings, monthlyExpenses });
  const runwayMonths =
    Number.isFinite(runwayRaw) && monthlyExpenses > 0 ? runwayRaw : null;
  const emergencyTargetMonths = 3;
  const emergencyTargetAmount =
    monthlyExpenses > 0 ? monthlyExpenses * emergencyTargetMonths : null;
  const emergencyCoveragePct =
    emergencyTargetAmount !== null && emergencyTargetAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((currentSavings / emergencyTargetAmount) * 100),
          ),
        )
      : null;

  // FHS drawer
  let drawerData: DrawerData | null = null;
  if (!data.isDemo && authedUser?.id) {
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
      console.error("[coach/[id]] FHS drawer compute failed", err);
    }
  }

  // Mission
  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;
  const firstMission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: runwayMonths ?? 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    monthlyIncome,
    recommendation: drawerData?.recommendation ?? null,
  });

  // i18n priority title
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const tPriority = (await getTranslations(
    "dashboard.priorityCard.title",
  )) as (key: string) => string;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const priorityTitle = tPriority(firstMission.priority);

  // Suggestions
  const suggestions = deriveQuickPrompts(
    {
      financialProfile: data.financialProfile,
      memory,
      monthlyIncome,
      monthlyExpenses,
      hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
    },
    (category: QuickPromptCategory) =>
      tSuggestions.raw(category) as readonly string[],
  );

  // Eslint silencieux (cohérence inter-pages V3)
  void variableExpenses;

  const firstName = data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;
  const recentConversationsCount = conversations.length;
  const recentOtherConversationId =
    conversations.find((c) => c.id !== id)?.id ?? null;

  const wired: CoachWired = {
    scoreDisplay: drawerData?.score.display ?? null,
    scoreDelta: drawerData?.delta?.netDelta ?? null,
    monthlyIncome,
    monthlyExpenses,
    cashflow,
    hasIncome: monthlyIncome > 0,
    hasExpenses: monthlyExpenses > 0,
    currentSavings,
    runwayMonths,
    emergencyTargetMonths,
    emergencyTargetAmount,
    emergencyCoveragePct,
    priorityTitle,
    priorityHref: firstMission.ctaHref,
    priorityKind: firstMission.priority,
    currency: data.profile.currency,
    locale: data.profile.locale ?? null,
    country: data.profile.country ?? null,
  };

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-coachid-main] { padding: 0 20px 12px 20px !important; }
        }
        @media (max-width: 999px) {
          [data-coachid-sidebar] { display: none !important; }
          [data-coachid-content] { margin-left: 0 !important; }
          [data-coachid-main] { grid-template-columns: 1fr !important; padding: 0 16px 16px 16px !important; }
          [data-coachid-rail] { display: none !important; }
          [data-coachid-topbar] { padding: 0 16px !important; }
        }
      `}</style>
      <MobileNav />
      <div
        style={{
          display: "flex",
          // dvh : iOS Safari adapte à la hauteur réelle. Fallback
          // 100vh pour browsers anciens (Safari < 15.4).
          height: "100vh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-coachid-sidebar>
          <Sidebar />
        </div>
        <div
          data-coachid-content
          style={{
            marginLeft: 280,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-coachid-main
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
            <ChatColumn
              conversationId={id}
              initialMessages={conversation.messages}
              isDemo={data.isDemo}
              suggestions={suggestions}
              recentOtherConversationId={recentOtherConversationId}
              recentConversationsCount={recentConversationsCount}
              conversationTitle={conversation.title}
            />
            <div data-coachid-rail>
              <RightRail wired={wired} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ CHAT COLUMN ═══════════════ */

function ChatColumn({
  conversationId,
  initialMessages,
  isDemo,
  suggestions,
  recentOtherConversationId,
  recentConversationsCount,
  conversationTitle,
}: {
  conversationId: string;
  initialMessages: Awaited<ReturnType<typeof getConversation>> extends infer T
    ? T extends { messages: infer M }
      ? M
      : never
    : never;
  isDemo: boolean;
  suggestions: readonly string[];
  recentOtherConversationId: string | null;
  recentConversationsCount: number;
  conversationTitle: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        gap: 12,
      }}
    >
      <CoachHero
        title={conversationTitle}
        recentOtherConversationId={recentOtherConversationId}
        recentConversationsCount={recentConversationsCount}
      />
      <CoachConversationV3Client
        conversationId={conversationId}
        initialMessages={initialMessages}
        isDemo={isDemo}
        suggestions={suggestions}
      />
      <PrivacyFooter />
    </div>
  );
}

function CoachHero({
  title,
  recentOtherConversationId,
  recentConversationsCount,
}: {
  title: string;
  recentOtherConversationId: string | null;
  recentConversationsCount: number;
}) {
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 280,
          }}
          title={title}
        >
          {title}
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
        {recentOtherConversationId !== null && (
          <Link
            href={`/coach/${recentOtherConversationId}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12.5,
              fontWeight: 500,
              color: C.textMuted,
              padding: "6px 8px",
              textDecoration: "none",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Précédente
            {recentConversationsCount > 2 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10.5,
                  color: C.textLight,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ({recentConversationsCount - 1})
              </span>
            )}
          </Link>
        )}
        <form action={startNewConversationAction}>
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
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

function PrivacyFooter() {
  return (
    <p
      style={{
        height: 24,
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
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      Vos échanges restent privés. Le Coach IA s&apos;appuie sur vos données
      et n&apos;est pas un conseil financier réglementé.
    </p>
  );
}

/* ═══════════════ SIDEBAR V3 (Coach IA actif) ═══════════════ */

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "20px 24px 20px 24px",
        }}
      >
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
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span
          style={{
            color: C.navy,
            letterSpacing: "0.16em",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          LIBERIA
        </span>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        <NavSection title="PRINCIPAL">
          <NavItem
            label="Tableau de bord"
            href="/design-match/dashboard-v3"
            iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22"
          />
          <NavItem
            label="Coach IA"
            href="/design-match/coach-v3"
            iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            active
          />
          <NavItem
            label="Mon analyse"
            href="/design-match/mon-analyse-v3"
            iconPath="M22 12h-4l-3 9L9 3l-3 9H2"
          />
          <NavItem
            label="Plan d'action"
            href="/design-match/plan-v3"
            iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem
            label="Revenus"
            href="/design-match/revenus-v3"
            iconCircle
            iconPath="M12 5v14|M5 12l7-7 7 7"
          />
          <NavItem
            label="Dépenses"
            href="/design-match/depenses-v3"
            iconCircle
            iconPath="M12 19V5|M5 12l7 7 7-7"
          />
          <NavItem
            label="Budget"
            href="/design-match/budget-v3"
            iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z"
          />
          <NavItem
            label="Objectifs"
            href="/design-match/objectifs-v3"
            iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15"
          />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem
            label="Épargne"
            href="/design-match/epargne-v3"
            iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z"
          />
          <NavItem
            label="Investissements"
            href="/design-match/investissements-v3"
            iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z"
          />
          <NavItem
            label="Opportunités"
            href="/design-match/opportunites-v3"
            iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z"
          />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem
            label="Paramètres"
            href="/design-match/parametres-v3"
            iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
          />
          <NavItem
            label="Profil"
            href="/design-match/profil-v3"
            iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
          />
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
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.textDark,
                letterSpacing: "0.04em",
              }}
            >
              LIBERIA PREMIUM
            </span>
          </div>
          <p
            style={{
              marginTop: 8,
              fontSize: 11.5,
              color: C.textMuted,
              lineHeight: 1.45,
            }}
          >
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

function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          padding: "8px 12px 6px 12px",
          fontSize: 10.5,
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
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke={active ? "white" : C.textMuted}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {iconCircle && <circle cx="12" cy="12" r="10" />}
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
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

/* ═══════════════ TOPBAR V3 ═══════════════ */

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
      data-coachid-topbar
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
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.textDark,
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Bonjour {displayName}{" "}
          <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: C.textMuted,
            margin: "4px 0 0 0",
          }}
        >
          Votre conseiller IA est prêt à répondre à vos questions.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.textMuted}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

/* ═══════════════ RIGHT RAIL V3 ═══════════════ */

function RightRail({ wired }: { wired: CoachWired }) {
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
      <SituationCard wired={wired} />
      <ResumeFinancierCard wired={wired} />
      <PrioriteMomentCard wired={wired} />
      <InsightsRapidesCard />
    </aside>
  );
}

function SituationCard({ wired }: { wired: CoachWired }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const scoreRatio =
    wired.scoreDisplay !== null
      ? Math.min(1, Math.max(0, wired.scoreDisplay / 100))
      : 0;
  const offset = c * (1 - scoreRatio);
  const scoreText =
    wired.scoreDisplay !== null ? String(wired.scoreDisplay) : "—";
  const scoreLabel =
    wired.scoreDisplay !== null
      ? `${wired.scoreDisplay} / 100`
      : "Score en construction";
  const delta = wired.scoreDelta;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 14,
          position: "relative",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 80,
            height: 80,
            position: "relative",
          }}
        >
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
          <svg
            viewBox="0 0 80 80"
            width={80}
            height={80}
            style={{ position: "relative" }}
          >
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="7"
            />
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
              style={{
                filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))",
              }}
            />
            <text
              x="40"
              y="46"
              textAnchor="middle"
              fontSize="22"
              fontWeight="700"
              fill="white"
              fontFamily="Outfit, Inter, system-ui"
              letterSpacing="-0.025em"
            >
              {scoreText}
            </text>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Score actuel
          </p>
          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
            }}
          >
            {scoreLabel}
          </p>
          {delta !== null && delta !== 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 6,
                padding: "2px 7px",
                borderRadius: 999,
                backgroundColor:
                  delta > 0
                    ? "rgba(16, 163, 127, 0.18)"
                    : "rgba(249, 119, 87, 0.18)",
                fontSize: 10,
                fontWeight: 700,
                color: delta > 0 ? "#5EEAD4" : "#FCA889",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {delta > 0 ? (
                  <>
                    <polyline points="17 6 23 6 23 12" />
                    <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
                  </>
                ) : (
                  <>
                    <polyline points="17 18 23 18 23 12" />
                    <polyline points="22 18 13.5 9.5 8.5 14.5 1 7" />
                  </>
                )}
              </svg>
              {delta > 0 ? "+" : ""}
              {delta} pts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeFinancierCard({ wired }: { wired: CoachWired }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };
  const cashflowColor = wired.cashflow >= 0 ? C.primary : "#DC2626";
  const cashflowBg = wired.cashflow >= 0 ? C.primaryBg : "#FEE2E2";
  const rows = [
    {
      label: "Revenus mensuels",
      value: wired.hasIncome
        ? formatMoney(wired.monthlyIncome, profile)
        : "Non renseigné",
      color: wired.hasIncome ? C.success : C.textLight,
      bg: wired.hasIncome ? C.successBg : C.borderGhost,
      iconPath: "M12 5v14|M5 12l7-7 7 7",
    },
    {
      label: "Dépenses mensuelles",
      value: wired.hasExpenses
        ? formatMoney(wired.monthlyExpenses, profile)
        : "Non renseignées",
      color: wired.hasExpenses ? "#DC2626" : C.textLight,
      bg: wired.hasExpenses ? "#FEE2E2" : C.borderGhost,
      iconPath: "M12 19V5|M5 12l7 7 7-7",
    },
    {
      label: "Reste à vivre",
      value:
        wired.hasIncome && wired.hasExpenses
          ? formatMoney(wired.cashflow, profile)
          : "Données insuffisantes",
      color: wired.hasIncome && wired.hasExpenses ? cashflowColor : C.textLight,
      bg: wired.hasIncome && wired.hasExpenses ? cashflowBg : C.borderGhost,
      iconPath: "M21 12h-7|M14 8l7 4-7 4",
    },
    {
      label: "Fonds d'urgence",
      value:
        wired.runwayMonths !== null
          ? `${wired.runwayMonths.toFixed(1)} mois`
          : "—",
      sub:
        wired.currentSavings > 0
          ? `${formatMoney(wired.currentSavings, profile)} disponibles`
          : wired.runwayMonths === null
            ? "Renseignez vos dépenses pour calculer"
            : "Aucune épargne renseignée",
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
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Résumé financier
      </p>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={row.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {row.iconPath.split("|").map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  color: C.textMuted,
                  lineHeight: 1.3,
                }}
              >
                {row.label}
              </p>
              <p
                style={{
                  margin: "1px 0 0 0",
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.textDark,
                  fontFamily: "Outfit, Inter, system-ui",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {row.value}
              </p>
              {row.sub && (
                <p
                  style={{
                    margin: "1px 0 0 0",
                    fontSize: 10.5,
                    color: C.textLight,
                    lineHeight: 1.3,
                  }}
                >
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

function PrioriteMomentCard({ wired }: { wired: CoachWired }) {
  const profile = {
    currency: wired.currency,
    locale: wired.locale,
    country: wired.country,
  };
  const showRunwayPattern = wired.priorityKind === "low_resilience";
  const runway = wired.runwayMonths;
  const coveragePct = wired.emergencyCoveragePct ?? 0;
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
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.coral}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.textMuted,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
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
        {wired.priorityTitle}
      </h3>
      {showRunwayPattern && wired.hasExpenses ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: 10,
              gap: 8,
            }}
          >
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
                {runway !== null ? runway.toFixed(1) : "—"}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: C.textLight,
                  fontWeight: 500,
                  fontFamily: "Outfit, Inter, system-ui",
                }}
              >
                / {wired.emergencyTargetMonths.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  marginLeft: 3,
                }}
              >
                mois
              </span>
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
              {coveragePct} % atteint
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
            aria-valuenow={coveragePct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                width: `${coveragePct}%`,
                height: "100%",
                backgroundColor: C.coral,
                borderRadius: 999,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: 10.5,
              color: C.textLight,
            }}
          >
            <span>{formatMoney(wired.currentSavings, profile)}</span>
            <span>
              Cible{" "}
              {wired.emergencyTargetAmount !== null
                ? formatMoney(wired.emergencyTargetAmount, profile)
                : "—"}
            </span>
          </div>
        </>
      ) : (
        <p
          style={{
            margin: "10px 0 0 0",
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.45,
          }}
        >
          {wired.priorityKind === "no_goal"
            ? "Définissez un premier objectif pour donner une direction à votre épargne."
            : wired.priorityKind === "incomplete_expenses"
              ? "Complétez vos charges principales pour fiabiliser votre score."
              : wired.priorityKind === "fhs_recommendation"
                ? "Une action ciblée a été identifiée par votre conseiller IA."
                : "Vos fondations sont solides. Place à l'optimisation continue."}
        </p>
      )}
      <Link
        href={wired.priorityHref}
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
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

function InsightsRapidesCard() {
  const insights: {
    title: string;
    detail: string;
    href: string;
    bg: string;
    color: string;
    iconPath: string;
  }[] = [
    {
      title: "Voir mon plan d'action",
      detail: "Étapes concrètes en cours",
      href: "/plan",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M22 7L13.5 15.5 8.5 10.5 2 17|M17 7 22 7 22 12",
    },
    {
      title: "Analyser mes dépenses",
      detail: "Comprendre et optimiser",
      href: "/design-match/depenses-v3",
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
      iconPath:
        "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M12 6v6l4 2",
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
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Actions rapides
      </p>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {insights.map((it, idx) => (
          <Link
            key={it.title}
            href={it.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderTop:
                idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              textDecoration: "none",
              color: "inherit",
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={it.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {it.iconPath.split("|").map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.textDark,
                  lineHeight: 1.3,
                }}
              >
                {it.title}
              </p>
              <p
                style={{
                  margin: "1px 0 0 0",
                  fontSize: 11,
                  color: C.textMuted,
                  lineHeight: 1.3,
                }}
              >
                {it.detail}
              </p>
            </div>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.textLight}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

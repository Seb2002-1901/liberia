/**
 * /coach/[id] — conversation IA réelle (CoachChat client component).
 *
 * Migrée hors de (app)/ pour bypasser l'ancien AppShell et utiliser
 * le shell V3 inline (V3Shell). "Coach IA" est marqué actif dans la
 * sidebar. La logique métier (getConversation, deriveQuickPrompts,
 * CoachChat) est strictement préservée.
 *
 * L'auth + redirect onboarding (faits autrefois par (app)/layout.tsx)
 * sont reproduits ici comme pour /settings/subscription.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoachChat } from "@/components/coach/coach-chat";
import { getConversation } from "@/lib/services/coach";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { getMyUserMemory } from "@/lib/services/memory";
import {
  deriveQuickPrompts,
  type QuickPromptCategory,
} from "@/lib/coach/quick-prompts";
import { V3Shell } from "@/components/layout/v3-shell";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.coach.metadata");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoachConversationPage({ params }: PageProps) {
  const { id } = await params;

  // Reproduit la garde de (app)/layout.tsx.
  const data = await getFinanceData();
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const [memory, tSuggestions] = await Promise.all([
    getMyUserMemory(),
    getTranslations("app.coach.chat.suggestions"),
  ]);

  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const monthlyExpenses =
    totalMonthly(data.expenses) || data.financialProfile?.monthly_expenses || 0;

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

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <V3Shell
      firstName={firstName}
      fullName={fullName}
      activeHref="/design-match/coach-v3"
      topbarSubtitle="Votre conseiller IA est prêt à répondre à vos questions."
    >
      <CoachChat
        conversationId={id}
        initialMessages={conversation.messages}
        isDemo={data.isDemo}
        suggestions={suggestions}
      />
    </V3Shell>
  );
}

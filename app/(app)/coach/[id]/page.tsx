import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoachChat } from "@/components/coach/coach-chat";
import { getConversation } from "@/lib/services/coach";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { getMyUserMemory } from "@/lib/services/memory";
import {
  deriveQuickPrompts,
  type QuickPromptCategory,
} from "@/lib/coach/quick-prompts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.coach.metadata");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoachConversationPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const [data, memory, tSuggestions] = await Promise.all([
    getFinanceData(),
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

  return (
    <CoachChat
      conversationId={id}
      initialMessages={conversation.messages}
      isDemo={data.isDemo}
      suggestions={suggestions}
    />
  );
}

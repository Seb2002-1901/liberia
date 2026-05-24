import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachChat } from "@/components/coach/coach-chat";
import { getConversation } from "@/lib/services/coach";
import { getFinanceData } from "@/lib/services/finance";
import { isAnthropicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Coach IA",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CoachConversationPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) notFound();

  const data = await getFinanceData();

  return (
    <CoachChat
      conversationId={id}
      initialMessages={conversation.messages}
      isAiConfigured={isAnthropicConfigured()}
      isDemo={data.isDemo}
    />
  );
}

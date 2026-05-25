import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquarePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listConversations } from "@/lib/services/coach";
import { getFinanceData } from "@/lib/services/finance";
import { isAnthropicConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Coach IA",
};

export default async function CoachIndexPage() {
  const data = await getFinanceData();

  // If user has existing conversations, jump to the most recent.
  if (!data.isDemo) {
    const conversations = await listConversations();
    if (conversations.length > 0) {
      redirect(`/coach/${conversations[0].id}`);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
      >
        <Sparkles className="h-6 w-6" />
      </span>
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Bienvenue dans ton coach IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Discute en français de tes finances. Le coach LIBERIA s'appuie sur tes
          revenus, dépenses et objectifs pour te proposer des actions concrètes —
          calmement, sans jargon, sans promesse.
        </p>
      </div>

      {data.isDemo ? (
        <Button asChild variant="gold" size="lg">
          <Link href="/register">
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : isAnthropicConfigured() ? (
        <NewConversationCta />
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.06)] via-card/40 to-card/40 p-5 text-left shadow-[0_30px_80px_-40px_hsl(var(--gold)/0.35)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--gold))]">
            Activation en cours
          </p>
          <p className="mt-2 text-sm font-medium">
            Le coach IA arrive bientôt.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            On finalise l&apos;activation de l&apos;assistant. Tu pourras
            discuter avec lui de tes finances dès qu&apos;il sera prêt.
          </p>
        </div>
      )}
    </div>
  );
}

function NewConversationCta() {
  return (
    <form
      action={async () => {
        "use server";
        const { createConversation } = await import("@/app/actions/conversations");
        const res = await createConversation();
        if (res.ok) redirect(`/coach/${res.data.id}`);
        redirect("/coach");
      }}
    >
      <Button type="submit" variant="gold" size="lg">
        <MessageSquarePlus className="h-4 w-4" />
        Démarrer une conversation
      </Button>
    </form>
  );
}

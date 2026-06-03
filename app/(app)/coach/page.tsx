import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MessageSquarePlus, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { listConversations } from "@/lib/services/coach";
import { getFinanceData } from "@/lib/services/finance";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.coach.metadata");
  return { title: t("title") };
}

export default async function CoachIndexPage() {
  const t = await getTranslations("app.coach");
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
          {t("welcomeTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("welcomeBody")}</p>
      </div>

      {data.isDemo ? (
        <Button asChild variant="gold" size="lg">
          <Link href="/register">
            {t("createAccount")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <NewConversationCta label={t("newConversation")} />
      )}
    </div>
  );
}

function NewConversationCta({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server";
        const { createConversation } = await import(
          "@/app/actions/conversations"
        );
        const res = await createConversation();
        if (res.ok) redirect(`/coach/${res.data.id}`);
        redirect("/coach");
      }}
    >
      <Button type="submit" variant="gold" size="lg">
        <MessageSquarePlus className="h-4 w-4" />
        {label}
      </Button>
    </form>
  );
}

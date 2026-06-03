import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProactiveHint } from "@/lib/coach/proactive";

interface ProactiveCoachCardProps {
  hint: ProactiveHint;
}

export async function ProactiveCoachCard({ hint }: ProactiveCoachCardProps) {
  const t = await getTranslations("dashboard.proactiveCard");
  const headline = t(hint.headlineKey, hint.params);
  const body = hint.bodyKey ? t(hint.bodyKey, hint.params) : null;
  const actionLabel = t(hint.action.labelKey);
  return (
    <Card className="border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--gold)/0.04)]">
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
              {t("eyebrow")}
            </p>
            <p className="mt-1 text-sm font-medium leading-snug">{headline}</p>
            {body && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {body}
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={hint.action.href}>
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

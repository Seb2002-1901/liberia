import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PlanGenerateButton } from "@/components/plan/plan-generate-button";
import { PlanProgress } from "@/components/plan/plan-progress";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { StarterPlanView } from "@/components/plan/starter-plan";
import { getActivePlan } from "@/lib/services/plan";
import { getFinanceData } from "@/lib/services/finance";
import { isAnthropicConfigured } from "@/lib/env";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.plan.metadata");
  return { title: t("title") };
}

export default async function PlanPage() {
  const t = await getTranslations("app.plan");
  const [active, data] = await Promise.all([getActivePlan(), getFinanceData()]);
  const aiReady = isAnthropicConfigured() && isAdminConfigured();
  const isDemo = data.isDemo;

  const generationDisabled = !aiReady || isDemo;
  const disabledReason = !aiReady
    ? t("aiNotReady")
    : isDemo
      ? t("demoReason")
      : undefined;

  const situation = data.financialProfile?.situation ?? "tight";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        actions={
          <PlanGenerateButton
            hasPlan={Boolean(active)}
            disabled={generationDisabled}
            disabledReason={disabledReason}
          />
        }
      />

      {active ? (
        <>
          <PlanProgress plan={active.plan} steps={active.steps} />
          <PlanTimeline steps={active.steps} />
        </>
      ) : isDemo ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title={t("demoEmptyTitle")}
          description={t("demoEmptyBody")}
          action={
            <Button asChild variant="gold">
              <Link href={ROUTES.register}>
                {t("createAccount")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <StarterPlanView
          situation={situation}
          aiReady={aiReady}
          isDemo={isDemo}
        />
      )}
    </div>
  );
}

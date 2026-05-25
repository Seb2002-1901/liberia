import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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

export const metadata: Metadata = {
  title: "Plan financier",
};

export default async function PlanPage() {
  const [active, data] = await Promise.all([getActivePlan(), getFinanceData()]);
  const aiReady = isAnthropicConfigured() && isAdminConfigured();
  const isDemo = data.isDemo;

  const generationDisabled = !aiReady || isDemo;
  const disabledReason = !aiReady
    ? "Le plan IA arrive bientôt."
    : isDemo
      ? "Mode démo : crée un compte pour générer un plan."
      : undefined;

  const situation = data.financialProfile?.situation ?? "tight";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plan"
        title="Ton plan financier"
        description="Un plan d'actions concrètes pour avancer semaine après semaine."
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
          title="Le plan IA est réservé aux comptes"
          description="Crée ton compte pour générer un plan personnalisé sur 30, 60 ou 90 jours basé sur tes données réelles."
          action={
            <Button asChild variant="gold">
              <Link href={ROUTES.register}>
                Créer mon compte
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

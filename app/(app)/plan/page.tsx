import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PlanGenerateButton } from "@/components/plan/plan-generate-button";
import { PlanProgress } from "@/components/plan/plan-progress";
import { PlanTimeline } from "@/components/plan/plan-timeline";
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
    ? "Coach IA non configuré sur cet environnement."
    : isDemo
      ? "Mode démo : crée un compte pour générer un plan."
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plan"
        title="Ton plan financier"
        description="Un plan d'actions concrètes, généré par le coach LIBERIA à partir de tes vraies données."
        actions={
          <PlanGenerateButton
            hasPlan={Boolean(active)}
            disabled={generationDisabled}
            disabledReason={disabledReason}
          />
        }
      />

      {!active ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title={
            isDemo
              ? "Le plan IA est réservé aux comptes"
              : aiReady
                ? "Tu n'as pas encore de plan actif"
                : "Le plan IA n'est pas activé sur cet environnement"
          }
          description={
            isDemo
              ? "Crée ton compte pour générer un plan personnalisé sur 30, 60 ou 90 jours basé sur tes données réelles."
              : aiReady
                ? "Lance la génération : le coach analyse ta situation et propose une suite d'actions hebdomadaires."
                : "Renseigne ANTHROPIC_API_KEY et SUPABASE_SERVICE_ROLE_KEY pour activer le coach IA."
          }
          action={
            isDemo ? (
              <Button asChild variant="gold">
                <Link href={ROUTES.register}>
                  Créer mon compte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : aiReady ? (
              <PlanGenerateButton hasPlan={false} />
            ) : null
          }
        />
      ) : (
        <>
          <PlanProgress plan={active.plan} steps={active.steps} />
          <PlanTimeline steps={active.steps} />
        </>
      )}
    </div>
  );
}

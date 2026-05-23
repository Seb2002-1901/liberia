import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HeartPulse,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StabilityCard } from "@/components/dashboard/stability-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { GoalsSummary } from "@/components/dashboard/goals-summary";
import {
  demoExpenses,
  demoFinancialProfile,
  demoGoals,
  demoIncomes,
} from "@/lib/demo/data";
import { totalMonthly } from "@/lib/services/finance";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
  calculateStabilityScore,
} from "@/lib/calculations/finance";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";

export const metadata: Metadata = {
  title: "Mode démo",
  description: "Découvre LIBERIA avec des données réalistes — sans inscription.",
};

export default function DemoDashboardPage() {
  const monthlyIncome = totalMonthly(demoIncomes);
  const monthlyExpenses = totalMonthly(demoExpenses);
  const currentSavings = demoFinancialProfile.current_savings;
  const dti =
    monthlyIncome > 0
      ? (demoFinancialProfile.monthly_debt / monthlyIncome) * 100
      : 0;
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });
  const stability = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    hasEmergencyFund: demoFinancialProfile.has_emergency_fund,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: demoFinancialProfile.perceived_stress,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });

  const byCategory = aggregateMonthlyByCategory(demoExpenses);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] p-4 text-sm">
        <p className="font-medium text-[hsl(var(--gold))]">
          Tu explores LIBERIA en mode démo.
        </p>
        <p className="text-muted-foreground">
          Les données affichées sont fictives. Crée un compte gratuit pour utiliser tes vraies données.
        </p>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="gold" size="sm">
            <Link href={ROUTES.register}>Créer mon compte</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.login}>Se connecter</Link>
          </Button>
        </div>
      </div>

      <PageHeader
        eyebrow="Aperçu"
        title="Tableau de bord démo"
        description="Une vue représentative d'un utilisateur en reconstruction financière."
        actions={
          <Badge variant="gold" className="gap-1">
            <Sparkles className="h-3 w-3" /> Démo
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StabilityCard score={stability} className="lg:col-span-2" />
        <StatCard
          label="Stress financier"
          value={`${stress}/100`}
          icon={<HeartPulse className="h-4 w-4" />}
          tone={stress >= 60 ? "negative" : "neutral"}
          hint={stress >= 60 ? "Charge mentale élevée." : "Niveau gérable."}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenus mensuels" value={formatCurrency(monthlyIncome)} icon={<ArrowUpCircle className="h-4 w-4" />} tone="gold" />
        <StatCard label="Dépenses mensuelles" value={formatCurrency(monthlyExpenses)} icon={<ArrowDownCircle className="h-4 w-4" />} />
        <StatCard label="Reste à vivre" value={formatCurrency(cashflow)} tone={cashflow >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} hint={`Taux d'épargne ${formatPercent(savingsRate)}`} />
        <StatCard
          label="Fonds d'urgence"
          value={Number.isFinite(runway) ? `${runway.toFixed(1)} mois` : "∞"}
          icon={<PiggyBank className="h-4 w-4" />}
          hint={formatCurrency(currentSavings)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CashflowChart income={monthlyIncome} expenses={monthlyExpenses} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recommandations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <RecoTip
              label="Court terme"
              text="Vise 1 mois de dépenses en fonds d'urgence d'ici 6 mois."
            />
            <RecoTip
              label="Allègement"
              text="Réduis 1 abonnement non essentiel ce mois-ci."
            />
            <RecoTip
              label="Automatisation"
              text="Bloque un virement automatique mensuel vers l'épargne, même symbolique."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpenseBreakdown data={byCategory} />
        <GoalsSummary goals={demoGoals} />
      </div>
    </div>
  );
}

function RecoTip({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]" />
      <p>
        <span className="font-medium text-foreground">{label}.</span> {text}
      </p>
    </div>
  );
}


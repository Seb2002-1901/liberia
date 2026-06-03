import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { FinanceData } from "@/lib/services/finance";

interface CoachTeaserProps {
  data: FinanceData;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  savingsRate: number;
  runwayMonths: number;
}

export async function CoachTeaser({
  data,
  monthlyIncome,
  monthlyExpenses,
  cashflow,
  savingsRate,
  runwayMonths,
}: CoachTeaserProps) {
  const t = await getTranslations("dashboard.coachTeaser");
  const tCat = await getTranslations("dashboard.categories.expenses");
  const insights = computeInsights({
    expenses: data.expenses,
    monthlyIncome,
    monthlyExpenses,
    cashflow,
    savingsRate,
    runwayMonths,
    currency: data.profile.currency || "CHF",
    t,
    tCat,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            {t("title")}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/coach">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("coachCta")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2.5">
            {insights.map((tip, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden
                  className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]"
                />
                <span>
                  <span className="font-medium text-foreground">{tip.label}.</span>{" "}
                  <span className="text-muted-foreground">{tip.text}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" size="sm" className="w-full justify-between">
          <Link href="/coach">
            {t("askCta")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

type Insight = { label: string; text: string };

function computeInsights({
  expenses,
  monthlyIncome,
  monthlyExpenses,
  cashflow,
  savingsRate,
  runwayMonths,
  currency,
  t,
  tCat,
}: {
  expenses: FinanceData["expenses"];
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  savingsRate: number;
  runwayMonths: number;
  currency: string;
  t: Awaited<ReturnType<typeof getTranslations<"dashboard.coachTeaser">>>;
  tCat: Awaited<ReturnType<typeof getTranslations<"dashboard.categories.expenses">>>;
}): Insight[] {
  const insights: Insight[] = [];
  const fmt = (n: number) => formatCurrency(n, currency);

  if (monthlyIncome === 0 && monthlyExpenses === 0) return insights;

  // Top non-essential category share.
  const byCategory = aggregateMonthlyByCategory(expenses).sort(
    (a, b) => b.total - a.total,
  );
  const essentialIds = new Set(
    EXPENSE_CATEGORIES.filter((c) => c.essential).map((c) => c.id),
  );
  const topNonEssential = byCategory.find(
    (c) => !essentialIds.has(c.category as never) && c.total > 0,
  );
  if (topNonEssential && monthlyExpenses > 0) {
    const known = EXPENSE_CATEGORIES.find((c) => c.id === topNonEssential.category);
    const label = known ? tCat(known.id) : topNonEssential.category;
    const pct = (topNonEssential.total / monthlyExpenses) * 100;
    if (pct >= 10) {
      insights.push({
        label,
        text: t("texts.categoryShare", {
          pct: pct.toFixed(0),
          amount: fmt(topNonEssential.total),
        }),
      });
    }
  }

  // Cashflow tone.
  if (cashflow < 0) {
    insights.push({
      label: t("labels.cashflowNegative"),
      text: t("texts.cashflowNegative", { amount: fmt(Math.abs(cashflow)) }),
    });
  } else if (savingsRate < 5 && monthlyIncome > 0) {
    insights.push({
      label: t("labels.savingsLow"),
      text: t("texts.savingsLow", { rate: formatPercent(savingsRate) }),
    });
  } else if (savingsRate >= 15) {
    insights.push({
      label: t("labels.savingsGood"),
      text: t("texts.savingsGood", { rate: formatPercent(savingsRate) }),
    });
  }

  // Runway / emergency fund.
  if (Number.isFinite(runwayMonths)) {
    if (runwayMonths < 1) {
      insights.push({
        label: t("labels.emergencyFund"),
        text: t("texts.emergencyLow"),
      });
    } else if (runwayMonths < 3) {
      insights.push({
        label: t("labels.emergencyFund"),
        text: t("texts.emergencyBuilding", { months: runwayMonths.toFixed(1) }),
      });
    }
  }

  return insights.slice(0, 3);
}

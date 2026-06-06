"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
  buildCategoryHistory,
  computePeriodTotals,
  type AnalyticsPeriod,
  type CategoryHistoryRow,
  type HistoryTrend,
} from "@/lib/calculations/analytics";
import {
  detectOpportunities,
  type Opportunity,
  type OpportunityPriority,
} from "@/lib/calculations/opportunities";
import {
  computePotentialSavings,
  type PotentialSavings,
} from "@/lib/calculations/budget-goals";
import {
  computeFinancialCompleteness,
  type CompletenessResult,
} from "@/lib/calculations/completeness";
import {
  detectAnomalies,
  type Anomaly,
} from "@/lib/calculations/anomalies";
import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import { CompletenessCard } from "@/components/dashboard/completeness-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import {
  deleteCategoryBudgetAction,
  upsertCategoryBudgetAction,
} from "@/app/actions/category-budgets";
import type {
  CategoryBudget,
  Expense,
  Goal,
  Income,
} from "@/types/database";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Minus,
  TrendingUp,
} from "lucide-react";

interface Props {
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  incomes: Income[];
  goals: Goal[];
  /** Snapshot fields the anomaly + opportunity engines need. */
  currentSavings: number;
  runwayMonths: number;
  currency: string;
}

export function ExpenseAnalyticsClient({
  expenses,
  categoryBudgets: initialBudgets,
  incomes,
  goals,
  currentSavings,
  runwayMonths,
  currency,
}: Props) {
  const t = useTranslations("app.finance.analytics");
  const [period, setPeriod] = React.useState<AnalyticsPeriod>("month");
  const [budgets, setBudgets] = React.useState<CategoryBudget[]>(initialBudgets);

  // Memoise the derived numbers — the user may flip the period
  // selector multiple times and the helper sweeps the whole expense
  // list each call. Memo by (expenses, period) keeps the UI snappy
  // for power users with 1k+ rows.
  const categoryIds = React.useMemo(
    () => EXPENSE_CATEGORIES.map((c) => c.id),
    [],
  );
  const totals = React.useMemo(
    () => computePeriodTotals(expenses, period),
    [expenses, period],
  );
  const breakdown = React.useMemo(
    () => buildCategoryBreakdown(expenses, period, categoryIds),
    [expenses, period, categoryIds],
  );
  const budgetStatus = React.useMemo(
    () =>
      buildBudgetStatus(
        expenses,
        budgets.map((b) => ({
          category: b.category,
          monthly_limit: b.monthly_limit,
        })),
      ),
    [expenses, budgets],
  );

  // Phase 3.1.3 — history & opportunities. History uses a SEPARATE
  // selector so the user can flip the headline period without losing
  // the long-term trend view. Opportunities are derived from THIS
  // MONTH (not the period selector) because the spec is about
  // current spend vs current income.
  const [historyMonths, setHistoryMonths] = React.useState<3 | 12>(3);
  const history = React.useMemo(
    () => buildCategoryHistory(expenses, historyMonths, categoryIds),
    [expenses, historyMonths, categoryIds],
  );
  const monthBreakdown = React.useMemo(
    () => buildCategoryBreakdown(expenses, "month", categoryIds),
    [expenses, categoryIds],
  );
  const monthTotals = React.useMemo(
    () => computePeriodTotals(expenses, "month"),
    [expenses],
  );
  const opportunities = React.useMemo(
    () =>
      detectOpportunities({
        expenseBuckets: {
          fixed: monthTotals.fixed,
          variable: monthTotals.variable,
          total: monthTotals.total,
          transactions: monthTotals.transactions,
        },
        budgetStatus,
        categoryBreakdown: monthBreakdown,
        monthlyIncome: 0,
        runwayMonths: Number.POSITIVE_INFINITY,
      }),
    // monthlyIncome/runway aren't available to the client component
    // — opportunity rules that need them just skip on the client side
    // (the coach context, which has the financial profile, still gets
    // the full set server-side). The user-visible list focuses on
    // budget overruns + category audits — the high-signal cases.
    [budgetStatus, monthBreakdown, monthTotals],
  );

  // Phase 3.1.4 — aggregate impact of all opportunities, with the
  // per-priority breakdown so the Économies potentielles card can
  // highlight the high-priority subset prominently.
  const potentialSavings = React.useMemo(
    () => computePotentialSavings(opportunities),
    [opportunities],
  );

  // Phase 3.1.5 — completeness derived from the SAME input the
  // dashboard uses, so the two pages always agree on reliability.
  const completeness = React.useMemo(
    () =>
      computeFinancialCompleteness({
        incomes,
        expenses,
        goals,
        categoryBudgets: budgets,
      }),
    [incomes, expenses, goals, budgets],
  );

  // Phase 3.1.6 — anomalies. The list is small (≤ 5) and the rules
  // are deterministic; recompute on every input change.
  const monthlyIncome = React.useMemo(
    () =>
      incomes.reduce(
        (s, i) => s + i.amount * frequencyMultiplier(i.frequency),
        0,
      ),
    [incomes],
  );
  const anomalies = React.useMemo(
    () =>
      detectAnomalies({
        expenses,
        expenseBuckets: {
          fixed: monthTotals.fixed,
          variable: monthTotals.variable,
          total: monthTotals.total,
          transactions: monthTotals.transactions,
        },
        monthlyIncome,
        currentSavings,
        runwayMonths,
      }),
    [expenses, monthTotals, monthlyIncome, currentSavings, runwayMonths],
  );

  const onBudgetSaved = (next: CategoryBudget) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.category === next.category);
      if (idx === -1) return [...prev, next];
      const out = prev.slice();
      out[idx] = next;
      return out;
    });
  };
  const onBudgetDeleted = (category: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  return (
    <div className="space-y-6">
      {/* Phase 3.1.8 — completeness moved to analytics top so the
          dashboard stays focused on action. The card stays compact
          + dépliable: same UX as before, new placement. */}
      <CompletenessCard
        completeness={completeness}
        currency={currency}
      />

      {/* Period selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("period.title")}</CardTitle>
          <CardDescription>{t("period.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["week", "month", "year", "twelve_months"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm transition-colors",
                  period === p
                    ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.08)] text-foreground"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/60",
                )}
              >
                {t(`period.${p}`)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fixed vs Variable summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label={t("totals.fixed")}
          value={formatCurrency(totals.fixed, currency)}
          hint={t("totals.fixedHint")}
        />
        <SummaryCard
          label={t("totals.variable")}
          value={formatCurrency(totals.variable, currency)}
          hint={t("totals.variableHint")}
        />
        <SummaryCard
          label={t("totals.total")}
          value={formatCurrency(totals.total, currency)}
          hint={t("totals.totalHint", { transactions: totals.transactions })}
          accent
        />
      </div>

      {/* Category breakdown — wrapped in CollapsibleSection so the
          long list doesn't dominate the page by default. */}
      <CollapsibleSection
        title={t("breakdown.title")}
        subtitle={t("breakdown.description")}
      >
        <BreakdownList breakdown={breakdown} currency={currency} />
      </CollapsibleSection>

      {/* Budgets per category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("budgets.title")}</CardTitle>
          <CardDescription>{t("budgets.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetStatus.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/50 bg-card/20 p-4 text-center text-sm text-muted-foreground">
              {t("budgets.empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {budgetStatus.map((row) => {
                const label =
                  EXPENSE_CATEGORIES.find((c) => c.id === row.category)
                    ?.label ?? row.category;
                const pct = Math.min(150, Math.round(row.ratio * 100));
                const indicator =
                  row.status === "over"
                    ? "bg-destructive"
                    : row.status === "warning"
                      ? "bg-[hsl(var(--gold))]"
                      : "bg-foreground/70";
                return (
                  <li key={row.category} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.status === "over"
                            ? t("budgets.over", {
                                amount: formatCurrency(-row.remaining, currency),
                              })
                            : row.status === "warning"
                              ? t("budgets.warning", {
                                  pct,
                                  remaining: formatCurrency(
                                    row.remaining,
                                    currency,
                                  ),
                                })
                              : t("budgets.ok", {
                                  remaining: formatCurrency(
                                    row.remaining,
                                    currency,
                                  ),
                                })}
                        </p>
                      </div>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(row.spent, currency)} /{" "}
                        {formatCurrency(row.limit, currency)}
                      </p>
                    </div>
                    <Progress value={pct} indicatorClassName={indicator} />
                  </li>
                );
              })}
            </ul>
          )}
          <BudgetEditor
            currency={currency}
            existing={budgets}
            onSaved={onBudgetSaved}
            onDeleted={onBudgetDeleted}
          />
        </CardContent>
      </Card>

      <ReliabilityBanner completeness={completeness} />

      <AnomaliesCard anomalies={anomalies} currency={currency} />

      <PerformanceTable budgetStatus={budgetStatus} currency={currency} />

      <PotentialSavingsCard
        savings={potentialSavings}
        opportunitiesCount={opportunities.length}
        currency={currency}
        canEstimateSavings={completeness.canEstimateSavings}
      />

      <OpportunitiesCard opportunities={opportunities} currency={currency} />

      <CategoryHistoryCard
        history={history}
        months={historyMonths}
        onMonthsChange={setHistoryMonths}
        currency={currency}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.7 — breakdown list with "show empty categories" toggle            */
/* -------------------------------------------------------------------------- */

function BreakdownList({
  breakdown,
  currency,
}: {
  breakdown: ReturnType<typeof buildCategoryBreakdown>;
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.breakdown");
  const fmt = useFormatter();
  const [showEmpty, setShowEmpty] = React.useState(false);
  // Hide 0-CHF categories by default — the brief flagged the dump of
  // empty rows as visual noise. The toggle keeps them one click away.
  const nonZero = breakdown.filter((r) => r.total > 0);
  const empty = breakdown.filter((r) => r.total <= 0);
  const visible = showEmpty ? breakdown : nonZero;
  return (
    <>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 bg-card/20 p-4 text-center text-sm text-muted-foreground">
          {t("emptyAll")}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => {
            const label =
              EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ??
              row.category;
            return (
              <li key={row.category} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">{label}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(row.total, currency)}{" "}
                    <span className="text-xs">
                      ({fmt.number(row.share, {
                        style: "percent",
                        maximumFractionDigits: 0,
                      })}
                      {row.transactions > 0
                        ? ` · ${t("transactions", { count: row.transactions })}`
                        : ""}
                      )
                    </span>
                  </p>
                </div>
                <Progress
                  value={Math.round(row.share * 100)}
                  indicatorClassName="bg-foreground/70"
                />
              </li>
            );
          })}
        </ul>
      )}
      {empty.length > 0 && (
        <div className="mt-3 flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowEmpty((v) => !v)}
            aria-expanded={showEmpty}
          >
            {showEmpty
              ? t("hideEmpty", { count: empty.length })
              : t("showEmpty", { count: empty.length })}
          </Button>
        </div>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.3 — performance budgétaire (tabular comparison)                  */
/* -------------------------------------------------------------------------- */

function PerformanceTable({
  budgetStatus,
  currency,
}: {
  budgetStatus: ReturnType<typeof buildBudgetStatus>;
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.performance");
  if (budgetStatus.length === 0) return null;

  // Each row is a 5-field record (category / budget / réel / écart /
  // statut). On mobile we render the same data as a stacked card —
  // tables don't fit horizontally on a phone, and brutally
  // overflowing them just hides the rightmost columns.
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Mobile-stacked layout */}
        <ul className="space-y-3 md:hidden">
          {budgetStatus.map((b) => (
            <PerformanceRowMobile key={b.category} row={b} currency={currency} />
          ))}
        </ul>
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-2 border-b border-border/40 pb-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>{t("colCategory")}</span>
            <span className="text-right">{t("colBudget")}</span>
            <span className="text-right">{t("colReal")}</span>
            <span className="text-right">{t("colDelta")}</span>
            <span className="text-right">{t("colStatus")}</span>
          </div>
          <ul className="divide-y divide-border/40">
            {budgetStatus.map((b) => (
              <PerformanceRowDesktop
                key={b.category}
                row={b}
                currency={currency}
              />
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceRowDesktop({
  row,
  currency,
}: {
  row: ReturnType<typeof buildBudgetStatus>[number];
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.performance");
  const label =
    EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ??
    row.category;
  return (
    <li className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr] items-center gap-2 py-2 text-sm">
      <span className="truncate">{label}</span>
      <span className="text-right tabular-nums text-muted-foreground">
        {formatCurrency(row.limit, currency)}
      </span>
      <span className="text-right tabular-nums">
        {formatCurrency(row.spent, currency)}
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          row.remaining < 0 ? "text-destructive" : "text-emerald-500",
        )}
      >
        {row.remaining >= 0 ? "+" : ""}
        {formatCurrency(row.remaining, currency)}
      </span>
      <span className="text-right">
        <StatusBadge status={row.status} t={t} />
      </span>
    </li>
  );
}

function PerformanceRowMobile({
  row,
  currency,
}: {
  row: ReturnType<typeof buildBudgetStatus>[number];
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.performance");
  const label =
    EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ??
    row.category;
  return (
    <li className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{label}</p>
        <StatusBadge status={row.status} t={t} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">{t("colBudget")}</p>
          <p className="tabular-nums">{formatCurrency(row.limit, currency)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("colReal")}</p>
          <p className="tabular-nums">{formatCurrency(row.spent, currency)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("colDelta")}</p>
          <p
            className={cn(
              "tabular-nums",
              row.remaining < 0 ? "text-destructive" : "text-emerald-500",
            )}
          >
            {row.remaining >= 0 ? "+" : ""}
            {formatCurrency(row.remaining, currency)}
          </p>
        </div>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: "ok" | "warning" | "over";
  t: ReturnType<typeof useTranslations>;
}) {
  const tone =
    status === "over"
      ? "bg-destructive/10 text-destructive"
      : status === "warning"
        ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
        : "bg-emerald-500/10 text-emerald-500";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        tone,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.3 — opportunities engine                                         */
/* -------------------------------------------------------------------------- */

function OpportunitiesCard({
  opportunities,
  currency,
}: {
  opportunities: Opportunity[];
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.opportunities");
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-xl border border-dashed border-border/50 bg-card/20 p-4 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {opportunities.map((o, i) => (
            <OpportunityRow key={`${o.kind}-${i}`} opp={o} currency={currency} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OpportunityRow({
  opp,
  currency,
}: {
  opp: Opportunity;
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.opportunities");
  const tKind = useTranslations(`app.finance.analytics.opportunities.kind`);
  const tPriority = useTranslations(
    "app.finance.analytics.opportunities.priority",
  );
  // Translate the category id when the kind has one in payload.
  const catLabel =
    typeof opp.payload.category === "string"
      ? EXPENSE_CATEGORIES.find((c) => c.id === opp.payload.category)?.label ??
        (opp.payload.category as string)
      : null;
  const payloadForI18n: Record<string, string | number> = {
    ...opp.payload,
    category: catLabel ?? (opp.payload.category as string | undefined) ?? "",
    amount:
      typeof opp.payload.amount === "number"
        ? formatCurrency(opp.payload.amount, currency)
        : "",
    limit:
      typeof opp.payload.limit === "number"
        ? formatCurrency(opp.payload.limit, currency)
        : "",
  };
  return (
    <li className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
      <div className="flex items-start gap-3">
        <PriorityIcon priority={opp.priority} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium">{tKind(`${opp.kind}.title`, payloadForI18n)}</p>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                priorityTone(opp.priority),
              )}
            >
              {tPriority(opp.priority)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {tKind(`${opp.kind}.body`, payloadForI18n)}
          </p>
          {opp.monthlyImpact > 0 && (
            <p className="text-xs text-foreground/80">
              {t("impactLine", {
                monthly: formatCurrency(opp.monthlyImpact, currency),
                yearly: formatCurrency(opp.yearlyImpact, currency),
              })}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function PriorityIcon({ priority }: { priority: OpportunityPriority }) {
  if (priority === "high") {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
      >
        <TrendingUp className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-foreground/70"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
    </span>
  );
}

function priorityTone(priority: OpportunityPriority): string {
  return priority === "high"
    ? "bg-destructive/10 text-destructive"
    : priority === "medium"
      ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]"
      : "bg-secondary/40 text-foreground/70";
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.3 — category history view                                         */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.5 — reliability banner (when data is too thin to trust)           */
/* -------------------------------------------------------------------------- */

function ReliabilityBanner({
  completeness,
}: {
  completeness: CompletenessResult;
}) {
  const t = useTranslations("app.finance.analytics.reliability");
  const tArea = useTranslations("dashboard.completeness.area");
  // High reliability = no banner. The page reads cleaner without
  // a green "everything's fine" tile; the dashboard already shows
  // the headline.
  if (completeness.reliability === "high") return null;

  const tone =
    completeness.reliability === "low"
      ? "border-rose-500/40 bg-rose-500/5 text-foreground"
      : "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.05)] text-foreground";

  // List the top 3 missing areas (high-severity first per
  // detectMissingFinancialAreas() ordering).
  const highlightMissing = completeness.missing
    .filter((m) => m.severity !== "low")
    .slice(0, 3);

  return (
    <Card className={cn("border", tone)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{t("title")}</span>
          <span className="text-sm tabular-nums">{completeness.score}%</span>
        </CardTitle>
        <CardDescription>
          {t(`description.${completeness.reliability}`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {highlightMissing.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("missingLabel")}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {highlightMissing.map((m) => (
                <li key={m.area} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      m.severity === "high"
                        ? "bg-rose-500"
                        : "bg-[hsl(var(--gold))]",
                    )}
                  />
                  {tArea(m.area)}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("caveat")}</p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.6 — anomaly signals (calm, non-judgemental)                       */
/* -------------------------------------------------------------------------- */

function AnomaliesCard({
  anomalies,
  currency,
}: {
  anomalies: Anomaly[];
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.anomalies");
  const tKind = useTranslations("app.finance.analytics.anomalies.kind");
  const fmt = useFormatter();
  if (anomalies.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {anomalies.map((a, i) => {
            const payload: Record<string, string | number> = { ...a.payload };
            for (const key of ["amount", "income", "median", "monthly"]) {
              const v = payload[key];
              if (typeof v === "number") {
                payload[key] = fmt.number(v, {
                  style: "currency",
                  currency,
                });
              }
            }
            if (typeof payload.category === "string") {
              const cat = EXPENSE_CATEGORIES.find(
                (c) => c.id === payload.category,
              );
              if (cat) payload.category = cat.label;
            }
            return (
              <li
                key={`${a.kind}-${i}`}
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  a.severity === "warning"
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-border/60 bg-card/40",
                )}
              >
                <p className="font-medium">{tKind(`${a.kind}.title`, payload)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tKind(`${a.kind}.body`, payload)}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("caveat")}</p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Phase 3.1.4 — potential savings (aggregate impact)                          */
/* -------------------------------------------------------------------------- */

function PotentialSavingsCard({
  savings,
  opportunitiesCount,
  currency,
  canEstimateSavings,
}: {
  savings: PotentialSavings;
  opportunitiesCount: number;
  currency: string;
  canEstimateSavings: boolean;
}) {
  const t = useTranslations("app.finance.analytics.potentialSavings");
  // Phase 3.1.6 — when data is too thin to credibly publish a savings
  // figure (détaillée < 70%), we replace the headline with the
  // explicit "Estimation indisponible" box. Same width, same
  // position, just no number. Avoids the "8 CHF/month" false
  // signal the brief flagged.
  if (!canEstimateSavings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("blocked.title")}</CardTitle>
          <CardDescription>{t("blocked.body")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  if (opportunitiesCount === 0 || savings.monthly <= 0) {
    return null;
  }
  // Three priority pills laid out responsively. On mobile they stack
  // beneath the headline figure; on desktop they sit on the right of
  // the card so the user reads "X / month → high / medium / low
  // breakdown" left to right.
  return (
    <Card className="border-[hsl(var(--gold)/0.3)] bg-gradient-to-br from-[hsl(var(--gold)/0.05)] via-card/40 to-card/40">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Phase 3.1.8 — lead with the COUNT of identified levers
              rather than the raw monthly amount. Brief: "8 CHF/month"
              is misleading; "2 leviers identifiés" is honest. The
              detailed monthly + yearly figures live in the secondary
              line beneath, still visible but no longer the headline. */}
          <div className="space-y-1">
            <p className="font-display text-3xl font-semibold tabular-nums text-[hsl(var(--gold))]">
              {t("leversCount", { count: opportunitiesCount })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("estimateLine", {
                monthly: formatCurrency(savings.monthly, currency),
                yearly: formatCurrency(savings.yearly, currency),
              })}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-1">
            {(["high", "medium", "low"] as const).map((p) =>
              savings.byPriority[p].monthly > 0 ? (
                <li
                  key={p}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 text-xs"
                >
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider",
                      priorityTone(p),
                    )}
                  >
                    {t(`priority.${p}`)}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(savings.byPriority[p].monthly, currency)} /
                    {t("perMonth")}
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          {t("disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}

function CategoryHistoryCard({
  history,
  months,
  onMonthsChange,
  currency,
}: {
  history: CategoryHistoryRow[];
  months: 3 | 12;
  onMonthsChange: (m: 3 | 12) => void;
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.history");
  const rows = history.filter((r) => r.total > 0).slice(0, 6);
  return (
    <CollapsibleSection
      title={t("title")}
      subtitle={t("description")}
    >
      <div className="mb-4 flex justify-end">
        <div className="flex gap-1 rounded-lg border border-border/60 bg-card/40 p-0.5">
          <button
            type="button"
            onClick={() => onMonthsChange(3)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              months === 3
                ? "bg-[hsl(var(--gold)/0.12)] text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("3m")}
          </button>
          <button
            type="button"
            onClick={() => onMonthsChange(12)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              months === 12
                ? "bg-[hsl(var(--gold)/0.12)] text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("12m")}
          </button>
        </div>
      </div>
      <div>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/50 bg-card/20 p-4 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <HistoryRow key={row.category} row={row} currency={currency} />
            ))}
          </ul>
        )}
      </div>
    </CollapsibleSection>
  );
}

function HistoryRow({
  row,
  currency,
}: {
  row: CategoryHistoryRow;
  currency: string;
}) {
  const t = useTranslations("app.finance.analytics.history");
  const label =
    EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ??
    row.category;
  const max = Math.max(1, ...row.monthly);
  return (
    <li className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{label}</p>
        <p className="tabular-nums text-muted-foreground">
          {formatCurrency(row.total, currency)} ·{" "}
          {t("avgPerMonth", { amount: formatCurrency(row.average, currency) })}
        </p>
      </div>
      <div className="mt-2 flex items-end gap-1">
        {row.monthly.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-foreground/30"
            style={{ height: `${Math.max(3, (v / max) * 32)}px` }}
            title={formatCurrency(v, currency)}
          />
        ))}
        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendIcon trend={row.trend} />
          {t(`trend.${row.trend}`)}
        </span>
      </div>
    </li>
  );
}

function TrendIcon({ trend }: { trend: HistoryTrend }) {
  if (trend === "up")
    return <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />;
  if (trend === "down")
    return <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/40 p-4",
        accent
          ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.05)]"
          : "border-border/60",
      )}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface BudgetEditorProps {
  currency: string;
  existing: CategoryBudget[];
  onSaved: (b: CategoryBudget) => void;
  onDeleted: (category: string) => void;
}

function BudgetEditor({
  currency,
  existing,
  onSaved,
  onDeleted,
}: BudgetEditorProps) {
  const t = useTranslations("app.finance.analytics.editor");
  const [category, setCategory] = React.useState<ExpenseCategoryId>("food");
  const [amount, setAmount] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  const existingForCategory = existing.find((b) => b.category === category);

  React.useEffect(() => {
    setAmount(existingForCategory ? String(existingForCategory.monthly_limit) : "");
  }, [existingForCategory]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error(t("invalidAmount"));
      return;
    }
    setSubmitting(true);
    const res = await upsertCategoryBudgetAction({
      category,
      monthly_limit: parsed,
      currency,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const now = new Date().toISOString();
    onSaved({
      id: existingForCategory?.id ?? `local-${Date.now()}`,
      user_id: existingForCategory?.user_id ?? "",
      category,
      monthly_limit: parsed,
      currency,
      created_at: existingForCategory?.created_at ?? now,
      updated_at: now,
    });
    toast.success(t("savedToast"));
  };

  const onDelete = async () => {
    if (!existingForCategory) return;
    setPendingDelete(category);
    const res = await deleteCategoryBudgetAction(category);
    setPendingDelete(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onDeleted(category);
    toast.success(t("deletedToast"));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border/60 bg-card/20 p-3 space-y-3"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t("title")}
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1">
          <Label htmlFor="budget-category" className="text-xs">
            {t("categoryLabel")}
          </Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategoryId)}
          >
            <SelectTrigger id="budget-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="budget-amount" className="text-xs">
            {t("amountLabel", { currency })}
          </Label>
          <Input
            id="budget-amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-32"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" variant="gold" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : existingForCategory ? (
              <Pencil className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {existingForCategory ? t("update") : t("create")}
          </Button>
          {existingForCategory && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pendingDelete === category}
              onClick={() => void onDelete()}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("deleteLabel")}
            >
              {pendingDelete === category ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

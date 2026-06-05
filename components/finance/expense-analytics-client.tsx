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
  computePeriodTotals,
  type AnalyticsPeriod,
} from "@/lib/calculations/analytics";
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import {
  deleteCategoryBudgetAction,
  upsertCategoryBudgetAction,
} from "@/app/actions/category-budgets";
import type { CategoryBudget, Expense } from "@/types/database";

interface Props {
  expenses: Expense[];
  categoryBudgets: CategoryBudget[];
  currency: string;
}

export function ExpenseAnalyticsClient({
  expenses,
  categoryBudgets: initialBudgets,
  currency,
}: Props) {
  const t = useTranslations("app.finance.analytics");
  const fmt = useFormatter();
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

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("breakdown.title")}
          </CardTitle>
          <CardDescription>{t("breakdown.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {breakdown.map((row) => {
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
                        ({fmt.number(row.share, { style: "percent", maximumFractionDigits: 0 })}
                        {row.transactions > 0
                          ? ` · ${t("breakdown.transactions", { count: row.transactions })}`
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
        </CardContent>
      </Card>

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
    </div>
  );
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

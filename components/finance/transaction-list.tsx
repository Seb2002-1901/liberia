"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionForm } from "@/components/finance/transaction-form";
import { formatCurrency } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  INCOME_CATEGORIES,
} from "@/lib/constants";
import type { Expense, Income } from "@/types/database";
import type { ExpenseInput, IncomeInput } from "@/lib/validations/finance";

type Item = Income | Expense;

interface TransactionListProps {
  kind: "income" | "expense";
  items: Item[];
  isDemo: boolean;
  currency?: string;
  onCreate: (
    values: IncomeInput | ExpenseInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onUpdate: (
    id: string,
    values: IncomeInput | ExpenseInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function TransactionList({
  kind,
  items,
  isDemo,
  currency = "CHF",
  onCreate,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const t = useTranslations("app.finance.list");
  const tFreq = useTranslations("dashboard.categories.frequencies");
  const tIncomeCat = useTranslations("dashboard.categories.incomeCategories");
  const tExpenseCat = useTranslations("dashboard.categories.expenses");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [pending, startTransition] = React.useTransition();

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const categoryLabel = (id: string) => {
    if (kind === "income") {
      return INCOME_CATEGORIES.find((c) => c.id === id) ? tIncomeCat(id) : id;
    }
    return EXPENSE_CATEGORIES.find((c) => c.id === id) ? tExpenseCat(id) : id;
  };

  const handleOpen = (item?: Item) => {
    if (isDemo) {
      toast.info(t("demoToastInfoTitle"), {
        action: {
          label: t("demoToastAction"),
          onClick: () => (window.location.href = ROUTES.register),
        },
      });
      return;
    }
    setEditing(item ?? null);
    setOpen(true);
  };

  const handleSubmit = async (
    values: IncomeInput | ExpenseInput,
    id?: string,
  ) => {
    if (isDemo) {
      return { ok: false as const, error: t("demoSaveError") };
    }
    return id ? onUpdate(id, values) : onCreate(values);
  };

  const handleDelete = (id: string, label: string) => {
    if (isDemo) {
      toast.error(t("demoDeleteError"));
      return;
    }
    const confirmKey =
      kind === "income" ? "deleteConfirmIncome" : "deleteConfirmExpense";
    if (
      typeof window !== "undefined" &&
      !window.confirm(t(confirmKey, { label }))
    ) {
      return;
    }
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.ok) toast.error(res.error);
      else toast.success(t("deletedToast"));
    });
  };

  const addLabel = kind === "income" ? t("addIncome") : t("addExpense");
  const emptyTitle = kind === "income" ? t("emptyIncomeTitle") : t("emptyExpenseTitle");
  const emptyDescription =
    kind === "income" ? t("emptyIncomeDescription") : t("emptyExpenseDescription");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            <Lock className="mr-1 inline-block h-3 w-3" /> {t("demoBanner")}{" "}
            <Link
              href={ROUTES.register}
              className="font-medium text-foreground hover:underline"
            >
              {t("createAccountLink")}
            </Link>
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="gold"
          size="sm"
          onClick={() => handleOpen()}
          disabled={isDemo}
        >
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button variant="gold" size="sm" onClick={() => handleOpen()}>
              {addLabel}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border/60 p-0">
            {items.map((item) => {
              const catLabel = categoryLabel(item.category);
              const known = categories.find((c) => c.id === item.category);
              const freq = FREQUENCIES.find((f) => f.id === item.frequency);
              const freqLabel = freq ? tFreq(freq.id) : item.frequency;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-card/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gold)/0.15)] to-transparent text-[hsl(var(--gold))]">
                    <span className="text-xs font-semibold">
                      {(known ? catLabel : item.category)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {catLabel} · {freqLabel}
                    </p>
                  </div>
                  <p className="font-display text-sm font-semibold tabular-nums">
                    {kind === "expense" ? "−" : ""}
                    {formatCurrency(item.amount, currency)}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={t("actionsLabel")}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleOpen(item)}>
                        <Pencil className="h-4 w-4" /> {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDelete(item.id, item.label)}
                        className="text-[hsl(var(--destructive))]"
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4" /> {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <TransactionForm
        kind={kind}
        open={open}
        onOpenChange={setOpen}
        initial={
          editing
            ? {
                id: editing.id,
                label: editing.label,
                amount: editing.amount,
                category: editing.category,
                frequency: editing.frequency,
                notes: editing.notes,
              }
            : null
        }
        onSubmit={handleSubmit}
      />
    </>
  );
}

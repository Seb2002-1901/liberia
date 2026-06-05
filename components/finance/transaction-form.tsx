"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  INCOME_CATEGORIES,
} from "@/lib/constants";
import {
  expenseSchema,
  incomeSchema,
  type ExpenseInput,
  type IncomeInput,
} from "@/lib/validations/finance";
import { cn } from "@/lib/utils";

type TransactionKind = "income" | "expense";

// Phase 3.1.3 — explicit Type / Frequency split. We don't store a
// separate `expense_type` column in the DB (the coach tool needs it
// because the LLM has to declare its intent, but here the form can
// derive it from the frequency: one_time ⇒ variable, anything else
// ⇒ fixed). Showing the choice up-front makes the UX intent obvious
// and prevents the "Mensuel/Hebdo/Annuel/Ponctuel — wait, which one
// is a recurring rent?" confusion the brief flagged.
type ExpenseTypeUi = "fixed" | "variable";

function frequencyToType(freq: string | undefined): ExpenseTypeUi {
  return freq === "one_time" ? "variable" : "fixed";
}

type Initial = {
  id?: string;
  label?: string;
  amount?: number;
  category?: string;
  frequency?: string;
  notes?: string | null;
};

interface TransactionFormProps {
  kind: TransactionKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Initial | null;
  onSubmit: (
    values: IncomeInput | ExpenseInput,
    id?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function TransactionForm({
  kind,
  open,
  onOpenChange,
  initial,
  onSubmit,
}: TransactionFormProps) {
  const t = useTranslations("app.finance.form.transaction");
  const tErr = useTranslations();
  const tFreq = useTranslations("dashboard.categories.frequencies");
  const tIncomeCat = useTranslations("dashboard.categories.incomeCategories");
  const tExpenseCat = useTranslations("dashboard.categories.expenses");
  const schema = kind === "income" ? incomeSchema : expenseSchema;
  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IncomeInput | ExpenseInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: initial?.label ?? "",
      amount: initial?.amount ?? (undefined as unknown as number),
      category: (initial?.category as IncomeInput["category"]) ?? categories[0].id,
      frequency: (initial?.frequency as IncomeInput["frequency"]) ?? "monthly",
      notes: initial?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        label: initial?.label ?? "",
        amount: initial?.amount ?? (undefined as unknown as number),
        category: (initial?.category as IncomeInput["category"]) ?? categories[0].id,
        frequency: (initial?.frequency as IncomeInput["frequency"]) ?? "monthly",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, reset, categories]);

  // Watch the canonical frequency from the form state — the Type
  // toggle below WRITES into `frequency` rather than carrying its
  // own state, so there's no drift between UI and submitted value.
  const currentFrequency = watch("frequency") as string | undefined;
  const expenseTypeUi: ExpenseTypeUi = frequencyToType(currentFrequency);

  /**
   * Type toggle handler. Variable forces frequency=one_time. Fixed
   * defaults to monthly (the most common case for the "rent /
   * insurance / subscription" trio); the user picks the exact
   * cadence in the dropdown that re-appears just below.
   */
  const onPickType = (next: ExpenseTypeUi) => {
    if (next === "variable") {
      setValue("frequency", "one_time" as IncomeInput["frequency"], {
        shouldDirty: true,
      });
    } else if (currentFrequency === "one_time" || !currentFrequency) {
      setValue("frequency", "monthly" as IncomeInput["frequency"], {
        shouldDirty: true,
      });
    }
  };

  const submit = handleSubmit(async (values) => {
    const res = await onSubmit(values, initial?.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(initial?.id ? t("toastUpdated") : t("toastAdded"));
    onOpenChange(false);
  });

  const title =
    kind === "income"
      ? initial?.id
        ? t("titleEditIncome")
        : t("titleAddIncome")
      : initial?.id
      ? t("titleEditExpense")
      : t("titleAddExpense");

  const labelForCategory = (id: string) => {
    if (kind === "income") {
      return INCOME_CATEGORIES.find((c) => c.id === id) ? tIncomeCat(id) : id;
    }
    return EXPENSE_CATEGORIES.find((c) => c.id === id) ? tExpenseCat(id) : id;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {kind === "expense" && (
            <div className="space-y-1.5">
              <Label>{t("typeLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onPickType("fixed")}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    expenseTypeUi === "fixed"
                      ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.08)] text-foreground"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/60",
                  )}
                >
                  <p className="font-medium">{t("typeFixedTitle")}</p>
                  <p className="text-xs">{t("typeFixedHelp")}</p>
                </button>
                <button
                  type="button"
                  onClick={() => onPickType("variable")}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    expenseTypeUi === "variable"
                      ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.08)] text-foreground"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/60",
                  )}
                >
                  <p className="font-medium">{t("typeVariableTitle")}</p>
                  <p className="text-xs">{t("typeVariableHelp")}</p>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="label">{t("label")}</Label>
            <Input
              id="label"
              placeholder={
                kind === "income"
                  ? t("placeholderIncome")
                  : t("placeholderExpense")
              }
              {...register("label")}
            />
            {errors.label?.message && (
              <p className="text-xs text-[hsl(var(--destructive))]">
                {tErr(errors.label.message)}
              </p>
            )}
          </div>

          <div
            className={cn(
              "grid gap-3",
              kind === "expense" && expenseTypeUi === "variable"
                ? "grid-cols-1"
                : "grid-cols-2",
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("amount")}</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...register("amount")}
              />
              {errors.amount?.message && (
                <p className="text-xs text-[hsl(var(--destructive))]">
                  {tErr(errors.amount.message)}
                </p>
              )}
            </div>
            {/*
              Frequency picker:
                - For incomes: always shown, all 4 cadences.
                - For expense + variable: HIDDEN (we forced one_time
                  on type pick); shown as a static one-time label
                  below the amount instead.
                - For expense + fixed: shown but constrained to
                  {monthly, weekly, yearly}.
            */}
            {(kind === "income" || expenseTypeUi === "fixed") && (
              <div className="space-y-1.5">
                <Label>{t("frequency")}</Label>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("frequency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.filter((f) =>
                          kind === "income"
                            ? true
                            : f.id !== "one_time",
                        ).map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {tFreq(f.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
          {kind === "expense" && expenseTypeUi === "variable" && (
            <p className="text-xs text-muted-foreground">
              {t("variableHint")}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>{t("category")}</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {labelForCategory(c.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder={t("notesPlaceholder")}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.id ? t("save") : t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

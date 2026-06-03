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

type TransactionKind = "income" | "expense";

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

          <div className="grid grid-cols-2 gap-3">
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
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {tFreq(f.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

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

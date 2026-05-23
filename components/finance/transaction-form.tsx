"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
  onSubmit: (values: IncomeInput | ExpenseInput, id?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function TransactionForm({
  kind,
  open,
  onOpenChange,
  initial,
  onSubmit,
}: TransactionFormProps) {
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
    toast.success(initial?.id ? "Mis à jour." : "Ajouté avec succès.");
    onOpenChange(false);
  });

  const title =
    kind === "income"
      ? initial?.id
        ? "Modifier le revenu"
        : "Ajouter un revenu"
      : initial?.id
      ? "Modifier la dépense"
      : "Ajouter une dépense";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Renseigne le montant et sa fréquence. Tu pourras modifier à tout moment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="label">Libellé</Label>
            <Input
              id="label"
              placeholder={kind === "income" ? "Ex. Salaire" : "Ex. Loyer"}
              {...register("label")}
            />
            {errors.label && (
              <p className="text-xs text-[hsl(var(--destructive))]">{errors.label.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Fréquence</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Optionnel"
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
              Annuler
            </Button>
            <Button type="submit" variant="gold" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.id ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

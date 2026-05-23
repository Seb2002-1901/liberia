"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
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
import { GOAL_TYPES } from "@/lib/constants";
import { goalSchema, type GoalInput } from "@/lib/validations/finance";

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    id?: string;
    title?: string;
    type?: string;
    targetAmount?: number;
    currentAmount?: number;
    deadline?: string | null;
    notes?: string | null;
  } | null;
  onSubmit: (
    values: GoalInput,
    id?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function GoalForm({ open, onOpenChange, initial, onSubmit }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: initial?.title ?? "",
      type: (initial?.type as GoalInput["type"]) ?? "emergency_fund",
      targetAmount: initial?.targetAmount ?? (undefined as unknown as number),
      currentAmount: initial?.currentAmount ?? 0,
      deadline: initial?.deadline ?? "",
      notes: initial?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        title: initial?.title ?? "",
        type: (initial?.type as GoalInput["type"]) ?? "emergency_fund",
        targetAmount: initial?.targetAmount ?? (undefined as unknown as number),
        currentAmount: initial?.currentAmount ?? 0,
        deadline: initial?.deadline ?? "",
        notes: initial?.notes ?? "",
      });
    }
  }, [open, initial, reset]);

  const submit = handleSubmit(async (values) => {
    const res = await onSubmit(values, initial?.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(initial?.id ? "Objectif mis à jour." : "Objectif créé.");
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Modifier l'objectif" : "Nouvel objectif"}</DialogTitle>
          <DialogDescription>
            Choisis un objectif tangible et atteignable. Tu pourras l'ajuster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              placeholder="Ex. Fonds d'urgence 1 mois"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-[hsl(var(--destructive))]">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetAmount">Cible</Label>
              <Input
                id="targetAmount"
                type="number"
                min={1}
                step="0.01"
                placeholder="0"
                {...register("targetAmount")}
              />
              {errors.targetAmount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.targetAmount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentAmount">Déjà mis</Label>
              <Input
                id="currentAmount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...register("currentAmount")}
              />
              {errors.currentAmount && (
                <p className="text-xs text-[hsl(var(--destructive))]">{errors.currentAmount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">Échéance</Label>
            <Input id="deadline" type="date" {...register("deadline")} />
            {errors.deadline && (
              <p className="text-xs text-[hsl(var(--destructive))]">{errors.deadline.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} placeholder="Optionnel" {...register("notes")} />
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
              {initial?.id ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

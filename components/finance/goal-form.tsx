"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
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
  const t = useTranslations("app.finance.form.goal");
  const tErr = useTranslations();
  const tGoalType = useTranslations("onboarding.goals");
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
    toast.success(initial?.id ? t("toastUpdated") : t("toastCreated"));
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial?.id ? t("titleEdit") : t("titleNew")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("title")}</Label>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              {...register("title")}
            />
            {errors.title?.message && (
              <p className="text-xs text-[hsl(var(--destructive))]">
                {tErr(errors.title.message)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("type")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {tGoalType(g.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetAmount">{t("target")}</Label>
              <Input
                id="targetAmount"
                type="number"
                min={1}
                step="0.01"
                placeholder="0"
                {...register("targetAmount")}
              />
              {errors.targetAmount?.message && (
                <p className="text-xs text-[hsl(var(--destructive))]">
                  {tErr(errors.targetAmount.message)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentAmount">{t("current")}</Label>
              <Input
                id="currentAmount"
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                {...register("currentAmount")}
              />
              {errors.currentAmount?.message && (
                <p className="text-xs text-[hsl(var(--destructive))]">
                  {tErr(errors.currentAmount.message)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline">{t("deadline")}</Label>
            <Input id="deadline" type="date" {...register("deadline")} />
            {errors.deadline?.message && (
              <p className="text-xs text-[hsl(var(--destructive))]">
                {tErr(errors.deadline.message)}
              </p>
            )}
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
              {initial?.id ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

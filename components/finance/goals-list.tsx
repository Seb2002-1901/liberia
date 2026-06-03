"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, MoreVertical, Pencil, Target, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoalForm } from "@/components/finance/goal-form";
import { GOAL_TYPES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Goal } from "@/types/database";
import type { GoalInput } from "@/lib/validations/finance";

interface GoalsListProps {
  goals: Goal[];
  isDemo: boolean;
  currency?: string;
  onCreate: (values: GoalInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  onUpdate: (
    id: string,
    values: GoalInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export function GoalsList({
  goals,
  isDemo,
  currency = "CHF",
  onCreate,
  onUpdate,
  onDelete,
}: GoalsListProps) {
  const t = useTranslations("app.finance.list");
  const tGoalType = useTranslations("onboarding.goals");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [pending, startTransition] = React.useTransition();

  const handleOpen = (goal?: Goal) => {
    if (isDemo) {
      toast.info(t("demoToastInfoTitle"), {
        action: {
          label: t("demoToastAction"),
          onClick: () => (window.location.href = ROUTES.register),
        },
      });
      return;
    }
    setEditing(goal ?? null);
    setOpen(true);
  };

  const handleSubmit = async (values: GoalInput, id?: string) => {
    if (isDemo) {
      return { ok: false as const, error: t("demoSaveError") };
    }
    return id ? onUpdate(id, values) : onCreate(values);
  };

  const handleDelete = (id: string, title: string) => {
    if (isDemo) {
      toast.error(t("demoDeleteError"));
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("deleteConfirmGoal", { title }))
    ) {
      return;
    }
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.ok) toast.error(res.error);
      else toast.success(t("deletedGoalToast"));
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            <Lock className="mr-1 inline-block h-3 w-3" /> {t("demoBannerGoals")}{" "}
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
        <Button variant="gold" size="sm" onClick={() => handleOpen()} disabled={isDemo}>
          {t("newGoal")}
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title={t("emptyGoalsTitle")}
          description={t("emptyGoalsDescription")}
          action={
            <Button variant="gold" size="sm" onClick={() => handleOpen()}>
              {t("createGoal")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const known = GOAL_TYPES.find((tp) => tp.id === g.type);
            const typeLabel = known ? tGoalType(known.id) : g.type;
            const ratio = Math.min(
              100,
              Math.round((g.current_amount / Math.max(1, g.target_amount)) * 100),
            );
            const done = g.is_completed || ratio >= 100;
            return (
              <Card key={g.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{g.title}</p>
                        {done && <Badge variant="success">{t("goalDone")}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel}
                        {g.deadline &&
                          ` · ${t("goalDeadlinePrefix", { date: formatDate(g.deadline) })}`}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={t("actionsLabel")}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleOpen(g)}>
                          <Pencil className="h-4 w-4" /> {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleDelete(g.id, g.title)}
                          disabled={pending}
                          className="text-[hsl(var(--destructive))]"
                        >
                          <Trash2 className="h-4 w-4" /> {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="tabular-nums">
                        {formatCurrency(g.current_amount, currency)} /{" "}
                        <span className="text-foreground">
                          {formatCurrency(g.target_amount, currency)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{ratio}%</span>
                    </div>
                    <Progress
                      value={ratio}
                      indicatorClassName={
                        done
                          ? "bg-[hsl(var(--success))]"
                          : "bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]"
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalForm
        open={open}
        onOpenChange={setOpen}
        initial={
          editing
            ? {
                id: editing.id,
                title: editing.title,
                type: editing.type,
                targetAmount: editing.target_amount,
                currentAmount: editing.current_amount,
                deadline: editing.deadline,
                notes: editing.notes,
              }
            : null
        }
        onSubmit={handleSubmit}
      />
    </>
  );
}

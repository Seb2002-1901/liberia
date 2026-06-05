"use client";

import * as React from "react";
import { Check, Loader2, ShoppingCart, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "@/lib/constants";
import { confirmProposedExpenseAction } from "@/app/actions/coach-actions";

/**
 * Renders the confirmation card the coach surfaces when it extracted
 * a real expense from the user's natural-language message. The card
 * is intentionally compact (single row of action buttons, no form):
 * the coach already proposed amount/label/category, the user just
 * decides whether to keep it. If they want to edit, they go to
 * /expenses — keeping this card lightweight avoids reimplementing
 * the full expense form inline.
 */

export interface PendingExpense {
  toolUseId: string;
  amount: number;
  currency: string;
  label: string;
  category: ExpenseCategoryId;
  notes: string | null;
}

interface ExpenseConfirmCardProps {
  pending: PendingExpense;
  /**
   * Called after the user resolves the card (confirm or cancel) so
   * the parent can remove it from the message's pending list.
   */
  onResolved: (toolUseId: string, action: "confirmed" | "cancelled") => void;
}

export function ExpenseConfirmCard({
  pending,
  onResolved,
}: ExpenseConfirmCardProps) {
  const t = useTranslations("app.coach.proposeExpense");
  const formatter = useFormatter();
  const [submitting, setSubmitting] = React.useState(false);
  const [resolved, setResolved] = React.useState<
    "confirmed" | "cancelled" | null
  >(null);

  const categoryLabel = React.useMemo(() => {
    const c = EXPENSE_CATEGORIES.find((x) => x.id === pending.category);
    return c?.label ?? pending.category;
  }, [pending.category]);

  const onConfirm = async () => {
    setSubmitting(true);
    const res = await confirmProposedExpenseAction({
      amount: pending.amount,
      currency: pending.currency,
      label: pending.label,
      category: pending.category,
      notes: pending.notes,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResolved("confirmed");
    toast.success(t("savedToast"));
    onResolved(pending.toolUseId, "confirmed");
  };

  const onCancel = () => {
    setResolved("cancelled");
    onResolved(pending.toolUseId, "cancelled");
  };

  if (resolved === "confirmed") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] px-3 py-2 text-xs text-[hsl(var(--gold))]">
        <Check className="h-3.5 w-3.5" />
        {t("savedInline", {
          amount: formatter.number(pending.amount, {
            style: "currency",
            currency: pending.currency,
          }),
          label: pending.label,
        })}
      </div>
    );
  }

  if (resolved === "cancelled") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
        <X className="h-3.5 w-3.5" />
        {t("cancelledInline")}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.04)] p-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--gold))]">
            {t("title")}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {formatter.number(pending.amount, {
              style: "currency",
              currency: pending.currency,
            })}{" "}
            · {pending.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("categoryLine", { category: categoryLabel })}
          </p>
          {pending.notes && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              « {pending.notes} »
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={submitting}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="gold"
          disabled={submitting}
          onClick={() => void onConfirm()}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {t("confirm")}
        </Button>
      </div>
    </div>
  );
}

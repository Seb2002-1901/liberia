"use client";

import * as React from "react";
import { Check, Loader2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  GOAL_TYPES,
} from "@/lib/constants";
import {
  confirmProposedExpenseAction,
  confirmProposedIncomeAction,
  confirmProposedGoalAction,
  confirmProposedBudgetAction,
} from "@/app/actions/coach-actions";
import type { PendingAction } from "./proposed-action-types";

/**
 * Sprint Coach IA — carte de confirmation générique pour les 4 actions
 * que le coach peut proposer (expense / income / goal / budget).
 *
 * Pas de design custom — palette navy V3 inline cohérente avec le
 * reste de la page coach. Variant amber pour les dépenses (rentre
 * dans le cockpit), success pour les revenus, navy pour les
 * objectifs, primary pour les budgets — visuel rapide.
 *
 * Ne dépend PAS d'ExpenseConfirmCard (gardé pour le legacy
 * coach-chat.tsx) — le V3 client utilise ce composant unique.
 */

interface Props {
  action: PendingAction;
  onResolved: (toolUseId: string, status: "confirmed" | "cancelled") => void;
}

const COLORS = {
  expense: { accent: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  income: { accent: "#10A37F", bg: "#ECFDF5", text: "#065F46" },
  goal: { accent: "#2563EB", bg: "#EDF2FD", text: "#1E40AF" },
  budget: { accent: "#011E5F", bg: "#E0E7FF", text: "#011E5F" },
} as const;

export function ProposedActionCard({ action, onResolved }: Props) {
  const t = useTranslations("app.coach.proposedAction");
  const formatter = useFormatter();
  const [submitting, setSubmitting] = React.useState(false);
  const [resolved, setResolved] = React.useState<
    "confirmed" | "cancelled" | null
  >(null);

  const palette = COLORS[action.kind];

  const onConfirm = async () => {
    setSubmitting(true);
    let res: { ok: true } | { ok: false; error: string };
    try {
      switch (action.kind) {
        case "expense":
          res = await confirmProposedExpenseAction({
            expense_type: action.expense_type,
            frequency: action.frequency,
            amount: action.amount,
            currency: action.currency,
            label: action.label,
            category: action.category,
            notes: action.notes,
          });
          break;
        case "income":
          res = await confirmProposedIncomeAction({
            frequency: action.frequency,
            amount: action.amount,
            currency: action.currency,
            label: action.label,
            category: action.category,
            notes: action.notes,
          });
          break;
        case "goal":
          res = await confirmProposedGoalAction({
            title: action.title,
            type: action.type,
            targetAmount: action.targetAmount,
            currentAmount: action.currentAmount,
            currency: action.currency,
            deadline: action.deadline,
            notes: action.notes,
          });
          break;
        case "budget":
          res = await confirmProposedBudgetAction({
            category: action.category,
            monthlyLimit: action.monthlyLimit,
            currency: action.currency,
          });
          break;
      }
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : t("genericError"));
      return;
    }
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResolved("confirmed");
    toast.success(t(`savedToast.${action.kind}`));
    onResolved(action.toolUseId, "confirmed");
  };

  const onCancel = () => {
    setResolved("cancelled");
    onResolved(action.toolUseId, "cancelled");
  };

  if (resolved === "confirmed") {
    return (
      <Banner
        accent={palette.accent}
        bg={palette.bg}
        icon={<Check width={14} height={14} />}
        text={t(`savedInline.${action.kind}`)}
      />
    );
  }
  if (resolved === "cancelled") {
    return (
      <Banner
        accent="#94A3B8"
        bg="#F1F5F9"
        icon={<X width={14} height={14} />}
        text={t("cancelledInline")}
      />
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${palette.accent}33`,
        background: palette.bg,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: palette.accent,
          }}
        >
          {t(`title.${action.kind}`)}
        </p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
          {renderHeadline(action, formatter)}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>
          {renderSubline(action, t)}
        </p>
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: "6px 12px",
            border: "none",
            background: "transparent",
            color: "#64748B",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={submitting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            border: "none",
            background: palette.accent,
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {submitting ? (
            <Loader2 width={12} height={12} className="animate-spin" />
          ) : (
            <Check width={12} height={12} />
          )}
          {t("confirm")}
        </button>
      </div>
    </div>
  );
}

function Banner({
  accent,
  bg,
  icon,
  text,
}: {
  accent: string;
  bg: string;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: bg,
        color: accent,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

function renderHeadline(
  a: PendingAction,
  formatter: ReturnType<typeof useFormatter>,
): string {
  switch (a.kind) {
    case "expense": {
      const amount = formatter.number(a.amount, {
        style: "currency",
        currency: a.currency,
      });
      return `${amount} · ${a.label}`;
    }
    case "income": {
      const amount = formatter.number(a.amount, {
        style: "currency",
        currency: a.currency,
      });
      return `${amount} · ${a.label}`;
    }
    case "goal": {
      const target = formatter.number(a.targetAmount, {
        style: "currency",
        currency: a.currency,
      });
      return `${a.title} — ${target}`;
    }
    case "budget": {
      const limit = formatter.number(a.monthlyLimit, {
        style: "currency",
        currency: a.currency,
      });
      const cat = EXPENSE_CATEGORIES.find((c) => c.id === a.category);
      return `${cat?.label ?? a.category} : ${limit} / mois`;
    }
  }
}

function renderSubline(
  a: PendingAction,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (a.kind) {
    case "expense": {
      const cat = EXPENSE_CATEGORIES.find((c) => c.id === a.category);
      return `${cat?.label ?? a.category} · ${t(`frequency.${a.frequency}`)}`;
    }
    case "income": {
      const cat = INCOME_CATEGORIES.find((c) => c.id === a.category);
      return `${cat?.label ?? a.category} · ${t(`frequency.${a.frequency}`)}`;
    }
    case "goal": {
      const type = GOAL_TYPES.find((g) => g.id === a.type);
      const parts: string[] = [];
      parts.push(type?.label ?? a.type);
      if (a.deadline) parts.push(t("goalDeadline", { date: a.deadline }));
      if (a.currentAmount > 0) {
        parts.push(t("goalProgress", { current: a.currentAmount }));
      }
      return parts.join(" · ");
    }
    case "budget":
      return t("budgetSubline");
  }
}

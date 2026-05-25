"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [pending, startTransition] = React.useTransition();

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleOpen = (item?: Item) => {
    if (isDemo) {
      toast.info("Mode démo · crée un compte pour sauvegarder.", {
        action: { label: "Créer", onClick: () => (window.location.href = ROUTES.register) },
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
      return { ok: false as const, error: "Mode démo : connecte-toi pour enregistrer." };
    }
    return id ? onUpdate(id, values) : onCreate(values);
  };

  const handleDelete = (id: string, label: string) => {
    if (isDemo) {
      toast.error("Mode démo : connecte-toi pour supprimer.");
      return;
    }
    const what = kind === "income" ? "ce revenu" : "cette dépense";
    if (typeof window !== "undefined" && !window.confirm(`Supprimer ${what} « ${label} » ?`)) {
      return;
    }
    startTransition(async () => {
      const res = await onDelete(id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Supprimé.");
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        {isDemo ? (
          <p className="text-xs text-muted-foreground">
            <Lock className="mr-1 inline-block h-3 w-3" /> Mode démo · lecture seule.{" "}
            <Link href={ROUTES.register} className="font-medium text-foreground hover:underline">
              Crée ton compte
            </Link>{" "}
            pour ajouter tes données.
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
          {kind === "income" ? "Ajouter un revenu" : "Ajouter une dépense"}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={kind === "income" ? "Pas encore de revenu" : "Pas encore de dépense"}
          description={
            kind === "income"
              ? "Commence par ton salaire principal ou tes revenus récurrents."
              : "Liste tes dépenses essentielles puis non essentielles."
          }
          action={
            <Button variant="gold" size="sm" onClick={() => handleOpen()}>
              {kind === "income" ? "Ajouter un revenu" : "Ajouter une dépense"}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border/60 p-0">
            {items.map((item) => {
              const cat = categories.find((c) => c.id === item.category);
              const freq = FREQUENCIES.find((f) => f.id === item.frequency);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-card/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gold)/0.15)] to-transparent text-[hsl(var(--gold))]">
                    <span className="text-xs font-semibold">
                      {(cat?.label ?? item.category).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.label ?? item.category} · {freq?.label ?? item.frequency}
                    </p>
                  </div>
                  <p className="font-display text-sm font-semibold tabular-nums">
                    {kind === "expense" ? "−" : ""}
                    {formatCurrency(item.amount, currency)}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleOpen(item)}>
                        <Pencil className="h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleDelete(item.id, item.label)}
                        className="text-[hsl(var(--destructive))]"
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
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

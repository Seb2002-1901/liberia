"use client";

import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { bulkCreateExpensesAction } from "@/app/actions/expenses";
import { cn } from "@/lib/utils";
import type { MissingArea } from "@/lib/calculations/completeness";

/**
 * Phase 3.1.5 — completion assistant.
 *
 * Goal: give the user a fast way to back-fill the categories the
 * completeness score flagged as missing, without forcing them to
 * navigate to /expenses, click "add", fill the dialog, repeat.
 *
 * UX shape: a list of CANDIDATES (one common item per missing
 * category — assurance maladie, abonnement téléphone, Netflix…).
 * Each candidate has a switch + an amount field. Toggling on
 * focuses the amount; submitting batches all enabled rows through
 * `bulkCreateExpensesAction`.
 *
 * We don't expose the full editing surface here (label, notes,
 * frequency picker) — the assistant is for getting the user from
 * 0 to "decent enough completeness" in 30 seconds. They can edit
 * details later on /expenses.
 *
 * Why these specific candidates: they're the ten the brief listed,
 * mapped onto the EXPENSE_CATEGORIES the rest of the app uses
 * (assurance maladie / véhicule → insurance, téléphone / internet →
 * utilities, Netflix / Spotify / gym → subscriptions / leisure,
 * leasing / crédit → debt).
 */

type CandidateId =
  | "health_insurance"
  | "car_insurance"
  | "phone"
  | "internet"
  | "netflix"
  | "spotify"
  | "gym"
  | "leasing"
  | "credit"
  | "other_subscription";

interface Candidate {
  id: CandidateId;
  category: string; // EXPENSE_CATEGORIES id
  frequency: "monthly" | "yearly";
  /** Default amount placeholder — never auto-filled, just hinted. */
  hint: string;
}

const CANDIDATES: Candidate[] = [
  { id: "health_insurance", category: "insurance", frequency: "monthly", hint: "320" },
  { id: "car_insurance", category: "insurance", frequency: "monthly", hint: "80" },
  { id: "phone", category: "utilities", frequency: "monthly", hint: "30" },
  { id: "internet", category: "utilities", frequency: "monthly", hint: "60" },
  { id: "netflix", category: "subscriptions", frequency: "monthly", hint: "18" },
  { id: "spotify", category: "subscriptions", frequency: "monthly", hint: "13" },
  { id: "gym", category: "leisure", frequency: "monthly", hint: "70" },
  { id: "leasing", category: "transport", frequency: "monthly", hint: "350" },
  { id: "credit", category: "debt", frequency: "monthly", hint: "200" },
  { id: "other_subscription", category: "subscriptions", frequency: "monthly", hint: "10" },
];

interface CompletionAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** From completeness.missing — used to highlight relevant rows first. */
  missing: readonly MissingArea[] | readonly string[];
  currency: string;
}

interface RowState {
  enabled: boolean;
  amount: string;
}

export function CompletionAssistant({
  open,
  onOpenChange,
  missing,
  currency,
}: CompletionAssistantProps) {
  const t = useTranslations("dashboard.completeness.assistant");
  const tCandidate = useTranslations("dashboard.completeness.assistant.candidate");
  // Phase 3.1.6 — UX simplified: every row now has an amount field
  // ALWAYS visible with a sensible default value pre-filled. The
  // toggle stays as a way to opt out of a row entirely (the user
  // doesn't have a gym, for instance) but doesn't gate the amount
  // input anymore. Result: faster completion, fewer clicks.
  const [rows, setRows] = React.useState<Record<CandidateId, RowState>>(
    () => initRows(),
  );
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) setRows(initRows());
  }, [open]);

  // Sort candidates: those whose category is in `missing` first, so
  // the user sees the items LIBERIA's score thinks they're missing
  // up top, with the rest below.
  const missingCategorySet = React.useMemo(() => {
    const set = new Set<string>();
    for (const m of missing) {
      const area = typeof m === "string" ? m : m.area;
      // Map FinancialArea → EXPENSE_CATEGORIES id (telecom is
      // special-cased; the rest match by name).
      if (area === "telecom") set.add("utilities");
      else set.add(area);
    }
    return set;
  }, [missing]);

  const ordered = React.useMemo(() => {
    return CANDIDATES.slice().sort((a, b) => {
      const ai = missingCategorySet.has(a.category) ? 0 : 1;
      const bi = missingCategorySet.has(b.category) ? 0 : 1;
      return ai - bi;
    });
  }, [missingCategorySet]);

  const toggleRow = (id: CandidateId) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const setAmount = (id: CandidateId, amount: string) => {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], amount } }));
  };

  const onSubmit = async () => {
    const enabledRows: Array<{ id: CandidateId; amount: number }> = [];
    for (const c of CANDIDATES) {
      const row = rows[c.id];
      if (!row.enabled) continue;
      const parsed = Number(row.amount.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error(t("invalidAmount", { name: tCandidate(`${c.id}.label`) }));
        return;
      }
      enabledRows.push({ id: c.id, amount: parsed });
    }
    if (enabledRows.length === 0) {
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    const payload = enabledRows.map(({ id, amount }) => {
      const c = CANDIDATES.find((x) => x.id === id)!;
      return {
        label: tCandidate(`${c.id}.label`),
        amount,
        category: c.category as "housing", // schema enum: cast OK
        frequency: c.frequency,
        notes: null,
      };
    });
    const res = await bulkCreateExpensesAction(payload);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      t("savedToast", { count: payload.length, currency }),
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <ul className="max-h-[60vh] divide-y divide-border/40 overflow-y-auto -mx-6 px-6">
          {ordered.map((c) => {
            const row = rows[c.id];
            const relevant = missingCategorySet.has(c.category);
            return (
              <li
                key={c.id}
                className={cn(
                  "py-3 transition-colors",
                  relevant && "bg-[hsl(var(--gold)/0.04)] -mx-6 px-6",
                )}
              >
                {/*
                  Phase 3.1.6 — one row, three columns: label / amount /
                  toggle. The amount is always visible so the user can
                  scan all defaults in one pass; toggling the switch
                  opts the row in for submission.
                */}
                <div className="flex items-center gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <Label
                      htmlFor={`assistant-${c.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {tCandidate(`${c.id}.label`)}
                    </Label>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {tCandidate(`${c.id}.hint`)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => setAmount(c.id, e.target.value)}
                    placeholder={c.hint}
                    className={cn(
                      "w-24 text-right tabular-nums",
                      !row.enabled && "opacity-50",
                    )}
                    aria-label={t("perMonth", { currency })}
                  />
                  <Switch
                    id={`assistant-${c.id}`}
                    checked={row.enabled}
                    onCheckedChange={() => toggleRow(c.id)}
                    aria-label={t("toggleAria", {
                      name: tCandidate(`${c.id}.label`),
                    })}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="gold"
            disabled={submitting}
            onClick={() => void onSubmit()}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initRows(): Record<CandidateId, RowState> {
  // Phase 3.1.6 — pre-fill each row with its hint value so the user
  // sees plausible defaults the moment the modal opens. They can
  // tweak, clear, or toggle the row off. Rows stay disabled by
  // default — we don't want to insert ten expenses the user didn't
  // confirm.
  const o: Record<string, RowState> = {};
  for (const c of CANDIDATES) {
    o[c.id] = { enabled: false, amount: c.hint };
  }
  return o as Record<CandidateId, RowState>;
}

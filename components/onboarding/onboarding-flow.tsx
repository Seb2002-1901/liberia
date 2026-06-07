"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Loader2,
  MoreHorizontal,
  PiggyBank,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  FINANCIAL_SITUATIONS,
  GOAL_TYPES,
  ROUTES,
  type GoalTypeId,
} from "@/lib/constants";
import { onboardingSchema } from "@/lib/validations/finance";
import { completeOnboarding, skipOnboarding } from "@/app/actions/onboarding";
import { cn } from "@/lib/utils";

/**
 * Phase 4.0 — Onboarding réduit de 8 étapes à 3.
 *
 * Étape 1 — "Toi" : situation + revenu mensuel.
 * Étape 2 — "Tes 4 charges principales" : logement / assurances /
 *           alimentation / transport, chaque catégorie pouvant être
 *           marquée "je ne sais pas" (= null, honnête, le coach
 *           demandera plus tard).
 * Étape 3 — "Ton objectif principal" : 7 cards visuelles, skippable.
 *
 * Les anciens champs (savings, debt, behavior, stress, insight) ne
 * sont plus demandés à l'onboarding. Defaults au submit, le coach
 * récupère les informations manquantes au fil des conversations.
 */

type StepKey = "you" | "fixed_costs" | "main_goal";

const STEP_KEYS: readonly StepKey[] = ["you", "fixed_costs", "main_goal"];

const GOAL_ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Banknote,
  PiggyBank,
  ShoppingBag,
  Plane,
  TrendingUp,
  Target,
  MoreHorizontal,
};

/**
 * Phase 4.0 — 4 catégories majeures saisies à l'onboarding. Chaque
 * champ accepte un nombre OU null ("je ne sais pas").
 * null → pas d'expense entry créée → FHS Couverture honnête (le
 * coach demandera). 0 et null sont distincts : 0 = "je n'en ai pas"
 * (entry créée à 0), null = "je ne sais pas" (pas d'entry).
 */
type ExpenseBreakdown = {
  housing: number | null;
  insurance: number | null;
  food: number | null;
  transport: number | null;
};

type FormState = {
  situation: "struggling" | "tight" | "stable" | "comfortable";
  monthlyIncome: number | "";
  expenseBreakdown: ExpenseBreakdown;
  /** null = user a choisi "Passer cette étape" — le coach proposera J3. */
  mainGoal: GoalTypeId | null;
};

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    situation: "tight",
    monthlyIncome: "",
    expenseBreakdown: {
      housing: null,
      insurance: null,
      food: null,
      transport: null,
    },
    mainGoal: null,
  });

  const currentKey = STEP_KEYS[step];
  const progress = ((step + 1) / STEP_KEYS.length) * 100;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateExpense = (
    cat: keyof ExpenseBreakdown,
    value: number | null,
  ) =>
    setForm((prev) => ({
      ...prev,
      expenseBreakdown: { ...prev.expenseBreakdown, [cat]: value },
    }));

  const next = () => setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = (): boolean => {
    switch (currentKey) {
      case "you":
        return (
          Boolean(form.situation) &&
          form.monthlyIncome !== "" &&
          Number(form.monthlyIncome) >= 0
        );
      case "fixed_costs": {
        // Au moins UNE catégorie renseignée avec un montant ≥ 0
        // (un montant = 0 est valide, "je ne sais pas" = null ne l'est pas).
        const vals = Object.values(form.expenseBreakdown);
        return vals.some((v) => v !== null && v >= 0);
      }
      case "main_goal":
        return true; // skippable
    }
  };

  const submit = async () => {
    const { housing, insurance, food, transport } = form.expenseBreakdown;
    const knownExpenses = [housing, insurance, food, transport].filter(
      (v): v is number => v !== null,
    );
    const monthlyExpenses = knownExpenses.reduce((sum, v) => sum + v, 0);

    const payload = {
      situation: form.situation,
      monthlyIncome: Number(form.monthlyIncome) || 0,
      monthlyExpenses,
      // Defaults pour les champs différés (coach demandera J3-J7).
      currentSavings: 0,
      monthlyDebt: 0,
      hasEmergencyFund: false,
      mainGoal: form.mainGoal ?? "emergency_fund",
      perceivedStress: 3,
      behaviorTraits: [],
      // Phase 4.0 — breakdown détaillé : la server action crée 4
      // expense entries dans la table `expenses` (1 par catégorie
      // non-null), ce qui peuple immédiatement la Couverture FHS.
      expenseBreakdown: {
        housing,
        insurance,
        food,
        transport,
      },
    };
    const parsed = onboardingSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("submit.invalidPayload"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await completeOnboarding(parsed.data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("submit.successTitle"), {
        description: t("submit.successBody"),
      });
      router.push(ROUTES.dashboard);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <BrandMark />
        <form action={skipOnboarding}>
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("skip")}
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("stepCounter", { current: step + 1, total: STEP_KEYS.length })}
          </span>
          <span>{Math.round(progress)} %</span>
        </div>
        <Progress
          value={progress}
          indicatorClassName="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-muted))]"
        />
      </div>

      <div className="my-auto py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
                {t(`steps.${currentKey}.eyebrow`)}
              </p>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t(`steps.${currentKey}.title`)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(`steps.${currentKey}.subtitle`)}
              </p>
            </div>
            <StepContent
              step={currentKey}
              form={form}
              update={update}
              updateExpense={updateExpense}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="h-4 w-4" /> {t("actions.back")}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button
            type="button"
            variant="gold"
            disabled={!canContinue() || submitting}
            onClick={next}
          >
            {t("actions.continue")} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="gold"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("actions.finish")} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Steps                                                                      */
/* -------------------------------------------------------------------------- */

function StepContent({
  step,
  form,
  update,
  updateExpense,
}: {
  step: StepKey;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateExpense: (cat: keyof ExpenseBreakdown, value: number | null) => void;
}) {
  const t = useTranslations("onboarding");
  switch (step) {
    case "you":
      return (
        <div className="space-y-6">
          <RadioGroup
            value={form.situation}
            onValueChange={(v) => update("situation", v as FormState["situation"])}
            className="space-y-2"
          >
            {FINANCIAL_SITUATIONS.map((opt) => (
              <label
                key={opt.id}
                htmlFor={opt.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  form.situation === opt.id
                    ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.04)]"
                    : "border-border/60 hover:bg-card/60",
                )}
              >
                <RadioGroupItem value={opt.id} id={opt.id} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {t(`situations.${opt.id}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`situations.${opt.id}.description`)}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="income">{t("steps.you.incomeLabel")}</Label>
            <Input
              id="income"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder={t("steps.you.incomePlaceholder")}
              value={form.monthlyIncome}
              onChange={(e) =>
                update(
                  "monthlyIncome",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              {t("steps.you.incomeHelper")}
            </p>
          </div>
        </div>
      );

    case "fixed_costs": {
      const categories: Array<{
        id: keyof ExpenseBreakdown;
        placeholderKey: string;
      }> = [
        { id: "housing", placeholderKey: "housingPlaceholder" },
        { id: "insurance", placeholderKey: "insurancePlaceholder" },
        { id: "food", placeholderKey: "foodPlaceholder" },
        { id: "transport", placeholderKey: "transportPlaceholder" },
      ];
      return (
        <div className="space-y-4">
          {categories.map((cat) => {
            const value = form.expenseBreakdown[cat.id];
            const unknown = value === null;
            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={`exp-${cat.id}`}>
                    {t(`steps.fixed_costs.${cat.id}Label`)}
                  </Label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={unknown}
                      onCheckedChange={(v) =>
                        updateExpense(cat.id, v === true ? null : 0)
                      }
                    />
                    {t("steps.fixed_costs.unknown")}
                  </label>
                </div>
                <Input
                  id={`exp-${cat.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  disabled={unknown}
                  placeholder={t(`steps.fixed_costs.${cat.placeholderKey}`)}
                  value={unknown ? "" : value ?? ""}
                  onChange={(e) =>
                    updateExpense(
                      cat.id,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            {t("steps.fixed_costs.helper")}
          </p>
        </div>
      );
    }

    case "main_goal":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GOAL_TYPES.map((g) => {
              const Icon = GOAL_ICONS[g.icon] ?? Target;
              const active = form.mainGoal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => update("mainGoal", g.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                    active
                      ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.06)]"
                      : "border-border/60 hover:border-border hover:bg-card/60",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      active
                        ? "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">
                    {t(`goals.${g.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => update("mainGoal", null)}
            className={cn(
              "w-full rounded-2xl border border-dashed p-3 text-xs transition-colors",
              form.mainGoal === null
                ? "border-[hsl(var(--gold)/0.4)] text-foreground"
                : "border-border/60 text-muted-foreground hover:bg-card/40",
            )}
          >
            {t("steps.main_goal.skip")}
          </button>
        </div>
      );
  }
}

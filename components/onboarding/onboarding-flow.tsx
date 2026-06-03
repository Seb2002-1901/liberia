"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Compass,
  EyeOff,
  Flame,
  HeartPulse,
  ListChecks,
  Loader2,
  MoreHorizontal,
  PiggyBank,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Zap,
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
  BEHAVIOR_TRAITS,
  FINANCIAL_SITUATIONS,
  GOAL_TYPES,
  ROUTES,
  STRESS_LEVELS,
  type BehaviorTraitId,
} from "@/lib/constants";
import { onboardingSchema } from "@/lib/validations/finance";
import { completeOnboarding, skipOnboarding } from "@/app/actions/onboarding";
import { generateLocalInsight } from "@/lib/insights/local";
import { cn } from "@/lib/utils";

type StepKey =
  | "situation"
  | "income"
  | "expenses"
  | "savings"
  | "goal"
  | "behavior"
  | "stress"
  | "insight";

const STEP_KEYS: readonly StepKey[] = [
  "situation",
  "income",
  "expenses",
  "savings",
  "goal",
  "behavior",
  "stress",
  "insight",
] as const;

const GOAL_ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Banknote,
  PiggyBank,
  ShoppingBag,
  Plane,
  Target,
  MoreHorizontal,
};

const BEHAVIOR_ICONS: Record<string, LucideIcon> = {
  Zap,
  EyeOff,
  ListChecks,
  HeartPulse,
  Flame,
  Compass,
  ShieldCheck,
  Sparkles,
};

type FormState = {
  situation: "struggling" | "tight" | "stable" | "comfortable";
  monthlyIncome: number | "";
  monthlyExpenses: number | "";
  currentSavings: number | "";
  monthlyDebt: number | "";
  hasEmergencyFund: boolean;
  mainGoal: (typeof GOAL_TYPES)[number]["id"];
  behaviorTraits: BehaviorTraitId[];
  perceivedStress: number;
};

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    situation: "tight",
    monthlyIncome: "",
    monthlyExpenses: "",
    currentSavings: "",
    monthlyDebt: "",
    hasEmergencyFund: false,
    mainGoal: "emergency_fund",
    behaviorTraits: [],
    perceivedStress: 3,
  });

  const currentKey = STEP_KEYS[step];
  const progress = ((step + 1) / STEP_KEYS.length) * 100;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTrait = (id: BehaviorTraitId) =>
    setForm((prev) => ({
      ...prev,
      behaviorTraits: prev.behaviorTraits.includes(id)
        ? prev.behaviorTraits.filter((tr) => tr !== id)
        : [...prev.behaviorTraits, id],
    }));

  const next = () => setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = (): boolean => {
    switch (currentKey) {
      case "situation":
        return Boolean(form.situation);
      case "income":
        return form.monthlyIncome !== "" && Number(form.monthlyIncome) >= 0;
      case "expenses":
        return form.monthlyExpenses !== "" && Number(form.monthlyExpenses) >= 0;
      case "savings":
        return form.currentSavings !== "" && Number(form.currentSavings) >= 0;
      case "goal":
        return Boolean(form.mainGoal);
      case "behavior":
        return true; // multi-select facultatif
      case "stress":
        return form.perceivedStress >= 1 && form.perceivedStress <= 5;
      case "insight":
        return true;
    }
  };

  const submit = async () => {
    const payload = {
      situation: form.situation,
      monthlyIncome: Number(form.monthlyIncome) || 0,
      monthlyExpenses: Number(form.monthlyExpenses) || 0,
      currentSavings: Number(form.currentSavings) || 0,
      monthlyDebt: Number(form.monthlyDebt) || 0,
      hasEmergencyFund: form.hasEmergencyFund,
      mainGoal: form.mainGoal,
      perceivedStress: form.perceivedStress,
      behaviorTraits: form.behaviorTraits,
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
                {currentKey === "insight"
                  ? t("eyebrowFirstInsight")
                  : t("eyebrowOnboarding")}
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
              toggleTrait={toggleTrait}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={back}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="h-4 w-4" /> {t("actions.back")}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button
            variant="gold"
            size="lg"
            onClick={next}
            disabled={!canContinue()}
          >
            {t("actions.continue")} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="gold"
            size="lg"
            onClick={submit}
            disabled={!canContinue() || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("actions.finish")}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepContent({
  step,
  form,
  update,
  toggleTrait,
}: {
  step: StepKey;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleTrait: (id: BehaviorTraitId) => void;
}) {
  const t = useTranslations("onboarding");
  switch (step) {
    case "situation":
      return (
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
      );
    case "income":
      return (
        <div className="space-y-3">
          <Label htmlFor="income">{t("steps.income.label")}</Label>
          <Input
            id="income"
            type="number"
            min={0}
            step="0.01"
            placeholder={t("steps.income.placeholder")}
            value={form.monthlyIncome}
            onChange={(e) =>
              update(
                "monthlyIncome",
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            {t("steps.income.helper")}
          </p>
        </div>
      );
    case "expenses":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expenses">{t("steps.expenses.expensesLabel")}</Label>
            <Input
              id="expenses"
              type="number"
              min={0}
              step="0.01"
              placeholder={t("steps.expenses.expensesPlaceholder")}
              value={form.monthlyExpenses}
              onChange={(e) =>
                update(
                  "monthlyExpenses",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt">{t("steps.expenses.debtLabel")}</Label>
            <Input
              id="debt"
              type="number"
              min={0}
              step="0.01"
              placeholder={t("steps.expenses.debtPlaceholder")}
              value={form.monthlyDebt}
              onChange={(e) =>
                update(
                  "monthlyDebt",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
        </div>
      );
    case "savings":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="savings">{t("steps.savings.label")}</Label>
            <Input
              id="savings"
              type="number"
              min={0}
              step="0.01"
              placeholder={t("steps.savings.placeholder")}
              value={form.currentSavings}
              onChange={(e) =>
                update(
                  "currentSavings",
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
            />
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border/60 p-4">
            <Checkbox
              checked={form.hasEmergencyFund}
              onCheckedChange={(v) => update("hasEmergencyFund", v === true)}
            />
            <div>
              <p className="text-sm font-medium">
                {t("steps.savings.emergencyFundTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("steps.savings.emergencyFundHelper")}
              </p>
            </div>
          </label>
        </div>
      );
    case "goal":
      return (
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
                <span className="text-sm font-medium">{t(`goals.${g.id}`)}</span>
              </button>
            );
          })}
        </div>
      );
    case "behavior":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BEHAVIOR_TRAITS.map((tr) => {
            const Icon = BEHAVIOR_ICONS[tr.icon] ?? Sparkles;
            const active = form.behaviorTraits.includes(tr.id);
            return (
              <button
                key={tr.id}
                type="button"
                onClick={() => toggleTrait(tr.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  active
                    ? "border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.06)]"
                    : "border-border/60 hover:border-border hover:bg-card/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    active
                      ? "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
                      : "bg-secondary text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {t(`traits.${tr.id}.label`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`traits.${tr.id}.description`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      );
    case "stress":
      return (
        <RadioGroup
          value={String(form.perceivedStress)}
          onValueChange={(v) => update("perceivedStress", Number(v))}
          className="space-y-2"
        >
          {STRESS_LEVELS.map((s) => (
            <label
              key={s.value}
              htmlFor={`stress-${s.value}`}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-colors",
                form.perceivedStress === s.value
                  ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.04)]"
                  : "border-border/60 hover:bg-card/60",
              )}
            >
              <span className="flex items-center gap-3">
                <RadioGroupItem
                  value={String(s.value)}
                  id={`stress-${s.value}`}
                />
                <span className="text-sm font-medium">
                  {t(`stressLevels.${s.value}`)}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {s.value}/5
              </span>
            </label>
          ))}
        </RadioGroup>
      );
    case "insight":
      return <InsightStep form={form} />;
  }
}

function InsightStep({ form }: { form: FormState }) {
  const t = useTranslations("onboarding.steps.insight");
  const tParent = useTranslations("onboarding");
  const insight = React.useMemo(
    () =>
      generateLocalInsight({
        monthlyIncome: Number(form.monthlyIncome) || 0,
        monthlyExpenses: Number(form.monthlyExpenses) || 0,
        currentSavings: Number(form.currentSavings) || 0,
        monthlyDebt: Number(form.monthlyDebt) || 0,
        hasEmergencyFund: form.hasEmergencyFund,
        perceivedStress: form.perceivedStress,
        situation: form.situation,
        mainGoal: form.mainGoal,
        behaviorTraits: form.behaviorTraits,
      }),
    [form],
  );

  const toneAccent =
    insight.tone === "warning"
      ? "from-[hsl(var(--warning)/0.12)]"
      : insight.tone === "positive"
        ? "from-[hsl(var(--success)/0.12)]"
        : "from-[hsl(var(--gold)/0.12)]";

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.25)] bg-gradient-to-br via-card/40 to-card/40 p-6 shadow-[0_30px_80px_-40px_hsl(var(--gold)/0.35)]",
          toneAccent,
        )}
      >
        <div className="flex items-center gap-2 text-[hsl(var(--gold))]">
          <Sparkles className="h-4 w-4" />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em]">
            {tParent("eyebrowFirstInsight")}
          </p>
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold leading-snug sm:text-2xl">
          {insight.headline}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{insight.body}</p>
        {insight.metric && (
          <div className="mt-5 inline-flex flex-col rounded-xl border border-border/60 bg-background/60 px-4 py-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {insight.metricLabel}
            </span>
            <span className="mt-0.5 font-display text-lg font-semibold text-[hsl(var(--gold))]">
              {insight.metric}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("nextAction")}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed">
              {insight.nextAction}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}

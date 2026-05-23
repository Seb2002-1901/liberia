"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  FINANCIAL_SITUATIONS,
  GOAL_TYPES,
  ROUTES,
  STRESS_LEVELS,
} from "@/lib/constants";
import { onboardingSchema } from "@/lib/validations/finance";
import { completeOnboarding, skipOnboarding } from "@/app/actions/onboarding";

type StepKey = "situation" | "income" | "expenses" | "savings" | "goal" | "stress";

const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: "situation", title: "Comment te sens-tu financièrement ?", subtitle: "Aucun jugement, juste pour calibrer." },
  { key: "income", title: "Tes revenus mensuels.", subtitle: "Ce qui rentre vraiment, après impôts." },
  { key: "expenses", title: "Tes dépenses mensuelles.", subtitle: "Estimation honnête, c'est largement suffisant." },
  { key: "savings", title: "Ton épargne disponible.", subtitle: "Liquidités accessibles, hors immobilier." },
  { key: "goal", title: "Quel objectif tu vises ?", subtitle: "Un seul à la fois, c'est plus efficace." },
  { key: "stress", title: "Ton niveau de stress.", subtitle: "Pour suivre ta tranquillité dans le temps." },
];

type FormState = {
  situation: "struggling" | "tight" | "stable" | "comfortable";
  monthlyIncome: number | "";
  monthlyExpenses: number | "";
  currentSavings: number | "";
  monthlyDebt: number | "";
  hasEmergencyFund: boolean;
  mainGoal: (typeof GOAL_TYPES)[number]["id"];
  perceivedStress: number;
};

export function OnboardingFlow() {
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
    perceivedStress: 3,
  });

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = (): boolean => {
    switch (current.key) {
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
      case "stress":
        return form.perceivedStress >= 1 && form.perceivedStress <= 5;
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
    };
    const parsed = onboardingSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    setSubmitting(true);
    try {
      const res = await completeOnboarding(parsed.data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profil financier créé.", {
        description: "On a tout ce qu'il faut pour démarrer.",
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
            Passer pour l'instant
          </button>
        </form>
      </div>

      <div className="mt-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Étape {step + 1} / {STEPS.length}
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
            key={current.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--gold))]">
                Onboarding
              </p>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {current.title}
              </h1>
              <p className="text-sm text-muted-foreground">{current.subtitle}</p>
            </div>

            <StepContent step={current.key} form={form} update={update} />
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
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="gold"
            size="lg"
            onClick={next}
            disabled={!canContinue()}
          >
            Continuer <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="gold"
            size="lg"
            onClick={submit}
            disabled={!canContinue() || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Terminer
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
}: {
  step: StepKey;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
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
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                form.situation === opt.id
                  ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.04)]"
                  : "border-border/60 hover:bg-card/60"
              }`}
            >
              <RadioGroupItem value={opt.id} id={opt.id} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      );
    case "income":
      return (
        <div className="space-y-3">
          <Label htmlFor="income">Revenus mensuels nets</Label>
          <Input
            id="income"
            type="number"
            min={0}
            step="0.01"
            placeholder="2 400"
            value={form.monthlyIncome}
            onChange={(e) => update("monthlyIncome", e.target.value === "" ? "" : Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Indique le total qui rentre chaque mois, toutes sources confondues.
          </p>
        </div>
      );
    case "expenses":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expenses">Dépenses mensuelles estimées</Label>
            <Input
              id="expenses"
              type="number"
              min={0}
              step="0.01"
              placeholder="1 900"
              value={form.monthlyExpenses}
              onChange={(e) => update("monthlyExpenses", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt">Remboursements crédits / dettes mensuels</Label>
            <Input
              id="debt"
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={form.monthlyDebt}
              onChange={(e) => update("monthlyDebt", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      );
    case "savings":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="savings">Épargne disponible</Label>
            <Input
              id="savings"
              type="number"
              min={0}
              step="0.01"
              placeholder="1 200"
              value={form.currentSavings}
              onChange={(e) => update("currentSavings", e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border/60 p-4">
            <Checkbox
              checked={form.hasEmergencyFund}
              onCheckedChange={(v) => update("hasEmergencyFund", v === true)}
            />
            <div>
              <p className="text-sm font-medium">J'ai un fonds d'urgence dédié</p>
              <p className="text-xs text-muted-foreground">
                Un montant séparé, intouchable sauf urgence (3-6 mois de dépenses idéalement).
              </p>
            </div>
          </label>
        </div>
      );
    case "goal":
      return (
        <div className="space-y-2">
          <Label>Objectif prioritaire</Label>
          <Select
            value={form.mainGoal}
            onValueChange={(v) => update("mainGoal", v as FormState["mainGoal"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Tu pourras en créer plusieurs ensuite. Un objectif clair = de meilleures décisions.
          </p>
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
              className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition-colors ${
                form.perceivedStress === s.value
                  ? "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.04)]"
                  : "border-border/60 hover:bg-card/60"
              }`}
            >
              <span className="flex items-center gap-3">
                <RadioGroupItem
                  value={String(s.value)}
                  id={`stress-${s.value}`}
                />
                <span className="text-sm font-medium">{s.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {s.value}/5
              </span>
            </label>
          ))}
        </RadioGroup>
      );
  }
}

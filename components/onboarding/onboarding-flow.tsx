"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
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
import {
  FINANCIAL_SITUATIONS,
  GOAL_TYPES,
  ROUTES,
  type GoalTypeId,
} from "@/lib/constants";
import { onboardingSchema } from "@/lib/validations/finance";
import { completeOnboarding, skipOnboarding } from "@/app/actions/onboarding";

/**
 * Refonte V3 — Phase Auth-V3 / Onboarding.
 *
 * Logique CRITIQUE inchangée :
 *  - StepKey state machine 3 étapes (you, fixed_costs, main_goal)
 *  - FormState : situation, monthlyIncome, expenseBreakdown, mainGoal
 *  - ExpenseBreakdown : null = "Je ne sais pas" ≠ 0 = "Je n'en ai pas"
 *  - mainGoal nullable (skip explicite)
 *  - canContinue() gating boutons par step
 *  - submit() avec onboardingSchema.safeParse + completeOnboarding
 *  - skipOnboarding form action préservé
 *  - framer-motion AnimatePresence transitions opacity/y
 *  - router.push(ROUTES.dashboard) après succès (= V3 dashboard direct)
 *
 * JSX visuel : charte navy V3 inline (tokens C, Outfit, Inter, ombres).
 * Plus de dépendance shadcn (Button, Input, Label, Progress, Checkbox,
 * RadioGroup).
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

type ExpenseBreakdown = {
  housing: number | null;
  insurance: number | null;
  food: number | null;
  transport: number | null;
};

type Situation = "struggling" | "tight" | "stable" | "comfortable";

type FormState = {
  /** null = choix non encore actif (évite pré-cocher une situation
   *  qui biaiserait la lecture FHS dès J0). */
  situation: Situation | null;
  monthlyIncome: number | "";
  expenseBreakdown: ExpenseBreakdown;
  mainGoal: GoalTypeId | null;
};

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  success: "#10A37F",
  danger: "#DC2626",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";
const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState<FormState>({
    situation: null,
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
          form.situation !== null &&
          form.monthlyIncome !== "" &&
          Number(form.monthlyIncome) >= 0
        );
      case "fixed_costs": {
        const vals = Object.values(form.expenseBreakdown);
        return vals.some((v) => v !== null && v >= 0);
      }
      case "main_goal":
        return true;
    }
  };

  const submit = async () => {
    const { housing, insurance, food, transport } = form.expenseBreakdown;
    const knownExpenses = [housing, insurance, food, transport].filter(
      (v): v is number => v !== null,
    );
    const monthlyExpenses = knownExpenses.reduce((sum, v) => sum + v, 0);

    const payload = {
      // Si l'utilisateur a sauté la question situation (théoriquement
      // bloqué par canContinue, mais ceinture+bretelles), on assume
      // "tight" comme défaut pédagogique côté serveur.
      situation: form.situation ?? "tight",
      monthlyIncome: Number(form.monthlyIncome) || 0,
      monthlyExpenses,
      currentSavings: 0,
      monthlyDebt: 0,
      hasEmergencyFund: false,
      mainGoal: form.mainGoal ?? "emergency_fund",
      perceivedStress: 3,
      behaviorTraits: [],
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.pageBg,
        fontFamily: FONT_STACK,
        color: C.textDark,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          aria-label="LIBERIA"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              backgroundColor: C.navy,
              borderRadius: 8,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20V6" />
              <path d="M4 20h14" />
              <path d="M8 14l4-4 3 3 5-6" />
            </svg>
          </span>
          <span
            style={{
              color: C.navy,
              letterSpacing: "0.16em",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            LIBERIA
          </span>
        </Link>
        <form action={skipOnboarding}>
          <button
            type="submit"
            style={{
              fontSize: 12.5,
              color: C.textMuted,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 4,
            }}
          >
            {t("skip")}
          </button>
        </form>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 640,
          width: "100%",
          margin: "0 auto",
          padding: "16px 24px 40px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11.5,
              color: C.textMuted,
              fontWeight: 500,
              letterSpacing: "0.04em",
            }}
          >
            <span>
              {t("stepCounter", { current: step + 1, total: STEP_KEYS.length })}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progress)} %
            </span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              backgroundColor: C.borderGhost,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.primary}, ${C.navy})`,
                borderRadius: 999,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <div
          style={{
            margin: "auto 0",
            padding: "40px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.primary,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  {t(`steps.${currentKey}.eyebrow`)}
                </p>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: C.textDark,
                    lineHeight: 1.15,
                  }}
                >
                  {t(`steps.${currentKey}.title`)}
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: C.textMuted,
                    lineHeight: 1.55,
                  }}
                >
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

        <footer
          style={{
            paddingTop: 24,
            borderTop: `1px solid ${C.borderGhost}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              backgroundColor: "transparent",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              color: step === 0 || submitting ? C.textLight : C.textDark,
              cursor: step === 0 || submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              borderRadius: 8,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("actions.back")}
          </button>

          {!canContinue() && step < STEP_KEYS.length - 1 && (
            <span
              style={{
                fontSize: 11.5,
                color: C.textMuted,
                fontStyle: "italic",
                maxWidth: 200,
                textAlign: "right",
                lineHeight: 1.4,
              }}
            >
              {currentKey === "you"
                ? "Choisis ta situation et renseigne ton revenu pour continuer."
                : "Renseigne au moins une catégorie."}
            </span>
          )}

          {step < STEP_KEYS.length - 1 ? (
            <NavyCta
              disabled={!canContinue() || submitting}
              onClick={next}
            >
              {t("actions.continue")}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </NavyCta>
          ) : (
            <NavyCta
              disabled={submitting}
              loading={submitting}
              onClick={submit}
            >
              {!submitting && (
                <>
                  {t("actions.finish")}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </NavyCta>
          )}
        </footer>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function NavyCta({
  children,
  disabled,
  loading = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 22px",
        backgroundColor: C.navy,
        color: "white",
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        borderRadius: 11,
        fontFamily: "inherit",
        transition: "opacity 0.15s ease",
      }}
    >
      {loading && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden
          style={{ animation: "v3-spin 0.7s linear infinite" }}
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="white"
            strokeOpacity="0.3"
            strokeWidth="2.5"
          />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
      <style>{`@keyframes v3-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

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
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            role="radiogroup"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {FINANCIAL_SITUATIONS.map((opt) => {
              const active = form.situation === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => update("situation", opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: `1px solid ${active ? C.primary : C.borderGhost}`,
                    backgroundColor: active ? C.primaryBg : C.cardBg,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition:
                      "border-color 0.15s ease, background-color 0.15s ease",
                    boxShadow: SHADOW.card,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      border: `2px solid ${active ? C.navy : C.textLight}`,
                      backgroundColor: C.cardBg,
                      marginTop: 2,
                      position: "relative",
                    }}
                  >
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 3,
                          borderRadius: 999,
                          backgroundColor: C.navy,
                        }}
                      />
                    )}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.textDark,
                        lineHeight: 1.35,
                      }}
                    >
                      {t(`situations.${opt.id}.label`)}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12.5,
                        color: C.textMuted,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {t(`situations.${opt.id}.description`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <V3InputField
            id="income"
            label={t("steps.you.incomeLabel")}
            placeholder={t("steps.you.incomePlaceholder")}
            helper={t("steps.you.incomeHelper")}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.monthlyIncome}
            onChange={(v) =>
              update("monthlyIncome", v === "" ? "" : Number(v))
            }
          />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {categories.map((cat) => {
            const value = form.expenseBreakdown[cat.id];
            const unknown = value === null;
            return (
              <div
                key={cat.id}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <label
                    htmlFor={`exp-${cat.id}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.textDark,
                    }}
                  >
                    {t(`steps.fixed_costs.${cat.id}Label`)}
                  </label>
                  <UnknownToggle
                    checked={unknown}
                    onChange={(v) =>
                      updateExpense(cat.id, v ? null : 0)
                    }
                    label={t("steps.fixed_costs.unknown")}
                  />
                </div>
                <input
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
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${C.borderGhost}`,
                    backgroundColor: unknown ? C.pageBg : C.cardBg,
                    fontSize: 16,
                    color: unknown ? C.textLight : C.textDark,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            );
          })}
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: C.textMuted,
              lineHeight: 1.5,
            }}
          >
            {t("steps.fixed_costs.helper")}
          </p>
        </div>
      );
    }

    case "main_goal":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Media query inline : à partir de 480 px on bascule à 2
              colonnes ; en-dessous, on stack en 1 colonne pour éviter
              tout overflow des labels longs sur iPhone SE. */}
          <style>{`
            @media (max-width: 479px) {
              [data-onb-goal-grid] { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <div
            data-onb-goal-grid
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {GOAL_TYPES.map((g) => {
              const Icon = GOAL_ICONS[g.icon] ?? Target;
              const active = form.mainGoal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => update("mainGoal", g.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 14px",
                    borderRadius: 12,
                    border: `1px solid ${active ? C.primary : C.borderGhost}`,
                    backgroundColor: active ? C.primaryBg : C.cardBg,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition:
                      "border-color 0.15s ease, background-color 0.15s ease",
                    boxShadow: SHADOW.card,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: active ? C.navy : C.pageBg,
                      color: active ? "white" : C.textDark,
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                  </span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: C.textDark,
                      lineHeight: 1.35,
                    }}
                  >
                    {t(`goals.${g.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => update("mainGoal", null)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 11,
              border: `1px dashed ${
                form.mainGoal === null ? C.primary : C.borderGhost
              }`,
              backgroundColor: "transparent",
              fontSize: 12.5,
              color: form.mainGoal === null ? C.textDark : C.textMuted,
              fontWeight: form.mainGoal === null ? 600 : 500,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
          >
            {t("steps.main_goal.skip")}
          </button>
        </div>
      );
  }
}

function V3InputField({
  id,
  label,
  placeholder,
  helper,
  type,
  inputMode,
  min,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  helper?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  step?: string | number;
  value: number | "";
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.textDark,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "13px 14px",
          borderRadius: 10,
          border: `1px solid ${C.borderGhost}`,
          backgroundColor: C.cardBg,
          fontSize: 16,
          color: C.textDark,
          fontFamily: "inherit",
          outline: "none",
        }}
      />
      {helper && (
        <p
          style={{
            margin: 0,
            fontSize: 11.5,
            color: C.textMuted,
            lineHeight: 1.4,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}

function UnknownToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 9px",
        borderRadius: 999,
        backgroundColor: checked ? C.primaryBg : "transparent",
        border: `1px solid ${checked ? C.primary : C.borderGhost}`,
        fontSize: 11,
        fontWeight: 500,
        color: checked ? C.primary : C.textMuted,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 13,
          height: 13,
          borderRadius: 4,
          border: `1.5px solid ${checked ? C.primary : C.textLight}`,
          backgroundColor: checked ? C.primary : "transparent",
        }}
      >
        {checked && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

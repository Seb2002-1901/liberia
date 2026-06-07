import { z } from "zod";
import {
  BEHAVIOR_TRAITS,
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  GOAL_TYPES,
  INCOME_CATEGORIES,
} from "@/lib/constants";

const incomeCategoryIds = INCOME_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];
const expenseCategoryIds = EXPENSE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];
const frequencyIds = FREQUENCIES.map((f) => f.id) as [string, ...string[]];
const goalTypeIds = GOAL_TYPES.map((g) => g.id) as [string, ...string[]];
const behaviorTraitIds = BEHAVIOR_TRAITS.map((b) => b.id) as [string, ...string[]];

// Validation messages are stable keys ("errors.validation.*"). Each
// form passes the key through useTranslations("errors") so the user
// sees the field error in their profile language. Keeping the keys
// here (rather than the translated phrase) means the schema is the
// same object whatever locale renders it.
export const incomeSchema = z.object({
  label: z
    .string()
    .min(1, "errors.validation.labelRequired")
    .max(80),
  amount: z.coerce
    .number({ invalid_type_error: "errors.validation.amountInvalid" })
    .min(0, "errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  category: z.enum(incomeCategoryIds),
  frequency: z.enum(frequencyIds),
  notes: z.string().max(280).optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeSchema>;

export const expenseSchema = z.object({
  label: z
    .string()
    .min(1, "errors.validation.labelRequired")
    .max(80),
  amount: z.coerce
    .number({ invalid_type_error: "errors.validation.amountInvalid" })
    .min(0, "errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  category: z.enum(expenseCategoryIds),
  frequency: z.enum(frequencyIds),
  notes: z.string().max(280).optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const goalSchema = z
  .object({
    title: z
      .string()
      .min(1, "errors.validation.titleRequired")
      .max(80),
    type: z.enum(goalTypeIds),
    targetAmount: z.coerce
      .number()
      .min(1, "errors.validation.amountGtZero")
      .max(10_000_000, "errors.validation.amountTooHighShort"),
    currentAmount: z.coerce
      .number()
      .min(0, "errors.validation.amountGteZero")
      .max(10_000_000, "errors.validation.amountTooHighShort")
      .default(0),
    deadline: z
      .string()
      .optional()
      .nullable()
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        "errors.validation.dateInvalid",
      ),
    notes: z.string().max(280).optional().nullable(),
  })
  .refine((data) => data.currentAmount <= data.targetAmount, {
    message: "errors.validation.currentExceedsTarget",
    path: ["currentAmount"],
  });

export type GoalInput = z.infer<typeof goalSchema>;

/**
 * Phase 4.0 — expense breakdown optional. When provided, the server
 * action creates 4 expense entries (one per non-null category) in
 * the `expenses` table, which immediately fuels FHS Couverture. When
 * absent (legacy flow), only the aggregate `monthlyExpenses` is
 * stored on the financial_profile.
 *
 * Each category accepts a number ≥ 0 OR null ("je ne sais pas" =
 * pas d'entry créée, le coach demandera plus tard).
 */
const expenseBreakdownSchema = z
  .object({
    housing: z.number().min(0).max(10_000_000).nullable(),
    insurance: z.number().min(0).max(10_000_000).nullable(),
    food: z.number().min(0).max(10_000_000).nullable(),
    transport: z.number().min(0).max(10_000_000).nullable(),
  })
  .optional();

export const onboardingSchema = z.object({
  situation: z.enum(["struggling", "tight", "stable", "comfortable"]),
  monthlyIncome: z.coerce.number().min(0).max(10_000_000),
  monthlyExpenses: z.coerce.number().min(0).max(10_000_000),
  currentSavings: z.coerce.number().min(0).max(100_000_000),
  hasEmergencyFund: z.boolean().default(false),
  monthlyDebt: z.coerce.number().min(0).max(10_000_000).default(0),
  mainGoal: z.enum(goalTypeIds).default("emergency_fund"),
  perceivedStress: z.coerce.number().min(1).max(5),
  behaviorTraits: z.array(z.enum(behaviorTraitIds)).max(8).default([]),
  expenseBreakdown: expenseBreakdownSchema,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

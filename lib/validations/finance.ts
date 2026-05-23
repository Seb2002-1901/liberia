import { z } from "zod";
import {
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

export const incomeSchema = z.object({
  label: z.string().min(1, "Libellé requis").max(80),
  amount: z.coerce
    .number({ invalid_type_error: "Montant invalide" })
    .min(0, "Montant positif")
    .max(10_000_000, "Montant trop élevé"),
  category: z.enum(incomeCategoryIds),
  frequency: z.enum(frequencyIds),
  notes: z.string().max(280).optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeSchema>;

export const expenseSchema = z.object({
  label: z.string().min(1, "Libellé requis").max(80),
  amount: z.coerce
    .number({ invalid_type_error: "Montant invalide" })
    .min(0, "Montant positif")
    .max(10_000_000, "Montant trop élevé"),
  category: z.enum(expenseCategoryIds),
  frequency: z.enum(frequencyIds),
  notes: z.string().max(280).optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const goalSchema = z
  .object({
    title: z.string().min(1, "Titre requis").max(80),
    type: z.enum(goalTypeIds),
    targetAmount: z.coerce
      .number()
      .min(1, "Montant > 0")
      .max(10_000_000, "Trop élevé"),
    currentAmount: z.coerce
      .number()
      .min(0, "Montant >= 0")
      .max(10_000_000, "Trop élevé")
      .default(0),
    deadline: z
      .string()
      .optional()
      .nullable()
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        "Date invalide",
      ),
    notes: z.string().max(280).optional().nullable(),
  })
  .refine((data) => data.currentAmount <= data.targetAmount, {
    message: "Le montant actuel ne peut dépasser l'objectif",
    path: ["currentAmount"],
  });

export type GoalInput = z.infer<typeof goalSchema>;

export const onboardingSchema = z.object({
  situation: z.enum(["struggling", "tight", "stable", "comfortable"]),
  monthlyIncome: z.coerce.number().min(0).max(10_000_000),
  monthlyExpenses: z.coerce.number().min(0).max(10_000_000),
  currentSavings: z.coerce.number().min(0).max(100_000_000),
  hasEmergencyFund: z.boolean().default(false),
  monthlyDebt: z.coerce.number().min(0).max(10_000_000).default(0),
  mainGoal: z.enum(goalTypeIds).default("emergency_fund"),
  perceivedStress: z.coerce.number().min(1).max(5),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

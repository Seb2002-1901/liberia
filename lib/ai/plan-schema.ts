import { z } from "zod";

/**
 * Strict schema for a generated financial plan. Used both as Zod
 * validator after Anthropic returns and as the source of truth for
 * the tool input_schema (converted via zod-to-json-schema-style inline
 * in lib/ai/plan-generator.ts).
 */
export const planStepSchema = z.object({
  week_number: z.number().int().min(1).max(13),
  focus: z.string().min(1).max(120),
  title: z.string().min(1).max(140),
  description: z.string().max(600).optional().default(""),
  category: z
    .enum([
      "reduce_expense",
      "build_emergency",
      "debt_payoff",
      "automate_saving",
      "habit",
      "income_boost",
      "review",
      "other",
    ])
    .default("other"),
  expected_impact_eur: z.number().min(0).max(10_000_000).optional().nullable(),
});

export type PlanStep = z.infer<typeof planStepSchema>;

export const planSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1200),
  steps: z.array(planStepSchema).min(3).max(40),
});

export type PlanInput = z.infer<typeof planSchema>;

export const generatePlanRequestSchema = z.object({
  horizon_days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(90),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;

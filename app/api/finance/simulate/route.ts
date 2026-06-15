import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getActionErrors } from "@/lib/i18n/action-errors";
import {
  futureValueMonthlyContributions,
  monthlyContributionForTarget,
  mortgagePayment,
  inflationAdjusted,
  runwayMonths,
  debtPayoffMonths,
  planScenarios,
} from "@/lib/calculations/simulator";

/**
 * Sprint Iris V4 — endpoint de simulation déterministe.
 *
 * Élimine la classe de bugs "LLM hallucine sur des chiffres d'intérêts
 * composés". Le coach n'a plus à raisonner mathématiquement — il
 * formule la question, on calcule, on renvoie un objet typé.
 *
 * 7 simulations supportées :
 *   - future_value_contributions : "j'investis X/mois pendant N ans"
 *   - target_required_contribution : "je veux atteindre Y, combien faut mettre"
 *   - mortgage_payment : montant mensuel pour un emprunt
 *   - inflation_adjusted : valeur future en pouvoir d'achat actuel
 *   - runway : combien de mois je tiens avec mon épargne
 *   - debt_payoff : combien de temps pour rembourser
 *   - plan_scenarios : 3 scénarios prudent/équilibré/ambitieux
 *
 * Auth obligatoire (rate-limit + pas d'usage anonyme — pas de coût
 * Anthropic ici mais on évite le DoS sur calculs intensifs même
 * minimes). Rate-limit sur la key "ai" (30/min/user).
 *
 * Stateless — pas d'écriture DB.
 */
export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("future_value_contributions"),
    initialAmount: z.number().min(0).max(100_000_000),
    monthlyContribution: z.number().min(0).max(1_000_000),
    annualReturnRate: z.number().min(-0.5).max(0.5),
    durationYears: z.number().positive().max(80),
  }),
  z.object({
    kind: z.literal("target_required_contribution"),
    targetAmount: z.number().positive().max(100_000_000),
    initialAmount: z.number().min(0).max(100_000_000),
    annualReturnRate: z.number().min(-0.5).max(0.5),
    durationYears: z.number().positive().max(80),
  }),
  z.object({
    kind: z.literal("mortgage_payment"),
    principal: z.number().positive().max(100_000_000),
    annualInterestRate: z.number().min(0).max(0.3),
    durationYears: z.number().positive().max(50),
    amortizationMode: z
      .enum(["direct", "indirect", "interest_only"])
      .optional(),
  }),
  z.object({
    kind: z.literal("inflation_adjusted"),
    nominalValue: z.number().min(0).max(100_000_000),
    inflationRate: z.number().min(-0.5).max(0.5),
    years: z.number().min(0).max(80),
  }),
  z.object({
    kind: z.literal("runway"),
    currentSavings: z.number().min(0).max(100_000_000),
    monthlyBurn: z.number().positive().max(1_000_000),
  }),
  z.object({
    kind: z.literal("debt_payoff"),
    principal: z.number().positive().max(100_000_000),
    monthlyPayment: z.number().positive().max(1_000_000),
    annualInterestRate: z.number().min(0).max(0.5),
  }),
  z.object({
    kind: z.literal("plan_scenarios"),
    targetAmount: z.number().positive().max(100_000_000),
    initialAmount: z.number().min(0).max(100_000_000),
    durationYears: z.number().positive().max(80),
  }),
]);

export async function POST(request: Request) {
  const tErr = await getActionErrors();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: tErr("authRequired") },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: tErr("authRequired") }, { status: 401 });
  }

  const rate = await checkRateLimit("ai", user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: tErr("tooManyAttempts") },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  switch (parsed.data.kind) {
    case "future_value_contributions":
      return NextResponse.json({
        kind: "future_value_contributions",
        result: futureValueMonthlyContributions(parsed.data),
      });
    case "target_required_contribution":
      return NextResponse.json({
        kind: "target_required_contribution",
        result: monthlyContributionForTarget(parsed.data),
      });
    case "mortgage_payment":
      return NextResponse.json({
        kind: "mortgage_payment",
        result: mortgagePayment(parsed.data),
      });
    case "inflation_adjusted":
      return NextResponse.json({
        kind: "inflation_adjusted",
        result: {
          realValue: inflationAdjusted(
            parsed.data.nominalValue,
            parsed.data.inflationRate,
            parsed.data.years,
          ),
        },
      });
    case "runway":
      return NextResponse.json({
        kind: "runway",
        result: {
          months: runwayMonths(
            parsed.data.currentSavings,
            parsed.data.monthlyBurn,
          ),
        },
      });
    case "debt_payoff":
      return NextResponse.json({
        kind: "debt_payoff",
        result: debtPayoffMonths(parsed.data),
      });
    case "plan_scenarios":
      return NextResponse.json({
        kind: "plan_scenarios",
        result: planScenarios(parsed.data),
      });
  }
}

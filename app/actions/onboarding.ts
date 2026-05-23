"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/finance";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateStabilityScore,
} from "@/lib/calculations/finance";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Configuration Supabase manquante." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  const v = parsed.data;
  const dti = v.monthlyIncome > 0 ? (v.monthlyDebt / v.monthlyIncome) * 100 : 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: v.monthlyExpenses,
  });
  const expenseRatio = calculateExpenseRatio({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: v.monthlyExpenses,
  });
  const runway = calculateRunway({
    currentSavings: v.currentSavings,
    monthlyExpenses: v.monthlyExpenses,
  });
  const stability = calculateStabilityScore({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: v.monthlyExpenses,
    currentSavings: v.currentSavings,
    hasEmergencyFund: v.hasEmergencyFund,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: v.perceivedStress,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });

  const fpUpsert = supabase.from("financial_profiles").upsert(
    {
      user_id: user.id,
      situation: v.situation,
      monthly_income: v.monthlyIncome,
      monthly_expenses: v.monthlyExpenses,
      current_savings: v.currentSavings,
      monthly_debt: v.monthlyDebt,
      has_emergency_fund: v.hasEmergencyFund,
      perceived_stress: v.perceivedStress,
      stability_score: stability,
      stress_score: stress,
    },
    { onConflict: "user_id" },
  );

  const profileUpdate = supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  const [fpRes, profileRes] = await Promise.all([fpUpsert, profileUpdate]);
  if (fpRes.error) return { ok: false, error: fpRes.error.message };
  if (profileRes.error) return { ok: false, error: profileRes.error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function skipOnboarding() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  }
  redirect("/dashboard");
}

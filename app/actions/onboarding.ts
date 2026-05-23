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

  const fpRes = await supabase.from("financial_profiles").upsert(
    {
      user_id: user.id,
      situation: v.situation,
      monthly_income: v.monthlyIncome,
      monthly_expenses: v.monthlyExpenses,
      current_savings: v.currentSavings,
      monthly_debt: v.monthlyDebt,
      has_emergency_fund: v.hasEmergencyFund,
      main_goal: v.mainGoal,
      perceived_stress: v.perceivedStress,
      stability_score: stability,
      stress_score: stress,
    },
    { onConflict: "user_id" },
  );
  if (fpRes.error) return { ok: false, error: fpRes.error.message };

  // Mark onboarding complete only after the financial profile is persisted —
  // otherwise the user can be flagged as onboarded with no underlying data.
  // Upsert (vs. update) so the user can self-heal if handle_new_user trigger
  // ever failed to provision the profile row.
  const profileRes = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );
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
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        onboarding_completed: true,
      },
      { onConflict: "id" },
    );
  }
  redirect("/dashboard");
}

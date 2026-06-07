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
import {
  buildExpenseEntriesFromBreakdown,
  ONBOARDING_EXPENSE_TAG,
  sumKnownExpenses,
} from "@/lib/onboarding/expenses";
import { track } from "@/lib/analytics/tracker";
import { getActionErrors } from "@/lib/i18n/action-errors";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("profileUnavailable") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const v = parsed.data;

  // Phase 4.0 J3 — quand l'onboarding fournit un breakdown détaillé,
  // on s'appuie dessus pour le `monthly_expenses` legacy plutôt que
  // sur la valeur envoyée par le client. Le client envoie déjà la
  // somme, mais on recalcule ici par sécurité (single source of truth
  // côté serveur). Backward compat : sans breakdown, on garde la
  // valeur du payload.
  const monthlyExpensesEffective = v.expenseBreakdown
    ? sumKnownExpenses(v.expenseBreakdown)
    : v.monthlyExpenses;

  const dti = v.monthlyIncome > 0 ? (v.monthlyDebt / v.monthlyIncome) * 100 : 0;
  const cashflow = calculateNetCashflow({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: monthlyExpensesEffective,
  });
  const expenseRatio = calculateExpenseRatio({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: monthlyExpensesEffective,
  });
  const runway = calculateRunway({
    currentSavings: v.currentSavings,
    monthlyExpenses: monthlyExpensesEffective,
  });
  const stability = calculateStabilityScore({
    monthlyIncome: v.monthlyIncome,
    monthlyExpenses: monthlyExpensesEffective,
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
      monthly_expenses: monthlyExpensesEffective,
      current_savings: v.currentSavings,
      monthly_debt: v.monthlyDebt,
      has_emergency_fund: v.hasEmergencyFund,
      main_goal: v.mainGoal,
      perceived_stress: v.perceivedStress,
      stability_score: stability,
      stress_score: stress,
      behavior_traits: v.behaviorTraits,
    },
    { onConflict: "user_id" },
  );
  if (fpRes.error) return { ok: false, error: fpRes.error.message };

  // Phase 4.0 J3 — si l'utilisateur a fourni un breakdown détaillé,
  // on crée les expense entries correspondantes pour peupler la
  // table `expenses`. C'est ce qui fait que Couverture FHS, axes
  // Résilience/Trajectoire et Categories breakdown sont déjà riches
  // dès le J0.
  //
  // Idempotence : si l'action est re-jouée (rare mais possible si
  // le client retry), on supprime d'abord les entries précédemment
  // taggées comme onboarding. Le tag `[onboarding]` dans `notes`
  // sert d'identifiant stable.
  if (v.expenseBreakdown) {
    const entries = buildExpenseEntriesFromBreakdown(
      user.id,
      v.expenseBreakdown,
    );
    if (entries.length > 0) {
      const delRes = await supabase
        .from("expenses")
        .delete()
        .eq("user_id", user.id)
        .eq("notes", ONBOARDING_EXPENSE_TAG);
      if (delRes.error) {
        // Non-bloquant : on log et on continue, l'insert ci-dessous
        // peut juste créer un doublon visible côté UI (rare).
        console.error(
          `[onboarding] failed to clean previous entries: ${delRes.error.code ?? "?"} ${delRes.error.message}`,
        );
      }
      const insRes = await supabase.from("expenses").insert(entries);
      if (insRes.error) {
        // Bloquant : sans ces entries, le wow J0 est cassé. On
        // remonte l'erreur au composant pour qu'il avertisse.
        return { ok: false, error: insRes.error.message };
      }
    }
  }

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

  // Track the milestone — sink is no-op today, swallows errors anyway.
  // Only enum-ish properties travel: no PII, no amounts.
  await track(
    {
      name: "onboarding_completed",
      properties: {
        situation: v.situation,
        mainGoal: v.mainGoal,
        behaviorTraitCount: v.behaviorTraits.length,
      },
    },
    { userId: user.id },
  );

  // Revalidate les pages qui consomment expenses + financial_profile :
  // dashboard (FHS + Ring + Mission), /expenses (liste), /budget
  // (catégories). Coach n'a pas de cache route-level (route handler
  // dynamique), pas besoin de le revalider.
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/budget");
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

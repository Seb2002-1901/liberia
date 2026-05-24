"use server";

import { revalidatePath } from "next/cache";
import { COACH_MODEL } from "@/lib/ai/client";
import { buildFinanceContext } from "@/lib/ai/context";
import { generatePlan } from "@/lib/ai/plan-generator";
import { generatePlanRequestSchema } from "@/lib/ai/plan-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAnthropicConfigured } from "@/lib/env";
import { getFinanceData } from "@/lib/services/finance";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export async function generateFinancialPlan(input: {
  horizonDays: 30 | 60 | 90;
}): Promise<ActionResult<{ planId: string }>> {
  if (!isAnthropicConfigured()) {
    return { ok: false, error: "Anthropic non configuré." };
  }
  if (!isAdminConfigured()) {
    return { ok: false, error: "Service-role Supabase non configuré." };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }

  const parsed = generatePlanRequestSchema.safeParse({
    horizon_days: input.horizonDays,
  });
  if (!parsed.success) {
    return { ok: false, error: "Horizon invalide (30, 60 ou 90)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  // Plan generation is expensive (Sonnet 4.6 tool-use, ~$0.05-0.10/req).
  // Cap to 3/hour/user via the "ai" rate-limit bucket (already 30/min via
  // its sliding window — plan generation goes through the same budget).
  const rate = await checkRateLimit("ai", user.id);
  if (!rate.success) {
    return {
      ok: false,
      error: "Trop de générations récentes. Réessaye dans quelques minutes.",
    };
  }

  // Build the snapshot the model sees + we audit.
  const financeData = await getFinanceData();
  if (financeData.isDemo) {
    return {
      ok: false,
      error:
        "Le plan IA est réservé aux comptes connectés avec des données réelles.",
    };
  }
  const financeContext = buildFinanceContext(financeData);

  let plan;
  let tokensIn = 0;
  let tokensOut = 0;
  try {
    const result = await generatePlan({
      horizonDays: parsed.data.horizon_days,
      financeContext,
      model: COACH_MODEL,
    });
    plan = result.plan;
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur de génération du plan.";
    return { ok: false, error: message };
  }

  // Mark all previous plans inactive, then insert new one + steps.
  const admin = getAdminClient();
  await admin
    .from("financial_plans")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const insertPlan = await admin
    .from("financial_plans")
    .insert({
      user_id: user.id,
      horizon_days: parsed.data.horizon_days,
      title: plan.title,
      summary: plan.summary,
      model: COACH_MODEL,
      generation_input: {
        finance_context_preview: financeContext.slice(0, 400),
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      },
      is_active: true,
    })
    .select("id")
    .single();
  if (insertPlan.error) {
    return { ok: false, error: insertPlan.error.message };
  }
  const planId = insertPlan.data.id;

  const steps = plan.steps.map((step, idx) => ({
    plan_id: planId,
    user_id: user.id,
    week_number: step.week_number,
    focus: step.focus,
    title: step.title,
    description: step.description || null,
    expected_impact_eur: step.expected_impact_eur ?? null,
    category: step.category,
    position: idx,
  }));
  const insertSteps = await admin.from("financial_plan_steps").insert(steps);
  if (insertSteps.error) {
    // Best effort cleanup of orphan plan row.
    await admin.from("financial_plans").delete().eq("id", planId);
    return { ok: false, error: insertSteps.error.message };
  }

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true, data: { planId } };
}

export async function toggleStep(
  stepId: string,
  isCompleted: boolean,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  const { error } = await supabase
    .from("financial_plan_steps")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", stepId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}

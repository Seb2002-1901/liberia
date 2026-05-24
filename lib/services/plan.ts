import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { FinancialPlan, FinancialPlanStep } from "@/types/database";

export type ActivePlan = {
  plan: FinancialPlan;
  steps: FinancialPlanStep[];
};

export const getActivePlan = cache(
  async (): Promise<ActivePlan | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: plan } = await supabase
      .from("financial_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!plan) return null;

    const { data: steps } = await supabase
      .from("financial_plan_steps")
      .select("*")
      .eq("plan_id", plan.id)
      .eq("user_id", user.id)
      .order("week_number", { ascending: true })
      .order("position", { ascending: true });

    return {
      plan: plan as FinancialPlan,
      steps: (steps ?? []) as FinancialPlanStep[],
    };
  },
);

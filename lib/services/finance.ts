import "server-only";
import { cache } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeToMonthly } from "@/lib/calculations/finance";
import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import {
  demoExpenses,
  demoFinancialProfile,
  demoGoals,
  demoIncomes,
  demoProfile,
} from "@/lib/demo/data";
import type {
  Expense,
  FinancialProfile,
  Goal,
  Income,
  Profile,
  Subscription,
} from "@/types/database";

export type FinanceData = {
  profile: Pick<Profile, "full_name" | "email" | "avatar_url" | "currency" | "locale"> & {
    onboarding_completed: boolean;
  };
  subscription: { plan: "free" | "premium" };
  financialProfile: FinancialProfile | null;
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  isDemo: boolean;
};

export function totalMonthly(entries: Array<{ amount: number; frequency: string }>): number {
  return entries.reduce(
    (sum, e) => sum + normalizeToMonthly(e.amount, frequencyMultiplier(e.frequency)),
    0,
  );
}

export const getFinanceData = cache(async (): Promise<FinanceData> => {
  if (!isSupabaseConfigured()) {
    return buildDemoData();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return buildDemoData();
    }

    const [profileRes, subRes, fpRes, incRes, expRes, goalsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, avatar_url, currency, locale, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("financial_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("incomes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      profile: {
        full_name: profileRes.data?.full_name ?? null,
        email: profileRes.data?.email ?? user.email ?? "",
        avatar_url: profileRes.data?.avatar_url ?? null,
        currency: profileRes.data?.currency ?? "EUR",
        locale: profileRes.data?.locale ?? "fr-FR",
        onboarding_completed: profileRes.data?.onboarding_completed ?? false,
      },
      subscription: { plan: (subRes.data?.plan as "free" | "premium") ?? "free" },
      financialProfile: (fpRes.data as FinancialProfile | null) ?? null,
      incomes: (incRes.data as Income[] | null) ?? [],
      expenses: (expRes.data as Expense[] | null) ?? [],
      goals: (goalsRes.data as Goal[] | null) ?? [],
      isDemo: false,
    };
  } catch {
    return buildDemoData();
  }
});

function buildDemoData(): FinanceData {
  return {
    profile: {
      full_name: demoProfile.full_name,
      email: demoProfile.email,
      avatar_url: demoProfile.avatar_url,
      currency: demoProfile.currency,
      locale: demoProfile.locale,
      onboarding_completed: true,
    },
    subscription: { plan: "free" },
    financialProfile: demoFinancialProfile,
    incomes: demoIncomes,
    expenses: demoExpenses,
    goals: demoGoals,
    isDemo: true,
  };
}

export type SubscriptionInfo = Pick<Subscription, "plan" | "status" | "current_period_end" | "cancel_at_period_end">;

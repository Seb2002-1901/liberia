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

export type SubscriptionView = {
  plan: "free" | "premium";
  status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;
  price_id: string | null;
  has_customer: boolean;
};

export type FinanceData = {
  profile: Pick<Profile, "full_name" | "email" | "avatar_url" | "currency" | "locale"> & {
    onboarding_completed: boolean;
  };
  subscription: SubscriptionView;
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
        .select(
          "plan, status, cancel_at_period_end, current_period_end, trial_ends_at, trial_used, price_id, stripe_customer_id",
        )
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
        // Trust auth.users.email (validated by Supabase) over profiles.email,
        // which the user could in principle mutate via the JS SDK since the
        // profiles row is theirs to update.
        email: user.email ?? profileRes.data?.email ?? "",
        avatar_url: profileRes.data?.avatar_url ?? null,
        // Preserve any currency the user has already chosen; fall back to
        // CHF for brand-new accounts (LIBERIA is positioned as a Swiss
        // product).
        currency: profileRes.data?.currency ?? "CHF",
        locale: profileRes.data?.locale ?? "fr-CH",
        onboarding_completed: profileRes.data?.onboarding_completed ?? false,
      },
      subscription: {
        plan: (subRes.data?.plan as "free" | "premium") ?? "free",
        status: (subRes.data?.status as string | null) ?? null,
        cancel_at_period_end: subRes.data?.cancel_at_period_end ?? false,
        current_period_end: subRes.data?.current_period_end ?? null,
        trial_ends_at: subRes.data?.trial_ends_at ?? null,
        trial_used: subRes.data?.trial_used ?? false,
        price_id: subRes.data?.price_id ?? null,
        has_customer: Boolean(subRes.data?.stripe_customer_id),
      },
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
    subscription: {
      plan: "free",
      status: null,
      cancel_at_period_end: false,
      current_period_end: null,
      trial_ends_at: null,
      trial_used: false,
      price_id: null,
      has_customer: false,
    },
    financialProfile: demoFinancialProfile,
    incomes: demoIncomes,
    expenses: demoExpenses,
    goals: demoGoals,
    isDemo: true,
  };
}

export type SubscriptionInfo = Pick<Subscription, "plan" | "status" | "current_period_end" | "cancel_at_period_end">;

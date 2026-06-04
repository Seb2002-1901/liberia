import "server-only";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeToMonthly } from "@/lib/calculations/finance";
import { frequencyMultiplier } from "@/lib/calculations/aggregate";
import {
  demoFinancialProfile,
  getDemoExpenses,
  getDemoGoals,
  getDemoIncomes,
  getDemoProfile,
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
  profile: Pick<
    Profile,
    "full_name" | "email" | "avatar_url" | "currency" | "locale" | "country"
  > & {
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
    return await buildDemoData();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return await buildDemoData();
    }

    const [profileRes, subRes, fpRes, incRes, expRes, goalsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, email, avatar_url, currency, locale, country, onboarding_completed",
        )
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

    // Schema drift fallback: if the profile select errored (typically a
    // freshly-deployed migration referencing a column that hasn't been
    // applied yet — see commit dd31420 which added profiles.country),
    // retry with the legacy column set. Without this the function would
    // hand back onboarding_completed=false to (app)/layout.tsx, which
    // redirects to /onboarding, which queries onboarding_completed on
    // its own (legacy SELECT succeeds), sees true, redirects back to
    // /dashboard → ERR_TOO_MANY_REDIRECTS.
    let profileData = profileRes.data as
      | {
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          currency?: string | null;
          locale?: string | null;
          country?: string | null;
          onboarding_completed?: boolean | null;
        }
      | null;
    if (profileRes.error) {
      const retry = await supabase
        .from("profiles")
        .select(
          "full_name, email, avatar_url, currency, locale, onboarding_completed",
        )
        .eq("id", user.id)
        .maybeSingle();
      profileData = retry.data as typeof profileData;
    }

    return {
      profile: {
        full_name: profileData?.full_name ?? null,
        // Trust auth.users.email (validated by Supabase) over profiles.email,
        // which the user could in principle mutate via the JS SDK since the
        // profiles row is theirs to update.
        email: user.email ?? profileData?.email ?? "",
        avatar_url: profileData?.avatar_url ?? null,
        // Preserve any currency the user has already chosen; fall back to
        // CHF for brand-new accounts (LIBERIA is positioned as a Swiss
        // product).
        currency: profileData?.currency ?? "CHF",
        locale: profileData?.locale ?? "fr-CH",
        country: profileData?.country ?? "CH",
        onboarding_completed: profileData?.onboarding_completed ?? false,
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
    return await buildDemoData();
  }
});

async function buildDemoData(): Promise<FinanceData> {
  const t = await getTranslations("app.demo.data");
  const tString = (key: string) => t(key);
  const demoProfile = getDemoProfile(tString);
  return {
    profile: {
      full_name: demoProfile.full_name,
      email: demoProfile.email,
      avatar_url: demoProfile.avatar_url,
      currency: demoProfile.currency,
      locale: demoProfile.locale,
      country: "CH",
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
    incomes: getDemoIncomes(tString),
    expenses: getDemoExpenses(tString),
    goals: getDemoGoals(tString),
    isDemo: true,
  };
}

export type SubscriptionInfo = Pick<Subscription, "plan" | "status" | "current_period_end" | "cancel_at_period_end">;

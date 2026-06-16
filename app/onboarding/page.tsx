import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default async function OnboardingPage() {
  // Re-visiting /onboarding after completion would silently overwrite the
  // financial_profile snapshot via the upsert in completeOnboarding —
  // user could lose monthly_income/expenses/savings without warning.
  // Redirect already-onboarded users to the dashboard.
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      // ROUTES.dashboard pointe directement sur le dashboard V3 —
      // évite un hop supplémentaire via le middleware prod → V3.
      if (profile?.onboarding_completed) redirect(ROUTES.dashboard);
    }
  }

  return <OnboardingFlow />;
}

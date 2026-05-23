import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getFinanceData } from "@/lib/services/finance";
import { signOutAction } from "@/app/actions/auth";
import { ROUTES } from "@/lib/constants";

// Per-request data via Supabase cookies — never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getFinanceData();

  // Authenticated users must complete onboarding before reaching the app.
  // Demo fallback is treated as "onboarded" (set in buildDemoData).
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  return (
    <AppShell
      user={{
        fullName: data.profile.full_name,
        email: data.profile.email,
      }}
      plan={data.subscription.plan}
      isDemo={data.isDemo}
      onSignOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}

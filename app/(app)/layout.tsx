import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Greeting } from "@/components/layout/greeting";
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

  // Phase 5.0 S2 — la salutation "Bonjour {prénom} 👋" est injectée
  // dans la topbar globale. Le composant est async (next-intl
  // server) ; on l'instancie ici (Server Component) et on le passe
  // à `<AppShell>` (Client Component) en tant que ReactNode prop.
  // Le fallback "fallbackName" couvre le démo et les profils sans nom.
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;

  return (
    <AppShell
      user={{
        fullName: data.profile.full_name,
        email: data.profile.email,
      }}
      plan={data.subscription.plan}
      trialUsed={data.subscription.trial_used}
      isDemo={data.isDemo}
      onSignOut={signOutAction}
      greeting={<Greeting firstName={firstName} />}
    >
      {children}
    </AppShell>
  );
}

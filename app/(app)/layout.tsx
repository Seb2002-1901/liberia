import { AppShell } from "@/components/layout/app-shell";
import { getFinanceData } from "@/lib/services/finance";
import { signOutAction } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getFinanceData();
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

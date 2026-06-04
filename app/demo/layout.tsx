import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { getDemoProfile } from "@/lib/demo/data";

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("app.demo.data");
  const demoProfile = getDemoProfile((key: string) => t(key));
  return (
    <AppShell
      user={{ fullName: demoProfile.full_name, email: demoProfile.email }}
      plan="free"
      isDemo
    >
      {children}
    </AppShell>
  );
}

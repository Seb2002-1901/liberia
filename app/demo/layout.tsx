import { AppShell } from "@/components/layout/app-shell";
import { demoProfile } from "@/lib/demo/data";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
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

import { getTranslations } from "next-intl/server";
import { V3Shell } from "@/components/layout/v3-shell";
import { getDemoProfile } from "@/lib/demo/data";

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("app.demo.data");
  const demoProfile = getDemoProfile((key: string) => t(key));
  const firstName =
    demoProfile.full_name?.split(" ")[0]?.trim() || null;
  return (
    <V3Shell
      firstName={firstName}
      fullName={demoProfile.full_name ?? null}
      activeHref="/design-match/dashboard-v3"
      topbarSubtitle="Mode démo"
    >
      {children}
    </V3Shell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemoryEntriesPanel } from "@/components/settings/memory-entries-panel";
import {
  getCoachMemoryEnabled,
  listMyMemoryEntries,
} from "@/lib/services/memory-entries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.settings.memoryPage");
  return { title: t("metaTitle") };
}

export default async function MemorySettingsPage() {
  const t = await getTranslations("app.settings.memoryPage");
  const [entries, enabled] = await Promise.all([
    listMyMemoryEntries(),
    getCoachMemoryEnabled(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={ROUTES.settings}>
            <ArrowLeft className="h-4 w-4" /> {t("backToSettings")}
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <Card className="border-[hsl(var(--gold)/0.25)] bg-gradient-to-br from-[hsl(var(--gold)/0.04)] via-card/40 to-card/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[hsl(var(--gold))]" />
            {t("howItWorksTitle")}
          </CardTitle>
          <CardDescription>{t("howItWorksBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>· {t("howItWorksGoal")}</li>
            <li>· {t("howItWorksPreference")}</li>
            <li>· {t("howItWorksEvent")}</li>
            <li>· {t("howItWorksBlocker")}</li>
          </ul>
        </CardContent>
      </Card>

      <MemoryEntriesPanel entries={entries} enabled={enabled} />
    </div>
  );
}

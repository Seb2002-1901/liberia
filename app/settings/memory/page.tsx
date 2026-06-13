/**
 * /settings/memory — gestion mémoire IA (MemoryEntriesPanel).
 *
 * Migrée hors de (app)/ pour bypasser l'ancien AppShell et utiliser
 * le shell V3 inline (V3Shell). "Paramètres" est marqué actif dans
 * la sidebar. Toute la logique métier (listMyMemoryEntries,
 * getCoachMemoryEnabled, MemoryEntriesPanel) est strictement
 * préservée.
 *
 * L'auth + redirect onboarding (faits autrefois par (app)/layout.tsx)
 * sont reproduits ici.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getFinanceData } from "@/lib/services/finance";
import { ROUTES } from "@/lib/constants";
import { V3Shell } from "@/components/layout/v3-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.settings.memoryPage");
  return { title: t("metaTitle") };
}

export default async function MemorySettingsPage() {
  const t = await getTranslations("app.settings.memoryPage");
  const data = await getFinanceData();

  // Reproduit la garde de (app)/layout.tsx.
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const [entries, enabled] = await Promise.all([
    listMyMemoryEntries(),
    getCoachMemoryEnabled(),
  ]);

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <V3Shell
      firstName={firstName}
      fullName={fullName}
      activeHref="/design-match/parametres-v3"
      topbarSubtitle="Pilotez la mémoire de votre conseiller IA."
    >
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
    </V3Shell>
  );
}

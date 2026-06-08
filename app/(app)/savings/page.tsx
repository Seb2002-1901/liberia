import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

/**
 * Phase 5.0 S2 — stub Épargne. Livraison du contenu réel : S4.
 *
 * Pas de données fake. Le stub garantit que le clic sur l'item
 * sidebar "Épargne" amène sur une page propre et cohérente avec
 * le reste du produit (D3 validé).
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.savings.metadata");
  return { title: t("title") };
}

export default async function SavingsPage() {
  const t = await getTranslations("app.savings");
  return (
    <ComingSoonPage
      icon={PiggyBank}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      teaser={t("teaser")}
      coachCta={t("coachCta")}
    />
  );
}

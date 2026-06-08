import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

/**
 * Phase 5.0 S2 — stub Opportunités. Livraison du contenu réel : S4.
 *
 * Future page : catalogue d'opportunités classées par effort /
 * risque / délai (Revenue Engine, pilier #1 Phase 5.0). Aucune
 * fausse opportunité pour le moment.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.opportunities.metadata");
  return { title: t("title") };
}

export default async function OpportunitiesPage() {
  const t = await getTranslations("app.opportunities");
  return (
    <ComingSoonPage
      icon={Compass}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      teaser={t("teaser")}
      coachCta={t("coachCta")}
    />
  );
}

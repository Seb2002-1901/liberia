import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/layout/coming-soon-page";

/**
 * Phase 5.0 S2 — stub Investissements. Livraison du contenu réel : S5.
 *
 * Pas de produit financier nommé. Le contenu futur sera strictement
 * éducatif (C2 + C3 validés) : comprendre les ETF, comparer les
 * scénarios, simuler un investissement. Aucune recommandation
 * d'achat / vente.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.investments.metadata");
  return { title: t("title") };
}

export default async function InvestmentsPage() {
  const t = await getTranslations("app.investments");
  return (
    <ComingSoonPage
      icon={LineChart}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      teaser={t("teaser")}
      coachCta={t("coachCta")}
    />
  );
}

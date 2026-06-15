import { getTranslations } from "next-intl/server";

/**
 * Phase 5.0 S2 — salutation topbar globale.
 *
 * Affichée en haut à gauche de la topbar sur TOUTES les pages
 * applicatives (vue dashboard, coach, finances, settings…). Donne
 * l'impression d'une application cohérente et personnalisée —
 * décision produit validée fondateur (D1 audit S2).
 *
 * Format : "Bonjour {firstName} 👋" + sous-ligne courte.
 *
 * Cible visuelle : voir docs/design-system/mockups/dashboard.png
 * (et toutes les autres maquettes — même topbar partout).
 *
 * Cachée sur < lg pour préserver la place de la BrandMark mobile
 * dans la topbar étroite. Sur mobile, la salutation pourrait être
 * intégrée plus tard dans le contenu de chaque page si besoin.
 */

interface GreetingProps {
  firstName?: string | null;
}

export async function Greeting({ firstName }: GreetingProps) {
  const t = await getTranslations("common.shell.greeting");
  const name = firstName?.trim() || t("fallbackName");
  return (
    <div className="hidden flex-col lg:flex">
      <p className="font-display text-lg font-semibold leading-tight text-foreground">
        {t("hello", { firstName: name })} <span aria-hidden>👋</span>
      </p>
      <p className="text-xs text-muted-foreground">{t("subline")}</p>
    </div>
  );
}

import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Sprint S2 — PWA manifest.
 *
 * Permet l'installation de LIBERIA en webapp sur iOS/Android et le
 * référencement minimal côté App Store / Play Store TWA. Avant ce
 * fichier, le navigateur retournait 404 sur /manifest.webmanifest et
 * iOS refusait "Ajouter à l'écran d'accueil" avec un nom + icône
 * convenables.
 *
 * - `name` / `short_name` : LIBERIA (max 12 chars sur short).
 * - `theme_color` aligné avec le navy V3 (cohérence barre d'adresse +
 *   splash screen Android).
 * - `background_color` = #F6F8FC (fond app light premium).
 * - Icônes via app/icon.tsx + app/apple-icon.tsx (générées
 *   dynamiquement par Next 15 — pas de fichier statique à maintenir).
 * - `display: standalone` pour masquer la chrome navigateur quand
 *   l'app est installée (UX native-like).
 * - `categories: ["finance"]` pour le classement Store.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description:
      "Reprends le contrôle de ton argent avec ton copilote financier personnel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F8FC",
    theme_color: "#011E5F",
    categories: ["finance", "productivity", "lifestyle"],
    lang: "fr-CH",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { ROUTES } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#features" },
      { label: "Tarifs", href: ROUTES.pricing },
      { label: "Mode démo", href: ROUTES.demo },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Sécurité & confiance", href: ROUTES.security },
      { label: "Politique IA responsable", href: ROUTES.aiPolicy },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Confidentialité", href: ROUTES.privacy },
      { label: "Conditions", href: ROUTES.terms },
      { label: "Disclaimer", href: ROUTES.legal },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="container py-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-xs text-sm text-muted-foreground">
              Reprends le contrôle de ton argent.
              LIBERIA t'aide à reconstruire ta stabilité financière, étape par étape.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold text-foreground">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} LIBERIA — Tous droits réservés.</p>
          <p className="max-w-xl">
            LIBERIA est un outil de pilotage personnel. Aucune des informations affichées ne constitue un conseil financier, fiscal ou d'investissement.
          </p>
        </div>
      </div>
    </footer>
  );
}

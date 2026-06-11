import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 6.0 — Site footer V3 light premium.
 *
 * Identité cockpit V3 : fond clair, navy texte, liens textMuted,
 * Outfit pour les titres de colonnes. Aligné avec le SiteHeader V3.
 */

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#features" },
      { label: "Tarifs", href: ROUTES.pricing },
      { label: "Démo", href: ROUTES.demo },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Sécurité", href: ROUTES.security },
      { label: "Charte IA", href: ROUTES.aiPolicy },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Confidentialité", href: ROUTES.privacy },
      { label: "CGU", href: ROUTES.terms },
      { label: "Mentions légales", href: ROUTES.legal },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: "1px solid #F2F4F8",
        backgroundColor: "#F4F6FB",
        color: "#0F172A",
      }}
    >
      <div className="container" style={{ padding: "56px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 36,
          }}
          className="lv3-footer-grid"
        >
          <div>
            <BrandMark size="sm" />
            <p style={{ marginTop: 14, maxWidth: 280, fontSize: 13, color: "#64748B", lineHeight: 1.55 }}>
              Votre copilote financier IA. Analysez, optimisez et atteignez vos objectifs en toute confiance.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "Outfit, Inter, system-ui",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0F172A",
                  letterSpacing: "-0.01em",
                }}
              >
                {col.title}
              </p>
              <ul style={{ marginTop: 12, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        textDecoration: "none",
                      }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 44,
            paddingTop: 22,
            borderTop: "1px solid #E5E9F2",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "#94A3B8",
          }}
          className="lv3-footer-bottom"
        >
          <p style={{ margin: 0 }}>© {year} LIBERIA · Tous droits réservés.</p>
          <p style={{ margin: 0, maxWidth: 600, lineHeight: 1.4 }}>
            Liberia est un copilote financier informatif. Il ne remplace pas un conseiller agréé et n&apos;effectue pas de transactions bancaires.
          </p>
        </div>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .lv3-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
          .lv3-footer-bottom { flex-direction: column !important; align-items: flex-start !important; }
        }
        @media (max-width: 479px) {
          .lv3-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

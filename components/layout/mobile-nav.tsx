"use client";

/**
 * Navigation mobile V3 — visible uniquement < 999 px.
 *
 * Rend un bouton hamburger fixé en haut à gauche (au-dessus de la
 * topbar) qui ouvre un drawer plein écran avec exactement les
 * mêmes items que la Sidebar V3 desktop : 4 sections (PRINCIPAL /
 * FINANCES / CROISSANCE / PLUS) + carte Premium en pied.
 *
 * Source unique de vérité pour la navigation mobile — évite la
 * duplication par page. L'état actif est calculé via
 * usePathname() (les redirects prod /budget → /design-match/
 * budget-v3 etc. matchent par mappage explicite).
 *
 * Aucune nouvelle fonctionnalité métier — c'est uniquement le
 * pendant mobile de la Sidebar V3 inline présente dans chaque
 * page V3. Aucun logique produit n'est ajoutée.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#F2F4F8",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  gold: "#FBBF24",
};

const SHADOW = {
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
};

type NavItemConfig = {
  label: string;
  href: string;
  iconPath: string;
  iconCircle?: boolean;
  /** Préfixes additionnels qui activent cet item (ex: /coach/[id]). */
  activePrefixes?: readonly string[];
};

type NavSectionConfig = {
  title: string;
  items: NavItemConfig[];
};

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    title: "PRINCIPAL",
    items: [
      {
        label: "Tableau de bord",
        href: "/design-match/dashboard-v3",
        iconPath:
          "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22",
      },
      {
        label: "Coach IA",
        href: "/design-match/coach-v3",
        iconPath:
          "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        activePrefixes: ["/coach"],
      },
      {
        label: "Mon analyse",
        href: "/design-match/mon-analyse-v3",
        iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
      },
      {
        label: "Plan d'action",
        href: "/design-match/plan-v3",
        iconPath:
          "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
      },
    ],
  },
  {
    title: "FINANCES",
    items: [
      {
        label: "Revenus",
        href: "/design-match/revenus-v3",
        iconPath: "M12 5v14|M5 12l7-7 7 7",
        iconCircle: true,
      },
      {
        label: "Dépenses",
        href: "/design-match/depenses-v3",
        iconPath: "M12 19V5|M5 12l7 7 7-7",
        iconCircle: true,
        activePrefixes: ["/expenses"],
      },
      {
        label: "Budget",
        href: "/design-match/budget-v3",
        iconPath:
          "M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z",
      },
      {
        label: "Objectifs",
        href: "/design-match/objectifs-v3",
        iconPath:
          "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15",
      },
    ],
  },
  {
    title: "CROISSANCE",
    items: [
      {
        label: "Épargne",
        href: "/design-match/epargne-v3",
        iconPath:
          "M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z",
      },
      {
        label: "Investissements",
        href: "/design-match/investissements-v3",
        iconPath: "M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z",
      },
      {
        label: "Opportunités",
        href: "/design-match/opportunites-v3",
        iconPath:
          "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z",
      },
    ],
  },
  {
    title: "PLUS",
    items: [
      {
        label: "Paramètres",
        href: "/design-match/parametres-v3",
        iconPath: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
        activePrefixes: ["/settings"],
      },
      {
        label: "Profil",
        href: "/design-match/profil-v3",
        iconPath:
          "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
      },
    ],
  },
];

function isActive(pathname: string, item: NavItemConfig): boolean {
  if (pathname === item.href) return true;
  if (item.activePrefixes) {
    for (const p of item.activePrefixes) {
      if (pathname === p || pathname.startsWith(`${p}/`)) return true;
    }
  }
  return false;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  return (
    <>
      {/* Visible uniquement < 999 px, scopé à cet ID pour ne pas
          impacter le layout desktop. */}
      <style>{`
        [data-mobile-nav-btn] { display: none; }
        [data-mobile-nav-overlay] { display: none; }
        @media (max-width: 999px) {
          [data-mobile-nav-btn] { display: inline-flex; }
          [data-mobile-nav-overlay][data-open="true"] { display: block; }
        }
      `}</style>
      <button
        data-mobile-nav-btn
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        style={{
          position: "fixed",
          top: 14,
          left: 14,
          zIndex: 1100,
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: C.cardBg,
          border: `1px solid ${C.borderGhost}`,
          boxShadow: SHADOW.kpi,
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: C.textDark,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
      <div
        data-mobile-nav-overlay
        data-open={open ? "true" : "false"}
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.42)",
          zIndex: 1200,
        }}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-label="Menu de navigation"
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          backgroundColor: C.cardBg,
          borderRight: `1px solid ${C.borderGhost}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 1300,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.22s ease",
          pointerEvents: open ? "auto" : "none",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 16px 20px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                backgroundColor: C.navy,
                borderRadius: 8,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20V6" />
                <path d="M4 20h14" />
                <path d="M8 14l4-4 3 3 5-6" />
              </svg>
            </span>
            <span
              style={{
                color: C.navy,
                letterSpacing: "0.16em",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              LIBERIA
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "transparent",
              border: "none",
              color: C.textMuted,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav
          style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}
          onClick={() => setOpen(false)}
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 12 }}>
              <p
                style={{
                  padding: "8px 12px 6px 12px",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: C.textLight,
                  letterSpacing: "0.16em",
                  margin: 0,
                }}
              >
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                const paths = item.iconPath.split("|");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      backgroundColor: active ? C.primaryBg : "transparent",
                      borderRadius: 8,
                      marginBottom: 1,
                      textDecoration: "none",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        backgroundColor: active ? C.primary : "#F1F5F9",
                        borderRadius: 6,
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={active ? "white" : C.textMuted}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {item.iconCircle && <circle cx="12" cy="12" r="10" />}
                        {paths.map((d, i) => (
                          <path key={i} d={d} />
                        ))}
                      </svg>
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? C.textDark : C.textMuted,
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ padding: 12 }}>
          <div
            style={{
              padding: 16,
              backgroundColor: C.cardBg,
              borderRadius: 12,
              boxShadow: SHADOW.kpi,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={C.gold}>
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.textDark,
                  letterSpacing: "0.04em",
                }}
              >
                LIBERIA PREMIUM
              </span>
            </div>
            <p
              style={{
                marginTop: 8,
                fontSize: 11.5,
                color: C.textMuted,
                lineHeight: 1.45,
              }}
            >
              Débloquez tout le potentiel de votre conseiller financier.
            </p>
            <Link
              href="/settings/subscription"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                textAlign: "center",
                width: "100%",
                marginTop: 12,
                padding: "8px 12px",
                border: "none",
                backgroundColor: C.pageBg,
                fontSize: 12,
                fontWeight: 500,
                color: C.textDark,
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Gérer mon abonnement
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

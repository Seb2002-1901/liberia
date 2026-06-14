/**
 * Shell V3 partagé — utilisé par les routes sans équivalent V3
 * dédié (coach/[id], expenses/analytics, settings/memory) pour
 * harmoniser leur cockpit avec les 14 pages /design-match/*-v3.
 *
 * Server component : pas de state, pas de hooks. Reproduit
 * strictement le même langage visuel que les Sidebar/Topbar
 * inline des pages V3 (tokens C, SHADOW, dimensions, breakpoints,
 * responsive).
 *
 * Aucune logique métier — uniquement un wrapper de présentation
 * qui prend `children` + `firstName/fullName/activeHref/topbar-
 * Subtitle`.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";

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

type NavItem = {
  label: string;
  href: string;
  iconPath: string;
  iconCircle?: boolean;
};

type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "PRINCIPAL",
    items: [
      { label: "Tableau de bord", href: "/design-match/dashboard-v3", iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" },
      { label: "Coach IA", href: "/design-match/coach-v3", iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
      { label: "Mon analyse", href: "/design-match/mon-analyse-v3", iconPath: "M22 12h-4l-3 9L9 3l-3 9H2" },
      { label: "Plan d'action", href: "/design-match/plan-v3", iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    ],
  },
  {
    title: "FINANCES",
    items: [
      { label: "Revenus", href: "/design-match/revenus-v3", iconPath: "M12 5v14|M5 12l7-7 7 7", iconCircle: true },
      { label: "Dépenses", href: "/design-match/depenses-v3", iconPath: "M12 19V5|M5 12l7 7 7-7", iconCircle: true },
      { label: "Budget", href: "/design-match/budget-v3", iconPath: "M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" },
      { label: "Objectifs", href: "/design-match/objectifs-v3", iconPath: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" },
    ],
  },
  {
    title: "CROISSANCE",
    items: [
      { label: "Épargne", href: "/design-match/epargne-v3", iconPath: "M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" },
      { label: "Investissements", href: "/design-match/investissements-v3", iconPath: "M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" },
      { label: "Opportunités", href: "/design-match/opportunites-v3", iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" },
    ],
  },
  {
    title: "PLUS",
    items: [
      { label: "Paramètres", href: "/design-match/parametres-v3", iconPath: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
      { label: "Profil", href: "/design-match/profil-v3", iconPath: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    ],
  },
];

export type V3ShellProps = {
  firstName: string | null;
  fullName: string | null;
  /** href de l'item sidebar à marquer actif (ex: "/design-match/coach-v3"). */
  activeHref: string;
  topbarTitle?: string;
  topbarSubtitle?: string;
  /** Padding/scroll du main wrapper. Défaut : padding standard V3. */
  mainPadding?: string;
  children: React.ReactNode;
};

export function V3Shell({
  firstName,
  fullName,
  activeHref,
  topbarTitle,
  topbarSubtitle,
  mainPadding = "0 24px 24px 24px",
  children,
}: V3ShellProps) {
  const displayName = firstName ?? "";
  const pillName = fullName ?? "Mon profil";
  const title =
    topbarTitle ??
    (displayName ? `Bonjour ${displayName}` : "Bonjour");
  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-v3-main] { padding: 0 20px 12px 20px !important; }
        }
        @media (max-width: 999px) {
          [data-v3-sidebar] { display: none !important; }
          [data-v3-content] { margin-left: 0 !important; }
          [data-v3-main] { padding: 0 16px 16px 16px !important; }
          [data-v3-topbar] { padding: 0 16px !important; }
        }
      `}</style>
      <MobileNav />
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-v3-sidebar>
          <V3Sidebar activeHref={activeHref} />
        </div>
        <div
          data-v3-content
          style={{
            marginLeft: 280,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <V3Topbar title={title} subtitle={topbarSubtitle} pillName={pillName} />
          <main
            data-v3-main
            style={{
              padding: mainPadding,
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

function V3Sidebar({ activeHref }: { activeHref: string }) {
  return (
    <aside
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
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 24px 20px 24px" }}>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span style={{ color: C.navy, letterSpacing: "0.16em", fontSize: 15, fontWeight: 700 }}>
          LIBERIA
        </span>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        {NAV.map((section) => (
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
              const active = item.href === activeHref;
              const paths = item.iconPath.split("|");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      {item.iconCircle && <circle cx="12" cy="12" r="10" />}
                      {paths.map((d, i) => <path key={i} d={d} />)}
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
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark, letterSpacing: "0.04em" }}>
              LIBERIA PREMIUM
            </span>
          </div>
          <p style={{ marginTop: 8, fontSize: 11.5, color: C.textMuted, lineHeight: 1.45 }}>
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <Link
            href="/settings/subscription"
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
  );
}

function V3Topbar({
  title,
  subtitle,
  pillName,
}: {
  title: string;
  subtitle?: string;
  pillName: string;
}) {
  return (
    <header
      data-v3-topbar
      style={{
        height: 68,
        padding: "0 42px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0 }}>
          {title} <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        {subtitle && (
          <p style={{ marginTop: 4, fontSize: 13, color: C.textMuted, margin: "4px 0 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/profile"
          aria-label="Mon profil"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px 4px 4px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: C.textDark }}>
            {pillName}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Link>
      </div>
    </header>
  );
}

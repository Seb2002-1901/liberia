/**
 * Phase 5.0 — /design-match/objectifs-v3
 *
 * Page Objectifs V3 — cockpit financier dense aligné sur Revenus V3
 * (référence cockpit officielle). Mêmes tokens, mêmes hauteurs,
 * mêmes patterns que dashboard-v3, coach-v3, plan-v3, revenus-v3,
 * depenses-v3 et budget-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr) : ObjectifsHero navy · ResumeCard
 *   Row 2 (3 × 1fr)     : ObjectifsActifsCard · PrioritesIACard · GainsFutursCard
 *   Row 3 (3 × 1fr)     : ProgressionMensuelleCard · JalonsCard · ConseilIACard
 *   Row 4 (full width)  : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { getFinanceData } from "@/lib/services/finance";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design Match v3 — Objectifs",
  robots: { index: false, follow: false },
};

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
  notifBadge: "#7FA2E6",
  success: "#10A37F",
  successBg: "#ECFDF5",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  gold: "#FBBF24",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

export default async function DesignMatchObjectifsV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-obj-row] { grid-template-columns: 1fr !important; }
          [data-obj-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-obj-sidebar] { display: none !important; }
          [data-obj-content] { margin-left: 0 !important; }
          [data-obj-main] { padding: 0 16px 16px 16px !important; }
          [data-obj-topbar] { padding: 0 16px !important; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div data-obj-sidebar>
          <Sidebar />
        </div>
        <div data-obj-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-obj-main
            style={{
              padding: "0 24px 6px 24px",
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 6 }}>
              <ObjectifsHero />
              <ResumeCard />
            </div>
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 6 }}>
              <ObjectifsActifsCard />
              <PrioritesIACard />
              <GainsFutursCard />
            </div>
            <div data-obj-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 6 }}>
              <ProgressionMensuelleCard />
              <JalonsCard />
              <ConseilIACard />
            </div>
            <MissionFooter />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Objectifs actif) ═══════════════ */

function Sidebar() {
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
        <NavSection title="PRINCIPAL">
          <NavItem label="Tableau de bord" href="/design-match/dashboard-v3" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" />
          <NavItem label="Coach IA" href="/design-match/coach-v3" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <NavItem label="Mon analyse" href="/design-match/mon-analyse-v3" iconPath="M22 12h-4l-3 9L9 3l-3 9H2" />
          <NavItem label="Plan d'action" href="/design-match/plan-v3" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" href="/design-match/revenus-v3" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" />
          <NavItem label="Dépenses" href="/design-match/depenses-v3" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" href="/design-match/budget-v3" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" />
          <NavItem label="Objectifs" href="/design-match/objectifs-v3" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" active />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" href="/design-match/profil-v3" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </NavSection>
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

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          padding: "8px 12px 6px 12px",
          fontSize: 10.5,
          fontWeight: 600,
          color: C.textLight,
          letterSpacing: "0.16em",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function NavItem({
  label,
  href,
  iconPath,
  iconCircle,
  active = false,
}: {
  label: string;
  href: string;
  iconPath: string;
  iconCircle?: boolean;
  active?: boolean;
}) {
  const paths = iconPath.split("|");
  return (
    <Link
      href={href}
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
          {iconCircle && <circle cx="12" cy="12" r="10" />}
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
        {label}
      </span>
    </Link>
  );
}
/* ═══════════════ TOPBAR ═══════════════ */

function Topbar({
  firstName,
  fullName,
}: {
  firstName: string | null;
  fullName: string | null;
}) {
  const displayName = firstName ?? "explorer";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-obj-topbar
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
          Bonjour {displayName} <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: C.textMuted, margin: "4px 0 0 0" }}>
          Atteignez vos rêves grâce à des objectifs clairs et un plan d&apos;action personnalisé.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "none",
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: 999,
              backgroundColor: C.notifBadge,
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            2
          </span>
        </button>
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
/* ═══════════════ ROW 1 ═══════════════ */

function ObjectifsHero() {
  return (
    <div
      style={{
        position: "relative",
        padding: "14px 20px",
        backgroundColor: C.navy,
        borderRadius: 14,
        boxShadow: SHADOW.navy,
        overflow: "hidden",
        minHeight: 112,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.20) 0%, rgba(96, 165, 250, 0) 65%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Progression globale
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
            <p
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 700,
                color: "white",
                lineHeight: 1,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.025em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              62 %
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
              de vos objectifs atteints
            </p>
          </div>
          <div style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 380 }}>
            <div style={{ width: "62%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)" }}>
            4 objectifs actifs
          </p>
        </div>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 999,
            backgroundColor: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 18px -6px rgba(0, 0, 0, 0.30)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" fill={C.primary} />
            <path d="M12 2v3" />
            <path d="M19 5l-2 2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ResumeCard() {
  const rows = [
    { label: "Objectifs actifs", value: "4", color: C.textDark },
    { label: "Objectifs atteints", value: "2", color: C.success },
    { label: "Montant cible", value: "155 000 CHF", color: C.textDark },
    { label: "Montant épargné", value: "96 200 CHF", color: C.primary },
  ];
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        minHeight: 112,
      }}
    >
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Résumé
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, flex: 1, alignContent: "center" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <p style={{ margin: 0, fontSize: 10, color: C.textMuted, lineHeight: 1.3 }}>{r.label}</p>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: 14,
                fontWeight: 700,
                color: r.color,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function ObjectifsActifsCard() {
  const goals = [
    { label: "Achat maison", sub: "Lausanne", pct: 75, amount: "75 000 / 100 000", color: C.primary, iconBg: C.primaryBg },
    { label: "Voyage famille", sub: "Maldives", pct: 40, amount: "4 000 / 10 000", color: C.success, iconBg: C.successBg },
    { label: "Retraite anticipée", sub: "Liberté financière", pct: 28, amount: "17 200 / 60 000", color: C.violet, iconBg: C.violetBg },
    { label: "Indépendance fin.", sub: "Revenus passifs", pct: 15, amount: "0 / 35 000", color: C.amber, iconBg: C.amberBg },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Vos objectifs actifs
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        4 en cours
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {goals.map((g) => (
          <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {g.label}
                </span>
                <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {g.amount}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${g.pct}%`, height: "100%", backgroundColor: g.color, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 10, color: g.color, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>
                  {g.pct}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrioritesIACard() {
  const items = [
    {
      tag: "ÉPARGNE",
      tagColor: C.success,
      tagBg: C.successBg,
      title: "Épargner +300 CHF/mois",
      impact: "+1 an d'avance",
    },
    {
      tag: "DÉPENSES",
      tagColor: C.coral,
      tagBg: C.coralBg,
      title: "Réduire 200 CHF de plus",
      impact: "+5% progression",
    },
    {
      tag: "INVEST",
      tagColor: C.violet,
      tagBg: C.violetBg,
      title: "Investir 500 CHF/mois",
      impact: "+2 ans d'avance",
    },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Priorités IA
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Actions à fort impact
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.title} style={{ padding: "6px 8px", borderRadius: 7, backgroundColor: C.pageBg, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "inline-flex", alignSelf: "flex-start", padding: "1px 5px", borderRadius: 999, backgroundColor: it.tagBg, color: it.tagColor, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em" }}>
              {it.tag}
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.title}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.success, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {it.impact}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GainsFutursCard() {
  const rows = [
    { label: "Dans 1 an", value: "120 000", delta: "+24K" },
    { label: "Dans 3 ans", value: "165 000", delta: "+69K" },
    { label: "Dans 5 ans", value: "220 000", delta: "+124K" },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Gains futurs
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Projection patrimoine
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: C.successBg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 11, color: C.textMuted }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
              {r.value}
            </span>
            <span style={{ fontSize: 10, color: C.success, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {r.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function ProgressionMensuelleCard() {
  const points = [
    { label: "Nov.", value: 25000 },
    { label: "Déc.", value: 32000 },
    { label: "Janv.", value: 38000 },
    { label: "Févr.", value: 44000 },
    { label: "Mars", value: 51000 },
    { label: "Avr.", value: 58000 },
    { label: "Mai", value: 65000 },
    { label: "Juin", value: 72000 },
    { label: "Juil.", value: 79000 },
    { label: "Août", value: 85000 },
    { label: "Sept.", value: 91000 },
    { label: "Oct.", value: 96200 },
  ];
  const W = 360;
  const HH = 95;
  const PAD = { top: 14, right: 14, bottom: 14, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 0;
  const maxV = 100000;
  const range = maxV - minV;
  const scaled = points.map((p, i) => ({
    ...p,
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + innerH - ((p.value - minV) / range) * innerH,
  }));
  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const baselineY = PAD.top + innerH;
  const areaD = `${pathD} L ${scaled[scaled.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${scaled[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const yTicks = [20000, 60000, 100000];
  const last = scaled[scaled.length - 1];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Progression mensuelle
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            12 derniers mois
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
            borderRadius: 999,
            backgroundColor: C.successBg,
            fontSize: 10,
            fontWeight: 700,
            color: C.success,
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 6 23 6 23 12" />
            <polyline points="22 6 13.5 14.5 8.5 9.5 1 17" />
          </svg>
          +18 700 CHF
        </span>
      </div>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="obj-prog-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((v) => {
            const y = PAD.top + innerH - ((v - minV) / range) * innerH;
            return (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.5} />
                <text x={PAD.left - 4} y={y + 2} fontSize="7.5" fill={C.textLight} textAnchor="end">
                  {v / 1000}K
                </text>
              </g>
            );
          })}
          <path d={areaD} fill="url(#obj-prog-grad)" />
          <path d={pathD} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.8} fill="white" stroke={C.primary} strokeWidth={1.3} />
          ))}
          <circle cx={last.x} cy={last.y} r={3.5} fill={C.primary} />
          <text x={last.x} y={last.y - 6} fontSize="8.5" fontWeight="700" fill={C.primary} fontFamily="Outfit, Inter, system-ui" textAnchor="end">
            96 200 CHF
          </text>
          {scaled.filter((_, i) => i % 2 === 0).map((p) => (
            <text key={`x-${p.label}`} x={p.x} y={HH - 4} fontSize="7" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function JalonsCard() {
  const items = [
    {
      month: "JUIN",
      day: "15",
      label: "Voyage en famille",
      sub: "Épargner 1 000 CHF",
      delay: "Dans 3 jours",
      delayColor: C.coral,
    },
    {
      month: "JUIL.",
      day: "01",
      label: "Achat maison",
      sub: "Épargner 2 500 CHF",
      delay: "Dans 2 semaines",
      delayColor: C.amber,
    },
    {
      month: "AOÛT",
      day: "01",
      label: "Retraite anticipée",
      sub: "Investir 800 CHF",
      delay: "Dans 1 mois",
      delayColor: C.textMuted,
    },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Jalons à venir
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Prochaines échéances
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <div
              style={{
                width: 32,
                textAlign: "center",
                flexShrink: 0,
                padding: "3px 0",
                borderRadius: 5,
                backgroundColor: C.cardBg,
              }}
            >
              <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: C.textMuted, letterSpacing: "0.06em" }}>
                {it.month}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", lineHeight: 1, letterSpacing: "-0.025em" }}>
                {it.day}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.label}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9.5, fontWeight: 700, color: it.delayColor }}>
                {it.delay}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConseilIACard() {
  return (
    <div
      style={{
        padding: "6px 14px",
        backgroundColor: C.primaryBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: C.navy,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Conseil IA
        </p>
      </div>
      <p style={{ margin: "6px 0 0 0", fontSize: 11.5, color: C.textDark, fontWeight: 700, lineHeight: 1.3 }}>
        Vous êtes sur la bonne voie !
      </p>
      <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textDark, lineHeight: 1.35 }}>
        En épargnant 300 CHF de plus par mois, vous atteindrez vos objectifs 1 an plus tôt et économiserez 6 200 CHF d&apos;intérêts.
      </p>
      <button
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: "white",
          color: C.primary,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Parler à mon conseiller
      </button>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter() {
  return (
    <div
      style={{
        padding: "8px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 12,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 999,
            backgroundColor: C.successBg,
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Félicitations ! Vous avez épargné 96 200 CHF au total.
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
            Continuez comme ça, vous construisez votre avenir.
            {" • "}
            <span style={{ color: C.success, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>62 % de l&apos;objectif global atteint</span>
          </p>
        </div>
      </div>
      <button
        style={{
          padding: "7px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: C.navy,
          color: "white",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Créer un nouvel objectif
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

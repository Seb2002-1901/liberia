/**
 * Phase 5.0 — /design-match/investissements-v3
 *
 * Page Investissements V3 — cockpit financier dense aligné sur
 * Revenus V3 (référence cockpit officielle). Mêmes tokens, mêmes
 * hauteurs, mêmes patterns que dashboard-v3, coach-v3, plan-v3,
 * revenus-v3, depenses-v3, budget-v3, objectifs-v3 et epargne-v3
 * (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 (1.6fr / 1fr)        : HeroPortefeuille · PerformanceGlobaleCard
 *   Row 2 (1.2fr / 1fr / 1fr)  : AllocationCard · OpportunitesCard · ProduitsCard
 *   Row 3 (1.4fr / 1fr / 1fr)  : PerformanceChartCard · ProjectionCard · ConseilIACard
 *   Row 4 (full width)         : MissionFooter
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getFinanceData } from "@/lib/services/finance";

// Auth via cookies Supabase — pas de prerender possible.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.pageTitles");
  return {
    title: `${t("investissements")} — LIBERIA`,
    robots: { index: false, follow: false },
  };
}

/* ═══════════════ NOTE ARCHITECTURE ═══════════════
 *
 * Aucune table, aucun service, aucun moteur de calcul lié aux
 * investissements n'existe en base aujourd'hui :
 *  - pas de table portfolios / holdings / transactions
 *  - pas de feed market data ou rendements indexés
 *  - pas de catalogue d'instruments (ETF, actions, obligations)
 *  - pas de moteur d'allocation, de projection, de performance
 *
 * La page V3 conserve donc sa structure de cockpit (4 rows × N
 * colonnes, même langage visuel que dashboard-v3 / epargne-v3) mais
 * toutes les cartes basculent en empty states premium honnêtes.
 * Aucun montant, aucun rendement, aucune allocation, aucune
 * performance n'est inventé. Tous les CTA pointent vers /coach.
 * ═══════════════════════════════════════════════ */

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
  donutGrey: "#CBD5E1",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

export default async function DesignMatchInvestissementsV3() {
  const data = await getFinanceData();
  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-inv-row] { grid-template-columns: 1fr !important; }
          [data-inv-main] { padding: 0 20px 12px 20px !important; gap: 10px !important; }
        }
        @media (max-width: 999px) {
          [data-inv-sidebar] { display: none !important; }
          [data-inv-content] { margin-left: 0 !important; }
          [data-inv-main] { padding: 0 16px 16px 16px !important; }
          [data-inv-topbar] { padding: 0 16px !important; }
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
        <div data-inv-sidebar>
          <Sidebar />
        </div>
        <div data-inv-content style={{ marginLeft: 280, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-inv-main
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
            <div data-inv-row style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
              <HeroPortefeuille />
              <PerformanceGlobaleCard />
            </div>
            <div data-inv-row style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
              <AllocationCard />
              <OpportunitesCard />
              <ObjectifsFinancesCard />
            </div>
            <div data-inv-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <PerformanceChartCard />
              <ProjectionCard />
              <ConseilIACard />
            </div>
            <MissionFooter />
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Investissements actif) ═══════════════ */

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
          <NavItem label="Objectifs" href="/design-match/objectifs-v3" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" href="/design-match/epargne-v3" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" active />
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
  const displayName = firstName ?? "";
  const pillName = fullName ?? "Mon profil";
  return (
    <header
      data-inv-topbar
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
          Faites fructifier votre argent intelligemment et atteignez vos objectifs plus vite.
        </p>
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
/* ═══════════════ ROW 1 ═══════════════ */

function HeroPortefeuille() {
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
            Portefeuille
          </p>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 22,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              fontFamily: "Outfit, Inter, system-ui",
              letterSpacing: "-0.02em",
            }}
          >
            Aucun portefeuille suivi
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.4, maxWidth: 420 }}>
            Vos investissements ne sont pas encore connectés à LIBERIA. Le module sera disponible une fois les intégrations bancaires en place.
          </p>
          <Link
            href="/coach"
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 11px",
              backgroundColor: "rgba(255,255,255,0.16)",
              color: "white",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            En parler au coach
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
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
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PerformanceGlobaleCard() {
  // Empty state honnête : aucun rendement, aucune performance, aucune
  // volatilité, aucun "Score IA" investissements n'est calculable sans
  // portefeuille tracké.
  const labels = ["Rendement", "Performance", "Volatilité", "Score IA"];
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
        Performance globale
      </p>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 1 }}>
        {labels.map((label) => (
          <div key={label} style={{ padding: "5px 8px", backgroundColor: C.pageBg, borderRadius: 7 }}>
            <p style={{ margin: 0, fontSize: 9, color: C.textMuted }}>{label}</p>
            <p
              style={{
                margin: "1px 0 0 0",
                fontSize: 12,
                fontWeight: 700,
                color: C.textLight,
                fontFamily: "Outfit, Inter, system-ui",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              —
            </p>
          </div>
        ))}
      </div>
      <p style={{ margin: "6px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35 }}>
        Aucune performance calculable sans portefeuille suivi.
      </p>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function AllocationCard() {
  // Empty state honnête : aucune classe d'actifs (ETF, actions,
  // immobilier, cash, crypto) n'est trackée. Ne pas afficher les
  // 35/30/20/10/5 mockés serait inventer une répartition.
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Allocation
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Répartition de votre portefeuille
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flex: 1 }}>
        <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
          <svg viewBox="0 0 100 100" width={104} height={104}>
            <circle cx={50} cy={50} r={42} fill={C.pageBg} />
            <circle cx={50} cy={50} r={28} fill={C.cardBg} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ margin: 0, fontSize: 9, color: C.textMuted, textAlign: "center", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Non<br />disponible
            </p>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
            Allocation non disponible
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.4 }}>
            Aucune classe d&apos;actifs (ETF, actions, immobilier, cash) n&apos;est trackée. La répartition s&apos;affichera dès l&apos;intégration des comptes-titres.
          </p>
        </div>
      </div>
    </div>
  );
}

function OpportunitesCard() {
  // Empty state honnête : aucune logique de recommandation
  // d'investissement n'est implémentée (pas de profil de risque, pas
  // de catalogue, pas de moteur de scoring). Annoncer +8% ETF Monde
  // serait inventer un rendement et conseiller un produit.
  return (
    <div style={{ padding: "17px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Opportunités
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Aucune opportunité ciblée
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "12px 8px",
          backgroundColor: C.pageBg,
          borderRadius: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            marginBottom: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Pas de recommandations
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
          LIBERIA ne suggère aucun produit financier nommé. Ton coach peut t&apos;orienter sur les principes selon ta situation.
        </p>
      </div>
    </div>
  );
}

function ObjectifsFinancesCard() {
  // Empty state honnête : le lien "portefeuille → financement
  // d'objectifs" n'existe pas. Même si des goals sont définis côté
  // Objectifs, on ne peut pas afficher "votre portefeuille finance
  // X" tant qu'aucun portefeuille n'est tracké.
  return (
    <div style={{ padding: "18px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Objectifs financés
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Lien portefeuille ↔ objectifs
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "12px 8px",
          backgroundColor: C.pageBg,
          borderRadius: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            marginBottom: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <path d="M4 22V15" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Lien non disponible
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
          Aucun portefeuille n&apos;est tracké pour le moment. Vos objectifs restent gérés depuis la page Objectifs.
        </p>
        <Link
          href="/goals"
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: C.primary,
            textDecoration: "none",
          }}
        >
          Voir mes objectifs
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function PerformanceChartCard() {
  // Empty state honnête : pas de série temporelle de valeur de
  // portefeuille (pas de marquage mensuel, pas de flux historique).
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Performance
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Historique 12 mois
          </p>
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "12px 8px",
          backgroundColor: C.pageBg,
          borderRadius: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            marginBottom: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Historique non disponible
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.35, maxWidth: 280 }}>
          Aucune valeur historique de portefeuille n&apos;est archivée. La courbe sera tracée dès l&apos;intégration des comptes-titres.
        </p>
      </div>
    </div>
  );
}

function ProjectionCard() {
  // Empty state honnête : projection patrimoine 5/10 ans = invention
  // pure (pas de rendement attendu, pas de scénario économique, pas
  // de moteur de simulation Monte Carlo calibré).
  return (
    <div style={{ padding: "15px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Projection
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Patrimoine projeté
      </p>
      <div
        style={{
          marginTop: 8,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "12px 8px",
          backgroundColor: C.pageBg,
          borderRadius: 8,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
          Aucune projection fiable
        </p>
        <p style={{ margin: "4px 0 0 0", fontSize: 10, color: C.textMuted, lineHeight: 1.35, maxWidth: 220 }}>
          LIBERIA n&apos;extrapole pas de projection patrimoniale tant qu&apos;aucune donnée fiable n&apos;est disponible.
        </p>
      </div>
    </div>
  );
}

function ConseilIACard() {
  return (
    <div
      style={{
        padding: "15px 14px",
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
            backgroundColor: C.primary,
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.primary, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Conseil IA
        </p>
      </div>
      <p style={{ margin: "8px 0 0 0", fontSize: 12, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
        Pas encore de portefeuille suivi.
      </p>
      <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.4, flex: 1 }}>
        LIBERIA n&apos;émet aucune recommandation d&apos;investissement aujourd&apos;hui. La priorité reste votre fonds d&apos;urgence et vos objectifs concrets — votre coach peut vous y accompagner.
      </p>
      <Link
        href="/coach"
        style={{
          marginTop: 8,
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: C.primary,
          color: "white",
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}

/* ═══════════════ ROW 4 — MISSION FOOTER ═══════════════ */

function MissionFooter() {
  return (
    <div
      style={{
        padding: "13px 16px",
        backgroundColor: C.navy,
        borderRadius: 12,
        boxShadow: SHADOW.flat,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.14)",
            flexShrink: 0,
            fontSize: 16,
          }}
          aria-hidden
        >
          🚀
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "white", fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Renforce d&apos;abord les bases
          </p>
          <p style={{ margin: "6px 0 0 0", fontSize: 10.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>
            Aucun portefeuille suivi aujourd&apos;hui. Consolide ton fonds d&apos;urgence et tes objectifs — ton coach peut t&apos;orienter.
          </p>
        </div>
      </div>
      <Link
        href="/coach"
        style={{
          padding: "9px 14px",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: "white",
          color: C.navy,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        En parler au coach
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
}


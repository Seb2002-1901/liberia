/**
 * Phase 5.0 — /design-match/budget-v3
 *
 * Page Budget V3 — cockpit financier dense aligné sur dashboard-v3,
 * coach-v3, plan-v3, revenus-v3 et depenses-v3 (références verrouillées).
 *
 * DESKTOP (cockpit one-page, ≥ 1200) :
 *   Row 1 : BudgetHero navy · AperçuRapideCard
 *   Row 2 : BudgetCategorieCard · SanteBudgetCard
 *   Row 3 : EvolutionBudgetCard · AlerteBudgetaireCard
 *   Row 4 : ProjectionEpargneCard · RepartitionIdealeCard · ActionsRapidesCard
 *   Row 5 : ConseilIACard (bandeau pleine largeur)
 *
 * MOBILE/TABLET (< 1200) : stack vertical via media queries.
 */

export const metadata = {
  title: "Design Match v3 — Budget",
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
  donutGrey: "#CBD5E1",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  navy: "0 2px 6px rgb(2 31 96 / 0.08), 0 24px 48px -16px rgb(2 31 96 / 0.30)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

export default function DesignMatchBudgetV3() {
  return (
    <>
      <style>{`
        @media (max-width: 1199px) {
          [data-bud-row] { grid-template-columns: 1fr !important; }
          [data-bud-main] { padding: 0 20px 12px 20px !important; gap: 12px !important; }
        }
        @media (max-width: 999px) {
          [data-bud-sidebar] { display: none !important; }
          [data-bud-content] { margin-left: 0 !important; }
          [data-bud-main] { padding: 0 16px 16px 16px !important; }
          [data-bud-topbar] { padding: 0 16px !important; }
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
        <div data-bud-sidebar>
          <Sidebar />
        </div>
        <div data-bud-content style={{ marginLeft: 248, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <main
            data-bud-main
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
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <BudgetHero />
              <AperçuRapideCard />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
              <BudgetCategorieCard />
              <SanteBudgetCard />
              <AlerteBudgetaireCard />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 8 }}>
              <EvolutionBudgetCard />
              <ProjectionEpargneCard />
              <RepartitionIdealeCard />
            </div>
            <div data-bud-row style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 8 }}>
              <ActionsRapidesCard />
              <ConseilIACard />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ SIDEBAR (Budget actif) ═══════════════ */

function Sidebar() {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 248,
        backgroundColor: C.cardBg,
        borderRight: `1px solid ${C.borderGhost}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            backgroundColor: C.navy,
            borderRadius: 7,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V6" />
            <path d="M4 20h14" />
            <path d="M8 14l4-4 3 3 5-6" />
          </svg>
        </span>
        <span style={{ color: C.navy, letterSpacing: "0.16em", fontSize: 14, fontWeight: 700 }}>
          LIBERIA
        </span>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
        <NavSection title="PRINCIPAL">
          <NavItem label="Tableau de bord" iconPath="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22" />
          <NavItem label="Coach IA" iconPath="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <NavItem label="Plan d'action" iconPath="M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </NavSection>
        <NavSection title="FINANCES">
          <NavItem label="Revenus" iconCircle iconPath="M12 5v14|M5 12l7-7 7 7" />
          <NavItem label="Dépenses" iconCircle iconPath="M12 19V5|M5 12l7 7 7-7" />
          <NavItem label="Budget" iconPath="M21.21 15.89A10 10 0 1 1 8 2.83|M22 12A10 10 0 0 0 12 2v10z" active />
          <NavItem label="Objectifs" iconPath="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15" />
        </NavSection>
        <NavSection title="CROISSANCE">
          <NavItem label="Épargne" iconPath="M21 11h-1a4 4 0 0 0-4-4h-4a8 8 0 0 0-8 8 6 6 0 0 0 6 6h2v-3h4v3h2a6 6 0 0 0 4-2v-2h2v-6z" />
          <NavItem label="Investissements" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
          <NavItem label="Opportunités" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <NavItem label="Profil" iconPath="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </NavSection>
      </nav>
      <div style={{ padding: 10 }}>
        <div
          style={{
            padding: 12,
            backgroundColor: C.navy,
            borderRadius: 11,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={C.gold}>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "white", letterSpacing: "0.04em" }}>
              LIBERIA PREMIUM
            </span>
          </div>
          <p style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>
            Débloquez tout le potentiel de votre conseiller financier.
          </p>
          <button
            style={{
              width: "100%",
              marginTop: 8,
              padding: "6px 10px",
              border: "none",
              backgroundColor: "white",
              fontSize: 11.5,
              fontWeight: 500,
              color: C.navy,
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            Découvrir Premium
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          padding: "6px 10px 4px 10px",
          fontSize: 10,
          fontWeight: 600,
          color: C.textLight,
          letterSpacing: "0.16em",
          margin: 0,
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
  iconPath,
  iconCircle,
  active = false,
}: {
  label: string;
  iconPath: string;
  iconCircle?: boolean;
  active?: boolean;
}) {
  const paths = iconPath.split("|");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "5px 8px",
        backgroundColor: active ? C.primaryBg : "transparent",
        borderRadius: 7,
        cursor: "pointer",
        marginBottom: 1,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          backgroundColor: active ? C.primary : "#F1F5F9",
          borderRadius: 5,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : C.textMuted} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          {iconCircle && <circle cx="12" cy="12" r="10" />}
          {paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: active ? 600 : 500,
          color: active ? C.textDark : C.textMuted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ═══════════════ TOPBAR ═══════════════ */

function Topbar() {
  return (
    <header
      data-bud-topbar
      style={{
        height: 60,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: C.pageBg,
      }}
    >
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: C.textDark, lineHeight: 1.1, margin: 0, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Bonjour Sébastien <span style={{ fontWeight: 400 }}>👋</span>
        </h1>
        <p style={{ marginTop: 2, fontSize: 11.5, color: C.textMuted, margin: "2px 0 0 0" }}>
          Gérez votre budget et gardez le contrôle de vos finances.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          aria-label="Notifications"
          style={{
            position: "relative",
            width: 32,
            height: 32,
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: C.notifBadge,
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            2
          </span>
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "3px 10px 3px 3px",
            borderRadius: 999,
            backgroundColor: C.cardBg,
            boxShadow: SHADOW.kpi,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 500, color: C.textDark }}>
            Sébastien Golay
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════ ROW 1 ═══════════════ */

function BudgetHero() {
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
      <div style={{ position: "relative" }}>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Budget de ce mois
        </p>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            lineHeight: 1,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.025em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          2 340 CHF
        </p>
        <p style={{ margin: "3px 0 0 0", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          restants sur 18 000 CHF
        </p>
        <div style={{ marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
          <div style={{ width: "86%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>
            86 % utilisé
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              backgroundColor: "rgba(16, 163, 127, 0.20)",
              fontSize: 10,
              fontWeight: 700,
              color: "#5EEAD4",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sur la bonne voie
          </span>
        </div>
      </div>
    </div>
  );
}

function AperçuRapideCard() {
  const rows = [
    { label: "Revenus prévus", value: "25 000 CHF", delta: "+4.2%", deltaColor: C.success },
    { label: "Dépenses prévues", value: "18 000 CHF", delta: "−3.6%", deltaColor: C.success },
    { label: "Épargne prévue", value: "7 000 CHF", delta: "+8.1%", deltaColor: C.success },
  ];
  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: C.cardBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        minHeight: 116,
      }}
    >
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Aperçu rapide
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 10, flex: 1, alignItems: "center" }}>
        {rows.map((r) => (
          <div key={r.label}>
            <p style={{ margin: 0, fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>
              {r.label}
            </p>
            <p
              style={{
                margin: "3px 0 0 0",
                fontSize: 16,
                fontWeight: 700,
                color: C.textDark,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.value}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: 10.5, fontWeight: 600 }}>
              <span style={{ color: r.deltaColor, fontVariantNumeric: "tabular-nums" }}>{r.delta}</span>
              <span style={{ color: C.textMuted, marginLeft: 4, fontWeight: 500 }}>vs mois dernier</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 2 ═══════════════ */

function BudgetCategorieCard() {
  const slices = [
    { id: "logement", label: "Logement", prevu: "6 200", reel: "5 850", pct: 39, color: C.primary, status: "ok" as const },
    { id: "alimentation", label: "Alimentation", prevu: "2 850", reel: "2 620", pct: 18, color: C.success, status: "ok" as const },
    { id: "transports", label: "Transports", prevu: "1 920", reel: "2 150", pct: 12, color: C.amber, status: "warn" as const },
    { id: "loisirs", label: "Loisirs", prevu: "1 680", reel: "1 750", pct: 11, color: C.violet, status: "warn" as const },
    { id: "assurances", label: "Assurances", prevu: "1 120", reel: "1 020", pct: 7, color: C.coral, status: "ok" as const },
    { id: "autres", label: "Autres", prevu: "2 230", reel: "2 610", pct: 13, color: C.donutGrey, status: "warn" as const },
  ];
  let cursor = -90;
  const gap = 1;
  const usableDeg = 360 - gap * slices.length;
  const total = slices.reduce((s, x) => s + x.pct, 0);
  const slicesWithPaths = slices.map((s) => {
    const sweep = (s.pct / total) * usableDeg;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    const path = donutSliceD(50, 50, 42, 28, startDeg, endDeg);
    cursor = endDeg + gap;
    return { ...s, path };
  });
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Budget par catégorie
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Prévu vs Réel
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
        <div style={{ position: "relative", flexShrink: 0, width: 90, height: 90 }}>
          <svg viewBox="0 0 100 100" width={90} height={90}>
            {slicesWithPaths.map((s) => (
              <path key={s.id} d={s.path} fill={s.color} />
            ))}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              18 000
            </p>
            <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted, letterSpacing: "0.14em" }}>
              CHF
            </p>
            <p style={{ margin: "1px 0 0 0", fontSize: 8, color: C.textMuted }}>
              Dépenses
            </p>
          </div>
        </div>
        <table style={{ flex: 1, borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.borderGhost}` }}>
              <th style={{ textAlign: "left", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>CATÉGORIE</th>
              <th style={{ textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>PRÉVU</th>
              <th style={{ textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>RÉEL</th>
              <th style={{ width: 22, textAlign: "right", padding: "2px 0", fontWeight: 600, color: C.textLight, fontSize: 8.5, letterSpacing: "0.06em" }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {slicesWithPaths.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i === slicesWithPaths.length - 1 ? "none" : `1px solid ${C.borderGhost}` }}>
                <td style={{ padding: "3px 0", color: C.textDark, fontWeight: 500 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 999, backgroundColor: s.color }} />
                    {s.label}
                  </span>
                </td>
                <td style={{ padding: "3px 0", color: C.textDark, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{s.prevu}</td>
                <td style={{ padding: "3px 0", color: s.status === "ok" ? C.textDark : C.amber, fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{s.reel}</td>
                <td style={{ padding: "3px 0", textAlign: "right" }}>
                  <StatusIcon ok={s.status === "ok"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: ok ? C.successBg : C.amberBg,
      }}
    >
      {ok ? (
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
    </span>
  );
}

function SanteBudgetCard() {
  const score = 78;
  // Semi-circle gauge : arc top half (-180 to 0 deg)
  const r = 38;
  const cx = 50;
  const cy = 50;
  // Score 78/100 → fraction 0.78
  const startAngle = -180;
  const endAngle = startAngle + 180 * (score / 100);
  const arcPath = gaugeArcD(cx, cy, r, startAngle, endAngle);
  const trackPath = gaugeArcD(cx, cy, r, -180, 0);
  // Color zones : red 0-50, amber 50-75, green 75-100
  const scoreColor = score >= 75 ? C.success : score >= 50 ? C.amber : C.danger;
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Santé du budget
      </p>
      <div style={{ position: "relative", width: 110, height: 62, margin: "4px auto 0 auto" }}>
        <svg viewBox="0 0 100 60" width={110} height={62}>
          <path d={trackPath} fill="none" stroke={C.borderGhost} strokeWidth="8" strokeLinecap="round" />
          <path d={arcPath} fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.025em", lineHeight: 1 }}>
            {score}<span style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 500 }}>/100</span>
          </p>
          <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>
            Score budget
          </p>
        </div>
      </div>
      <div style={{ marginTop: 6, padding: "5px 8px", backgroundColor: C.successBg, borderRadius: 7, display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 4, backgroundColor: C.success, flexShrink: 0, marginTop: 1 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: C.success }}>Excellent !</p>
          <p style={{ margin: "1px 0 0 0", fontSize: 9.5, color: C.textDark, lineHeight: 1.3 }}>
            Vous respectez votre budget et épargnez plus que la moyenne.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ ROW 3 ═══════════════ */

function EvolutionBudgetCard() {
  // Bars = dépenses réelles, Line dashed = budget prévu
  const points = [
    { label: "Mai", reel: 16000, prevu: 18000 },
    { label: "Juin", reel: 17500, prevu: 18000 },
    { label: "Juil.", reel: 16800, prevu: 18000 },
    { label: "Août", reel: 16500, prevu: 18000 },
    { label: "Sept.", reel: 17000, prevu: 18000 },
    { label: "Oct.", reel: 15893, prevu: 18000 },
  ];
  const W = 360;
  const HH = 105;
  const PAD = { top: 10, right: 12, bottom: 18, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = HH - PAD.top - PAD.bottom;
  const minV = 0;
  const maxV = 22000;
  const range = maxV - minV;
  const barW = innerW / points.length / 1.6;
  const scaled = points.map((p, i) => {
    const xCenter = PAD.left + (i + 0.5) * (innerW / points.length);
    const reelY = PAD.top + innerH - ((p.reel - minV) / range) * innerH;
    const prevuY = PAD.top + innerH - ((p.prevu - minV) / range) * innerH;
    return { ...p, xCenter, reelY, prevuY };
  });
  const prevuPath = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xCenter.toFixed(2)} ${p.prevuY.toFixed(2)}`).join(" ");
  const yTicks = [5000, 10000, 15000, 20000];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Évolution du budget
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
            Sur les 6 derniers mois
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, color: C.textMuted }}>
              <span style={{ display: "inline-block", width: 9, height: 7, borderRadius: 2, backgroundColor: C.primary, opacity: 0.6 }} />
              Dépenses réelles
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, color: C.textMuted }}>
              <span style={{ display: "inline-block", width: 14, height: 1.5, backgroundColor: C.primary, marginTop: 1, position: "relative" }} aria-hidden>
                <span style={{ position: "absolute", top: -1, left: 3, width: 3, height: 1.5, backgroundColor: "white" }} />
                <span style={{ position: "absolute", top: -1, left: 8, width: 3, height: 1.5, backgroundColor: "white" }} />
              </span>
              Budget prévu
            </span>
          </div>
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "3px 7px",
            backgroundColor: C.pageBg,
            border: `1px solid ${C.borderGhost}`,
            fontSize: 10.5,
            fontWeight: 500,
            color: C.textDark,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          6 mois
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          {yTicks.map((v) => {
            const y = PAD.top + innerH - ((v - minV) / range) * innerH;
            return (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#EDF2F8" strokeWidth={0.5} />
                <text x={PAD.left - 4} y={y + 2} fontSize="7.5" fill={C.textLight} textAnchor="end">
                  {v / 1000}K CHF
                </text>
              </g>
            );
          })}
          {scaled.map((p) => (
            <rect
              key={`bar-${p.label}`}
              x={p.xCenter - barW / 2}
              y={p.reelY}
              width={barW}
              height={PAD.top + innerH - p.reelY}
              fill={C.primary}
              fillOpacity={0.6}
              rx={2}
            />
          ))}
          <path d={prevuPath} stroke={C.primary} strokeWidth="1.6" strokeDasharray="4 3" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p) => (
            <circle key={`pt-${p.label}`} cx={p.xCenter} cy={p.prevuY} r={2} fill={C.primary} />
          ))}
          {scaled.map((p) => (
            <text key={`x-${p.label}`} x={p.xCenter} y={HH - 6} fontSize="8" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function AlerteBudgetaireCard() {
  return (
    <div
      style={{
        padding: "12px 14px",
        backgroundColor: C.coralBg,
        borderRadius: 14,
        boxShadow: SHADOW.card,
        display: "flex",
        flexDirection: "column",
        border: `1px solid rgba(249, 119, 87, 0.2)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
          Alerte budgétaire
        </p>
      </div>
      <p style={{ margin: "8px 0 0 0", fontSize: 11.5, fontWeight: 600, color: C.textDark, lineHeight: 1.3 }}>
        Dépenses de loisirs au-dessus du budget
      </p>
      <p style={{ margin: "3px 0 0 0", fontSize: 10.5, color: C.textMuted, lineHeight: 1.3 }}>
        Vous avez dépassé de 70 CHF ce mois-ci.
      </p>
      <p style={{ margin: "8px 0 0 0", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>
        Impact sur votre budget
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.danger, fontVariantNumeric: "tabular-nums", fontFamily: "Outfit, Inter, system-ui" }}>
        −70 CHF<span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, marginLeft: 5 }}>sur votre épargne prévue</span>
      </p>
      <button
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "7px 12px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          backgroundColor: "white",
          color: C.danger,
          fontSize: 11.5,
          fontWeight: 600,
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
        }}
      >
        Voir comment ajuster
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ ROW 4 ═══════════════ */

function ProjectionEpargneCard() {
  const points = [
    { label: "Ce mois", value: 7000 },
    { label: "Dans 3 mois", value: 21500 },
    { label: "Dans 6 mois", value: 44000 },
    { label: "Dans 12 mois", value: 95000 },
  ];
  const W = 240;
  const HH = 95;
  const PAD = { top: 16, right: 12, bottom: 18, left: 12 };
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
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Projection d&apos;épargne
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Selon votre budget actuel
      </p>
      <div style={{ marginTop: 4, flex: 1 }}>
        <svg viewBox={`0 0 ${W} ${HH}`} width="100%" height={HH} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
          <defs>
            <linearGradient id="bud-proj-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.success} stopOpacity="0.22" />
              <stop offset="100%" stopColor={C.success} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#bud-proj-grad)" />
          <path d={pathD} stroke={C.success} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {scaled.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={2.5} fill="white" stroke={C.success} strokeWidth={1.5} />
              <text x={p.x} y={p.y - 6} fontSize="8.5" fontWeight="700" fill={C.textDark} fontFamily="Outfit, Inter, system-ui" textAnchor="middle">
                {(p.value / 1000).toFixed(p.value < 10000 ? 0 : 0)}{p.value >= 1000 && p.value < 10000 ? " 000" : ""} CHF
              </text>
            </g>
          ))}
          {scaled.map((p) => (
            <text key={`x-${p.label}`} x={p.x} y={HH - 8} fontSize="7.5" fill={C.textLight} textAnchor="middle">
              {p.label}
            </text>
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", backgroundColor: C.successBg, borderRadius: 7, marginTop: 2 }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: 4, backgroundColor: C.success, flexShrink: 0 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: 9.5, color: C.textDark, lineHeight: 1.3 }}>
          Vous êtes sur la bonne trajectoire !
        </p>
      </div>
    </div>
  );
}

function RepartitionIdealeCard() {
  const rows = [
    { tag: "50%", label: "Besoins", amount: "9 000", pct: 55, color: C.primary },
    { tag: "30%", label: "Envies", amount: "5 400", pct: 28, color: C.coral },
    { tag: "20%", label: "Épargne", amount: "3 600", pct: 17, color: C.donutGrey },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Répartition idéale
      </p>
      <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em" }}>
        Règle 50/30/20
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "center" }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 28,
                fontSize: 13,
                fontWeight: 700,
                color: C.textDark,
                fontFamily: "Outfit, Inter, system-ui",
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              {r.tag}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontSize: 10.5, color: C.textDark, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {r.amount} CHF
                </span>
              </div>
              <div style={{ height: 3, backgroundColor: C.pageBg, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${r.pct * 1.5}%`, height: "100%", backgroundColor: r.color, borderRadius: 999 }} />
              </div>
            </div>
            <span style={{ fontSize: 10, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 22, textAlign: "right" }}>
              {r.pct}%
            </span>
          </div>
        ))}
      </div>
      <button
        style={{
          marginTop: 4,
          padding: "4px 0",
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 10.5,
          fontWeight: 600,
          color: C.primary,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        En savoir plus
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

function ActionsRapidesCard() {
  const items = [
    {
      title: "Ajuster mon budget",
      sub: "Modifier mes montants",
      bg: C.primaryBg,
      color: C.primary,
      iconPath: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    },
    {
      title: "Créer une catégorie",
      sub: "Ajouter une nouvelle catégorie",
      bg: C.successBg,
      color: C.success,
      iconPath: "M20 7h-3V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 11v6|M9 14h6",
    },
    {
      title: "Voir mes abonnements",
      sub: "Gérer mes paiements récurrents",
      bg: C.violetBg,
      color: C.violet,
      iconPath: "M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    },
    {
      title: "Télécharger le rapport",
      sub: "PDF / Excel",
      bg: C.amberBg,
      color: C.amber,
      iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3",
    },
  ];
  return (
    <div style={{ padding: "12px 14px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, display: "flex", flexDirection: "column" }}>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        Actions rapides
      </p>
      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", flex: 1 }}>
        {items.map((it, idx) => (
          <button
            key={it.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "3px 0",
              background: "none",
              border: "none",
              borderTop: idx === 0 ? "none" : `1px solid ${C.borderGhost}`,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, backgroundColor: it.bg, flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: C.textDark, lineHeight: 1.2 }}>
                {it.title}
              </p>
              <p style={{ margin: "1px 0 0 0", fontSize: 9, color: C.textMuted, lineHeight: 1.2 }}>
                {it.sub}
              </p>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ROW 5 — CONSEIL IA BANDEAU ═══════════════ */

function ConseilIACard() {
  return (
    <div
      style={{
        padding: "5px 16px",
        backgroundColor: C.primaryBg,
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
            backgroundColor: C.primary,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textDark, fontFamily: "Outfit, Inter, system-ui", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Conseil de votre coach IA
          </p>
          <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textDark, lineHeight: 1.3 }}>
            En automatisant 500 CHF de plus vers votre épargne chaque mois, vous pourriez atteindre la liberté financière 2 ans plus tôt.
          </p>
        </div>
      </div>
      <button
        style={{
          padding: "8px 14px",
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
        Parler à mon conseiller
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════ HELPERS ═══════════════ */

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSliceD(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, outerR, startDeg);
  const e = polarToCartesian(cx, cy, outerR, endDeg);
  const si = polarToCartesian(cx, cy, innerR, endDeg);
  const ei = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${s.x.toFixed(3)} ${s.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`,
    `L ${si.x.toFixed(3)} ${si.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ei.x.toFixed(3)} ${ei.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

function gaugeArcD(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

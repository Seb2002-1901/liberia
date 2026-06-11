/**
 * Phase 6.0 — Landing V3 publique
 *
 * Page d'accueil publique alignée sur l'identité cockpit V3
 * (navy clair, blanc, primary blue, Outfit + tabular-nums).
 *
 * Cohérence stricte avec les 13 pages V3 verrouillées :
 *   Dashboard V3, Coach IA V3, Plan V3, Revenus V3, Dépenses V3,
 *   Budget V3, Objectifs V3, Épargne V3, Investissements V3,
 *   Opportunités V3, Mon Analyse V3, Profil V3, Paramètres V3.
 *
 * Sections (single-page, scroll naturel non bloqué) :
 *   1. Hero (titre + 2 CTA + mockup cockpit V3 navy)
 *   2. Bénéfices (3 cards)
 *   3. Fonctionnement (3 étapes)
 *   4. Modules cockpit (4 modules + mini-preview)
 *   5. Pricing preview (Standard 14.95 + Premium 19.95)
 *   6. Sécurité / confidentialité (4 messages)
 *   7. FAQ courte (5 questions)
 *   8. CTA final (démarrer essai)
 *
 * i18n : copies direct FR pour cohérence visuelle stricte avec
 * la copy de spec produit (priorité visuelle sur i18n complet).
 * Les composants partagés (SiteHeader, SiteFooter) conservent
 * leurs clés next-intl.
 */

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

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
  success: "#10A37F",
  successBg: "#ECFDF5",
  coral: "#F97757",
  coralBg: "#FFF1EC",
  violet: "#9061F9",
  violetBg: "#F4EBFF",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  gold: "#FBBF24",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -10px rgb(15 23 42 / 0.08)",
  navy: "0 2px 6px rgb(2 31 96 / 0.10), 0 24px 48px -16px rgb(2 31 96 / 0.32)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.03), 0 8px 20px -8px rgb(15 23 42 / 0.06)",
};

const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export function LandingV3() {
  return (
    <div style={{ backgroundColor: C.pageBg, fontFamily: FONT_STACK, color: C.textDark }}>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <ModulesSection />
      <PricingSection />
      <SecuritySection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  );
}

/* ════════════════════ 1. HERO ════════════════════ */

function HeroSection() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 55%), radial-gradient(circle at 80% 0%, rgba(2, 31, 96, 0.06) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      <div className="container" style={{ position: "relative", padding: "72px 24px 96px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }} className="lv3-hero-grid">
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: C.primary,
                backgroundColor: C.primaryBg,
                borderRadius: 999,
                letterSpacing: "0.04em",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
              </svg>
              Copilote financier IA · 14 jours d&apos;essai gratuit
            </div>
            <h1
              style={{
                marginTop: 18,
                fontFamily: FONT_DISPLAY,
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: C.textDark,
              }}
              className="lv3-h1"
            >
              Votre <span style={{ color: C.navy }}>copilote financier IA</span> pour reprendre le contrôle de votre argent.
            </h1>
            <p style={{ marginTop: 18, fontSize: 16, color: C.textMuted, lineHeight: 1.55, maxWidth: 540 }}>
              Liberia analyse vos revenus, vos dépenses, vos objectifs et vos investissements pour vous proposer un plan d&apos;action clair, personnalisé et évolutif.
            </p>
            <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                href={ROUTES.register}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 22px",
                  backgroundColor: C.navy,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  boxShadow: SHADOW.navy,
                  textDecoration: "none",
                }}
              >
                Commencer gratuitement 14 jours
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <Link
                href={ROUTES.pricing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "13px 22px",
                  backgroundColor: C.cardBg,
                  color: C.textDark,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: `1px solid ${C.borderGhost}`,
                  textDecoration: "none",
                }}
              >
                Voir les tarifs
              </Link>
            </div>
            {/* Message officiel essai — verbatim de la politique produit Q2 2026. */}
            <p style={{ marginTop: 18, fontSize: 12, color: C.textLight, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Démarrez votre essai gratuit de 14 jours. Carte bancaire requise. Aucun prélèvement avant la fin de l&apos;essai.
            </p>
            {/* Message officiel démo — verbatim. */}
            <p style={{ marginTop: 6, fontSize: 12, color: C.textLight }}>
              <Link href="/demo" style={{ color: C.primary, textDecoration: "none", fontWeight: 500 }}>
                Essayez LIBERIA gratuitement avec la démo
              </Link>
              . Aucune inscription requise. Les données de démonstration ne sont pas sauvegardées.
            </p>
          </div>
          <div style={{ minWidth: 0 }}>
            <HeroMockupV3 />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockupV3() {
  return (
    <div
      style={{
        position: "relative",
        padding: 14,
        backgroundColor: C.cardBg,
        borderRadius: 22,
        boxShadow: SHADOW.card,
        border: `1px solid ${C.borderGhost}`,
      }}
    >
      <div
        style={{
          position: "relative",
          padding: "16px 18px",
          backgroundColor: C.navy,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: SHADOW.navy,
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 200,
            height: 200,
            background:
              "radial-gradient(circle, rgba(96, 165, 250, 0.20) 0%, rgba(96, 165, 250, 0) 65%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.78)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Analyse financière
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: "white", lineHeight: 1, fontFamily: FONT_DISPLAY, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
                84 / 100
              </p>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#5EEAD4", fontVariantNumeric: "tabular-nums" }}>+22 pts</span>
            </div>
            <p style={{ margin: "6px 0 0 0", fontSize: 11.5, fontWeight: 600, color: "white", fontFamily: FONT_DISPLAY, lineHeight: 1.2 }}>
              Profil discipliné en forte progression
            </p>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", maxWidth: 280 }}>
                <div style={{ width: "84%", height: "100%", backgroundColor: "white", borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>84%</span>
            </div>
          </div>
          <div
            aria-hidden
            style={{
              width: 60,
              height: 60,
              borderRadius: 999,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "white",
              fontSize: 22,
              fontWeight: 700,
              fontFamily: FONT_DISPLAY,
              letterSpacing: "-0.02em",
              boxShadow: "0 6px 18px -6px rgba(0, 0, 0, 0.30)",
            }}
          >
            SG
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <MockupKpi label="Revenus" value="8 500" suffix="CHF" trend="+4 %" tone={C.success} />
        <MockupKpi label="Dépenses" value="4 850" suffix="CHF" trend="-3 %" tone={C.coral} />
        <MockupKpi label="Opportunités" value="18" suffix="actives" trend="+3" tone={C.primary} />
      </div>
      <div style={{ marginTop: 10, padding: "10px 12px", backgroundColor: C.pageBg, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Plan d&apos;action
          </p>
          <span style={{ fontSize: 9.5, color: C.primary, fontWeight: 700 }}>3 actions cette semaine</span>
        </div>
        <MockupActionLine icon="check" color={C.success} bg={C.successBg} label="Optimisation abonnements" gain="+180 CHF/mois" />
        <MockupActionLine icon="bolt" color={C.amber} bg={C.amberBg} label="Réduction assurances" gain="+240 CHF/mois" />
        <MockupActionLine icon="trend" color={C.primary} bg={C.primaryBg} label="Placement épargne" gain="+310 CHF/mois" last />
      </div>
    </div>
  );
}

function MockupKpi({ label, value, suffix, trend, tone }: { label: string; value: string; suffix: string; trend: string; tone: string }) {
  return (
    <div style={{ padding: "10px 12px", backgroundColor: C.pageBg, borderRadius: 12 }}>
      <p style={{ margin: 0, fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ margin: "3px 0 0 0", fontSize: 14, fontWeight: 700, color: C.textDark, fontFamily: FONT_DISPLAY, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {value} <span style={{ fontSize: 9, color: C.textMuted, fontWeight: 500 }}>{suffix}</span>
      </p>
      <p style={{ margin: "3px 0 0 0", fontSize: 9, fontWeight: 700, color: tone, fontVariantNumeric: "tabular-nums" }}>{trend}</p>
    </div>
  );
}

function MockupActionLine({ icon, color, bg, label, gain, last }: { icon: "check" | "bolt" | "trend"; color: string; bg: string; label: string; gain: string; last?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    check: <polyline points="20 6 9 17 4 12" />,
    bolt: <polyline points="13 2 3 14 12 14 11 22 21 10 12 10" />,
    trend: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></>,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: last ? "none" : `1px solid ${C.borderGhost}` }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 999, backgroundColor: bg, flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {icons[icon]}
        </svg>
      </span>
      <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: C.textDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.success, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {gain}
      </span>
    </div>
  );
}

/* ════════════════════ 2. BÉNÉFICES ════════════════════ */

function BenefitsSection() {
  const items = [
    {
      title: "Comprendre votre situation",
      text: "Un score financier clair et une analyse détaillée de vos revenus, dépenses, épargne et investissements.",
      color: C.primary,
      bg: C.primaryBg,
      iconPath: "M3 3v18h18|M7 14l4-4 4 4 5-5",
    },
    {
      title: "Optimiser votre argent",
      text: "Liberia détecte vos opportunités concrètes : abonnements, assurances, épargne et fiscalité.",
      color: C.success,
      bg: C.successBg,
      iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z",
    },
    {
      title: "Atteindre vos objectifs",
      text: "De la maison à la liberté financière, suivez votre trajectoire et avancez avec un plan d'action vivant.",
      color: C.violet,
      bg: C.violetBg,
      iconPath: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22V15",
    },
  ];
  return (
    <SectionWrapper eyebrow="Ce que Liberia change" title="Trois bénéfices, un cockpit unique" maxWidth={760}>
      <div className="lv3-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {items.map((it) => (
          <div key={it.title} style={{ padding: "20px 22px", backgroundColor: C.cardBg, borderRadius: 16, boxShadow: SHADOW.card, border: `1px solid ${C.borderGhost}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, backgroundColor: it.bg }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <h3 style={{ margin: "14px 0 0 0", fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.textDark, letterSpacing: "-0.01em" }}>
              {it.title}
            </h3>
            <p style={{ margin: "6px 0 0 0", fontSize: 13.5, color: C.textMuted, lineHeight: 1.55 }}>
              {it.text}
            </p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ════════════════════ 3. FONCTIONNEMENT ════════════════════ */

function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Répondez à quelques questions",
      text: "5 minutes pour décrire votre situation, vos charges principales et votre objectif prioritaire.",
    },
    {
      n: "02",
      title: "Liberia génère votre analyse",
      text: "L'IA construit votre score financier, vos opportunités et votre plan d'action personnalisé.",
    },
    {
      n: "03",
      title: "Suivez votre plan d'action",
      text: "Chaque semaine, des actions concrètes priorisées. Vos objectifs avancent, votre score progresse.",
    },
  ];
  return (
    <SectionWrapper eyebrow="Comment ça marche" title="Trois étapes pour un copilote sur-mesure" tone="muted">
      <div className="lv3-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {steps.map((s) => (
          <div key={s.n} style={{ padding: "20px 22px", backgroundColor: C.cardBg, borderRadius: 16, boxShadow: SHADOW.card, border: `1px solid ${C.borderGhost}` }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: C.navy,
                color: "white",
                fontFamily: FONT_DISPLAY,
                fontSize: 15,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {s.n}
            </span>
            <h3 style={{ margin: "14px 0 0 0", fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: C.textDark, letterSpacing: "-0.01em" }}>
              {s.title}
            </h3>
            <p style={{ margin: "6px 0 0 0", fontSize: 13.5, color: C.textMuted, lineHeight: 1.55 }}>
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ════════════════════ 4. MODULES COCKPIT ════════════════════ */

function ModulesSection() {
  const modules = [
    {
      label: "Dashboard",
      desc: "Score financier, signaux clés et alertes au premier regard.",
      color: C.primary,
      bg: C.primaryBg,
      iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22 9 12 15 12 15 22",
    },
    {
      label: "Mon Analyse",
      desc: "Score 84/100, forces, axes et trajectoire à 3 ans.",
      color: C.success,
      bg: C.successBg,
      iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
    },
    {
      label: "Opportunités",
      desc: "Détection IA des gains concrets : abonnements, fiscalité, épargne.",
      color: C.violet,
      bg: C.violetBg,
      iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z",
    },
    {
      label: "Plan d'action",
      desc: "Étapes priorisées, vivantes, qui font avancer vos objectifs.",
      color: C.amber,
      bg: C.amberBg,
      iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    },
  ];
  return (
    <SectionWrapper eyebrow="Vos 4 modules clés" title="Un cockpit, une seule promesse : la clarté">
      <div className="lv3-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {modules.map((m) => (
          <div key={m.label} style={{ padding: "18px 18px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, border: `1px solid ${C.borderGhost}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, backgroundColor: m.bg }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={m.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {m.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <h3 style={{ margin: "12px 0 0 0", fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: C.textDark, letterSpacing: "-0.01em" }}>
              {m.label}
            </h3>
            <p style={{ margin: "5px 0 0 0", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ════════════════════ 5. PRICING ════════════════════ */

function PricingSection() {
  const plans = [
    {
      name: "Standard",
      price: "14.95",
      tagline: "Le cockpit financier essentiel.",
      features: [
        "Score financier et analyse complète",
        "Suivi revenus, dépenses, budget",
        "Coach IA hebdomadaire",
        "Plan d'action personnalisé",
        "Mobile + desktop",
      ],
      featured: false,
    },
    {
      name: "Premium",
      price: "19.95",
      tagline: "Toute la puissance du copilote IA Liberia.",
      features: [
        "Tout Standard inclus",
        "Détection avancée d'opportunités",
        "Trajectoire patrimoniale à 3 ans",
        "Résumé hebdomadaire IA personnalisé",
        "Support prioritaire",
      ],
      featured: true,
    },
  ];
  return (
    <SectionWrapper eyebrow="Tarifs simples" title="14 jours gratuits, puis l'offre qui vous correspond" tone="muted">
      <div className="lv3-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 880, margin: "0 auto" }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              position: "relative",
              padding: "26px 24px",
              backgroundColor: p.featured ? C.navy : C.cardBg,
              color: p.featured ? "white" : C.textDark,
              borderRadius: 18,
              boxShadow: p.featured ? SHADOW.navy : SHADOW.card,
              border: p.featured ? "none" : `1px solid ${C.borderGhost}`,
            }}
          >
            {p.featured && (
              <span
                style={{
                  position: "absolute",
                  top: -10,
                  right: 22,
                  padding: "3px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.navy,
                  backgroundColor: C.gold,
                  borderRadius: 999,
                  letterSpacing: "0.06em",
                }}
              >
                LE PLUS COMPLET
              </span>
            )}
            <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {p.name}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: p.featured ? "rgba(255,255,255,0.78)" : C.textMuted, lineHeight: 1.4 }}>
              {p.tagline}
            </p>
            <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {p.price}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>CHF / mois</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 11.5, color: p.featured ? "rgba(255,255,255,0.7)" : C.textLight }}>
              Après 14 jours d&apos;essai gratuit · carte requise à l&apos;inscription
            </p>
            <ul style={{ margin: "18px 0 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {p.features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.5, color: p.featured ? "rgba(255,255,255,0.92)" : C.textDark }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.featured ? "#5EEAD4" : C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={ROUTES.register}
              style={{
                marginTop: 22,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 18px",
                width: "100%",
                backgroundColor: p.featured ? "white" : C.navy,
                color: p.featured ? C.navy : "white",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Démarrer l&apos;essai gratuit
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: C.textMuted }}>
        Pas de plan gratuit · 14 jours d&apos;essai sur les deux offres · Annulation possible avant la fin de l&apos;essai
      </p>
    </SectionWrapper>
  );
}

/* ════════════════════ 6. SÉCURITÉ ════════════════════ */

function SecuritySection() {
  const items = [
    {
      title: "Données chiffrées",
      text: "AES-256 au repos et TLS en transit. Vos données restent privées et protégées en permanence.",
      color: C.success,
      bg: C.successBg,
      iconPath: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z|M7 11V7a5 5 0 0 1 10 0v4",
    },
    {
      title: "Pas de connexion bancaire obligatoire",
      text: "Liberia fonctionne sans agréger vos comptes bancaires. Vous gardez le choix de partager ce que vous voulez.",
      color: C.primary,
      bg: C.primaryBg,
      iconPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    },
    {
      title: "Contrôle de vos données",
      text: "Export, suppression, gestion du consentement. Vos données restent les vôtres, à tout moment.",
      color: C.violet,
      bg: C.violetBg,
      iconPath: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3",
    },
    {
      title: "IA responsable",
      text: "Recommandations explicables, pas de promesse de rendement. Liberia ne remplace pas un conseiller agréé.",
      color: C.amber,
      bg: C.amberBg,
      iconPath: "M9 11 12 14 22 4|M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    },
  ];
  return (
    <SectionWrapper id="security" eyebrow="Sécurité et confidentialité" title="Vos données restent les vôtres">
      <div className="lv3-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {items.map((it) => (
          <div key={it.title} style={{ padding: "18px 18px", backgroundColor: C.cardBg, borderRadius: 14, boxShadow: SHADOW.card, border: `1px solid ${C.borderGhost}` }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, backgroundColor: it.bg }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={it.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {it.iconPath.split("|").map((d, i) => <path key={i} d={d} />)}
              </svg>
            </span>
            <h3 style={{ margin: "12px 0 0 0", fontFamily: FONT_DISPLAY, fontSize: 14.5, fontWeight: 700, color: C.textDark, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
              {it.title}
            </h3>
            <p style={{ margin: "6px 0 0 0", fontSize: 12.5, color: C.textMuted, lineHeight: 1.55 }}>
              {it.text}
            </p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ════════════════════ 7. FAQ ════════════════════ */

function FaqSection() {
  const faqs = [
    {
      q: "Liberia remplace-t-il une banque ?",
      a: "Non. Liberia est un copilote financier IA qui analyse votre situation et vous propose des actions concrètes. Vos comptes restent dans vos banques.",
    },
    {
      q: "Faut-il connecter son compte bancaire ?",
      a: "Non. Vous pouvez utiliser Liberia entièrement sans agrégation bancaire — vous renseignez vous-même les informations clés. Une connexion facultative pourra être proposée plus tard.",
    },
    {
      q: "Puis-je annuler avant la fin de l'essai ?",
      a: "Oui. L'essai dure 14 jours et une carte bancaire est requise à l'inscription pour le démarrer. Aucun prélèvement pendant ces 14 jours. Vous pouvez annuler à tout moment avant la fin de l'essai pour ne pas être facturé.",
    },
    {
      q: "Puis-je essayer Liberia sans compte ?",
      a: "Oui. Le mode démo est accessible sans inscription et sans carte. Les données saisies en démo ne sont pas sauvegardées — elles disparaissent quand vous quittez. Pour un suivi réel et persistant, il faut créer un compte (essai gratuit 14 jours, carte requise).",
    },
    {
      q: "Quelle différence entre Standard et Premium ?",
      a: "Standard couvre l'essentiel (score, suivi, plan, coach hebdo). Premium ajoute la détection avancée d'opportunités, la trajectoire patrimoniale à 3 ans et un support prioritaire.",
    },
    {
      q: "Mes données sont-elles sécurisées ?",
      a: "Vos données sont chiffrées au repos (AES-256) et en transit (TLS). Vous pouvez exporter ou supprimer vos données à tout moment depuis vos paramètres.",
    },
  ];
  return (
    <SectionWrapper id="faq" eyebrow="Vos questions" title="Réponses essentielles" maxWidth={720} tone="muted">
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {faqs.map((f) => (
          <details
            key={f.q}
            style={{
              padding: "18px 20px",
              backgroundColor: C.cardBg,
              borderRadius: 14,
              boxShadow: SHADOW.kpi,
              border: `1px solid ${C.borderGhost}`,
            }}
          >
            <summary
              style={{
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                cursor: "pointer",
                fontFamily: FONT_DISPLAY,
                fontSize: 15,
                fontWeight: 600,
                color: C.textDark,
                letterSpacing: "-0.005em",
              }}
            >
              {f.q}
              <span aria-hidden style={{ color: C.primary, fontSize: 18, fontWeight: 400, flexShrink: 0, transition: "transform 0.2s" }}>
                +
              </span>
            </summary>
            <p style={{ margin: "10px 0 0 0", fontSize: 13.5, color: C.textMuted, lineHeight: 1.55 }}>
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}

/* ════════════════════ 8. CTA FINAL ════════════════════ */

function FinalCtaSection() {
  return (
    <section style={{ padding: "72px 24px 96px" }}>
      <div className="container" style={{ position: "relative" }}>
        <div
          style={{
            position: "relative",
            padding: "44px 36px",
            backgroundColor: C.navy,
            borderRadius: 22,
            boxShadow: SHADOW.navy,
            overflow: "hidden",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -60,
              top: -60,
              width: 280,
              height: 280,
              background:
                "radial-gradient(circle, rgba(96, 165, 250, 0.20) 0%, rgba(96, 165, 250, 0) 65%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: -60,
              bottom: -60,
              width: 240,
              height: 240,
              background:
                "radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0) 65%)",
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              position: "relative",
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              maxWidth: 640,
              marginLeft: "auto",
              marginRight: "auto",
            }}
            className="lv3-h2"
          >
            Commencez votre <span style={{ color: "#FCD34D" }}>analyse financière</span> aujourd&apos;hui.
          </h2>
          <p style={{ position: "relative", margin: "12px auto 0", fontSize: 14, color: "rgba(255,255,255,0.78)", maxWidth: 540, lineHeight: 1.55 }}>
            Activez votre cockpit Liberia en moins de 5 minutes. 14 jours gratuits, sans engagement.
          </p>
          <div style={{ position: "relative", marginTop: 22, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
            <Link
              href={ROUTES.register}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "13px 22px",
                backgroundColor: "white",
                color: C.navy,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Démarrer mon essai gratuit
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════ HELPER WRAPPER ════════════════════ */

function SectionWrapper({
  id,
  eyebrow,
  title,
  maxWidth,
  tone = "default",
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  maxWidth?: number;
  tone?: "default" | "muted";
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ padding: "72px 24px", backgroundColor: tone === "muted" ? "#F4F6FB" : C.pageBg }}>
      <div className="container" style={{ position: "relative" }}>
        <div style={{ textAlign: "center", maxWidth: maxWidth ?? 720, margin: "0 auto 36px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            {eyebrow}
          </p>
          <h2
            style={{
              margin: "10px 0 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: C.textDark,
            }}
            className="lv3-h2"
          >
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ════════════════════ RESPONSIVE STYLES ════════════════════ */

export function LandingV3Styles() {
  return (
    <style>{`
      @media (max-width: 1023px) {
        .lv3-hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
        .lv3-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .lv3-h1 { font-size: 38px !important; }
        .lv3-h2 { font-size: 26px !important; }
      }
      @media (max-width: 639px) {
        .lv3-grid-3, .lv3-grid-2 { grid-template-columns: 1fr !important; }
        .lv3-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .lv3-h1 { font-size: 30px !important; }
        .lv3-h2 { font-size: 22px !important; }
      }
    `}</style>
  );
}

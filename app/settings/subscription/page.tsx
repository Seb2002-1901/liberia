/**
 * Phase 5.0 — /settings/subscription
 *
 * Page Abonnement — harmonisée avec le cockpit visuel V3 :
 *  - Sidebar 280 px (PRINCIPAL / FINANCES / CROISSANCE / PLUS)
 *  - Topbar 68 px (Bonjour {prénom}, notif, avatar → /profile)
 *  - Mon analyse visible dans le menu PRINCIPAL
 *  - Paramètres marqué actif (sous-page conceptuelle)
 *
 * Toute la logique Stripe est strictement conservée :
 *  - CheckoutFeedback (toast checkout success/cancel)
 *  - PortalButton (Customer Portal)
 *  - PricingPlans (plans + boutons buy/upgrade)
 *  - 4 bannières d'état (trial / active / past_due / lapsed)
 *  - Status chip + timeline historique
 *
 * La page vit hors du groupe (app)/ pour bypasser l'ancien
 * AppShell — comme les pages /design-match/*-v3 — et fournit son
 * propre shell V3 inline. L'auth + redirect onboarding (faits
 * autrefois par (app)/layout.tsx) sont reproduits ici.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { CheckoutFeedback } from "@/components/billing/checkout-feedback";
import { PortalButton } from "@/components/billing/portal-button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { formatDate } from "@/lib/utils";
import { getFinanceData } from "@/lib/services/finance";
import { inferBillingState } from "@/lib/billing/state";
import { ROUTES } from "@/lib/constants";
import { V3TopbarMenu } from "@/components/layout/v3-topbar-menu";

// Auth via cookies Supabase — pas de prerender possible. Cohérent
// avec les autres pages V3 et l'ex-(app)/layout.tsx parent.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.subscription.metadata");
  return { title: t("title") };
}

/* ═══════════════ TOKENS V3 ═══════════════ */
// Alignés à l'identique sur parametres-v3 / profil-v3.

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
  gold: "#FBBF24",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  kpi: "0 1px 2px rgb(15 23 42 / 0.02), 0 6px 16px -8px rgb(15 23 42 / 0.04)",
};

/* ═══════════════ DEFAULT EXPORT ═══════════════ */

export default async function SubscriptionPage() {
  // Reproduit la garde de (app)/layout.tsx : un user non onboardé
  // doit terminer l'onboarding avant d'accéder à la page Abonnement.
  // (getFinanceData() gère le cas démo en injectant onboarding_completed=true)
  const data = await getFinanceData();
  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const t = await getTranslations("app.subscription");
  const sub = data.subscription;
  const billing = inferBillingState(sub);
  const timeline = buildAccountTimeline(sub, t);

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <>
      {/* Responsive global identique aux autres pages V3. */}
      <style>{`
        @media (max-width: 1199px) {
          [data-sub-main] { padding: 0 20px 12px 20px !important; gap: 14px !important; }
        }
        @media (max-width: 999px) {
          [data-sub-sidebar] { display: none !important; }
          [data-sub-content] { margin-left: 0 !important; }
          [data-sub-main] { padding: 0 16px 16px 16px !important; }
          [data-sub-topbar] { padding: 0 16px !important; }
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
        <div data-sub-sidebar>
          <Sidebar />
        </div>
        <div
          data-sub-content
          style={{
            marginLeft: 280,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Topbar firstName={firstName} fullName={fullName} />
          <main
            data-sub-main
            style={{
              padding: "0 24px 24px 24px",
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <div className="space-y-6">
              <Suspense fallback={null}>
                <CheckoutFeedback />
              </Suspense>
              <PageHeader
                eyebrow={t("header.eyebrow")}
                title={t("header.title")}
                description={t("header.description")}
              />

              {/* Billing state banner — Sprint S1 refonte V3 navy */}
              {billing.kind === "trial" && (
                <V3Banner
                  tone="primary"
                  icon={<Clock width={20} height={20} />}
                  title={
                    billing.daysLeft === null
                      ? t("banners.trialTitle")
                      : t("banners.trialTitleWithDays", { days: billing.daysLeft })
                  }
                  body={`${
                    billing.trialEndsAt
                      ? t("banners.trialBillingFrom", { date: formatDate(billing.trialEndsAt) })
                      : t("banners.trialBillingSoon")
                  }${
                    billing.cancelAtPeriodEnd
                      ? t("banners.trialCancelled")
                      : t("banners.trialCanCancel")
                  }`}
                  action={sub.has_customer ? <PortalButton /> : null}
                />
              )}

              {billing.kind === "active" && (
                <V3Banner
                  tone="success"
                  icon={<CheckCircle2 width={20} height={20} />}
                  title={
                    billing.cancelAtPeriodEnd
                      ? t("banners.activeTitleCancelling")
                      : t("banners.activeTitle")
                  }
                  body={
                    billing.cancelAtPeriodEnd
                      ? billing.currentPeriodEnd
                        ? t("banners.activeKeptUntil", { date: formatDate(billing.currentPeriodEnd) })
                        : t("banners.activeKeptUntilFallback")
                      : billing.currentPeriodEnd
                        ? t("banners.activeRenews", { date: formatDate(billing.currentPeriodEnd) })
                        : t("banners.activeManaged")
                  }
                  action={sub.has_customer ? <PortalButton /> : null}
                />
              )}

              {billing.kind === "past_due" && (
                <V3Banner
                  tone="warning"
                  icon={<AlertTriangle width={20} height={20} />}
                  title={t("banners.pastDueTitle")}
                  body={t("banners.pastDueBody")}
                  action={sub.has_customer ? <PortalButton /> : null}
                />
              )}

              {billing.kind === "lapsed" && (
                <V3Banner
                  tone="primary"
                  icon={<Sparkles width={20} height={20} />}
                  title={
                    sub.trial_used
                      ? t("banners.lapsedPausedTitle")
                      : t("banners.lapsedNewTitle")
                  }
                  body={
                    sub.trial_used
                      ? t("banners.lapsedPausedBody")
                      : t("banners.lapsedNewBody", { days: TRIAL_DAYS })
                  }
                  action={sub.has_customer ? <PortalButton /> : null}
                />
              )}

              {/* Pourquoi Premium — section conversion S1-06 */}
              <PremiumValueSection />

              {/* Status chip V3 */}
              <V3StatusCard
                statusLabel={
                  sub.status === "trialing"
                    ? t("status.trialing")
                    : sub.status === "active"
                      ? t("status.active")
                      : sub.status === "past_due" || sub.status === "unpaid"
                        ? t("status.pastDue")
                        : sub.status === "paused"
                          ? t("status.paused")
                          : sub.status === "canceled"
                            ? t("status.canceled")
                            : sub.status === "incomplete" ||
                                sub.status === "incomplete_expired"
                              ? t("status.incomplete")
                              : t("status.none")
                }
                statusKind={
                  sub.status === "trialing"
                    ? "trial"
                    : sub.status === "active"
                      ? "active"
                      : sub.status === "past_due" || sub.status === "unpaid"
                        ? "warning"
                        : "neutral"
                }
                title={t("status.label")}
                note={
                  sub.trial_used && billing.kind === "lapsed"
                    ? t("status.trialUsedNote")
                    : !sub.status
                      ? t("status.freshNote", { days: TRIAL_DAYS })
                      : t("status.manageNote")
                }
              />

              {timeline.length > 0 && (
                <V3TimelineCard
                  title={t("timeline.title")}
                  events={timeline}
                />
              )}

              <PricingPlans
                variant="in-app"
                isAuthenticated
                currentPriceId={sub.price_id}
              />

              <p className="text-xs text-muted-foreground">{t("footnote")}</p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * Builds a short, human-readable list of key dates for the user's
 * subscription. Returns [] when nothing meaningful exists (e.g. brand-
 * new account before checkout) so the card is hidden rather than
 * empty.
 */
function buildAccountTimeline(
  sub: Awaited<ReturnType<typeof getFinanceData>>["subscription"],
  t: Awaited<ReturnType<typeof getTranslations<"app.subscription">>>,
): Array<{ label: string; detail?: string }> {
  const events: Array<{ label: string; detail?: string }> = [];

  if (sub.trial_used) {
    events.push({
      label: t("timeline.trialUsedLabel"),
      detail: t("timeline.trialUsedDetail"),
    });
  }

  if (sub.trial_ends_at) {
    const label =
      sub.status === "trialing"
        ? t("timeline.trialEndsLabel", { date: formatDate(sub.trial_ends_at) })
        : t("timeline.trialEndedLabel", { date: formatDate(sub.trial_ends_at) });
    events.push({ label });
  }

  if (sub.current_period_end && sub.status === "active") {
    events.push({
      label: sub.cancel_at_period_end
        ? t("timeline.accessKeptLabel", { date: formatDate(sub.current_period_end) })
        : t("timeline.renewsLabel", { date: formatDate(sub.current_period_end) }),
    });
  }

  if (sub.cancel_at_period_end && sub.status !== "active") {
    events.push({
      label: t("timeline.cancelScheduledLabel"),
      detail: t("timeline.cancelScheduledDetail"),
    });
  }

  if (sub.has_customer) {
    events.push({
      label: t("timeline.paymentMethodLabel"),
      detail: t("timeline.paymentMethodDetail"),
    });
  }

  return events;
}

/* ═══════════════ SIDEBAR V3 (Paramètres actif) ═══════════════ */
// Aligné à l'identique sur parametres-v3 / profil-v3 / autres V3.
// Paramètres marqué actif car /settings/subscription est conceptuel-
// lement une sous-page des Paramètres (carte Premium qui pointe ici).

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
          <NavItem label="Opportunités" href="/design-match/opportunites-v3" iconPath="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88z" />
        </NavSection>
        <NavSection title="PLUS">
          <NavItem label="Paramètres" href="/design-match/parametres-v3" iconPath="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" active />
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

/* ═══════════════ TOPBAR V3 ═══════════════ */

function Topbar({
  firstName,
  fullName,
}: {
  firstName: string | null;
  fullName: string | null;
}) {
  const displayName = firstName ?? "";
  return (
    <header
      data-sub-topbar
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
          Gérez votre abonnement LIBERIA Premium.
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <V3TopbarMenu fullName={fullName} />
      </div>
    </header>
  );
}

/* ═══════════════ S1 — V3 inline subscription atoms ═══════════════ */

function V3Banner({
  tone,
  icon,
  title,
  body,
  action,
}: {
  tone: "primary" | "success" | "warning";
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode | null;
}) {
  const tones = {
    primary: { bg: "#EDF2FD", border: "rgba(37, 99, 235, 0.18)", iconColor: "#2563EB" },
    success: { bg: "#ECFDF5", border: "rgba(16, 163, 127, 0.22)", iconColor: "#10A37F" },
    warning: { bg: "#FEF3C7", border: "rgba(245, 158, 11, 0.28)", iconColor: "#F59E0B" },
  } as const;
  const tk = tones[tone];
  return (
    <section
      style={{
        padding: "18px 20px",
        backgroundColor: tk.bg,
        border: `1px solid ${tk.border}`,
        borderRadius: 14,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 240 }}>
        <span style={{ color: tk.iconColor, flexShrink: 0, marginTop: 2 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A", lineHeight: 1.4 }}>
            {title}
          </p>
          <p style={{ margin: "5px 0 0 0", fontSize: 13, color: "#64748B", lineHeight: 1.55 }}>
            {body}
          </p>
        </div>
      </div>
      {action}
    </section>
  );
}

function V3StatusCard({
  title,
  statusLabel,
  statusKind,
  note,
}: {
  title: string;
  statusLabel: string;
  statusKind: "trial" | "active" | "warning" | "neutral";
  note: string;
}) {
  const tones = {
    trial: { bg: "#EDF2FD", color: "#2563EB" },
    active: { bg: "#10A37F", color: "white" },
    warning: { bg: "#FEF3C7", color: "#B45309" },
    neutral: { bg: "#F1F5F9", color: "#64748B" },
  } as const;
  const tk = tones[statusKind];
  return (
    <section
      style={{
        padding: "18px 20px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E9F0",
        borderRadius: 14,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          color: "#64748B",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h3>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 12px",
            borderRadius: 999,
            backgroundColor: tk.bg,
            color: tk.color,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {statusLabel}
        </span>
        <p style={{ margin: 0, fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{note}</p>
      </div>
    </section>
  );
}

function V3TimelineCard({
  title,
  events,
}: {
  title: string;
  events: Array<{ label: string; detail?: string | null }>;
}) {
  return (
    <section
      style={{
        padding: "20px 22px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E9F0",
        borderRadius: 14,
      }}
    >
      <h3
        style={{
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          color: "#0F172A",
          fontFamily: "Outfit, Inter, system-ui",
        }}
      >
        <CalendarClock width={15} height={15} style={{ color: "#2563EB" }} />
        {title}
      </h3>
      <ul style={{ marginTop: 14, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((event, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 14px",
              backgroundColor: "#F9FAFD",
              borderRadius: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                marginTop: 6,
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: "#2563EB",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0F172A", lineHeight: 1.4 }}>
                {event.label}
              </p>
              {event.detail && (
                <p style={{ margin: "3px 0 0 0", fontSize: 11.5, color: "#64748B", lineHeight: 1.5 }}>
                  {event.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ═══════════════ S1-06 — Pourquoi LIBERIA Premium ═══════════════ */

function PremiumValueSection() {
  const items = [
    {
      icon: "🧭",
      title: "Coach IA illimité",
      free: "5 conversations / mois",
      premium: "Conversations illimitées + mémoire enrichie",
    },
    {
      icon: "📊",
      title: "Analyse FHS détaillée",
      free: "Score global + tendance hebdomadaire",
      premium: "6 axes détaillés + historique 12 mois + recommandations conditionnelles",
    },
    {
      icon: "🎯",
      title: "Plan d'action personnalisé",
      free: "3 étapes de démarrage",
      premium: "Plan complet généré par l'IA + suivi des étapes + impact estimé",
    },
    {
      icon: "💡",
      title: "Opportunités d'optimisation",
      free: "1 opportunité visible",
      premium: "Toutes les opportunités du moteur + projection annuelle",
    },
    {
      icon: "🔐",
      title: "Mémoire IA personnelle",
      free: "Activable, lecture seule",
      premium: "Ajout / édition / archivage des entrées clés",
    },
  ];
  return (
    <section
      style={{
        padding: "26px 24px",
        backgroundColor: "#011E5F",
        backgroundImage:
          "radial-gradient(circle at 20% 0%, rgba(37, 99, 235, 0.35) 0%, transparent 55%), radial-gradient(circle at 80% 100%, rgba(2, 31, 96, 0.6) 0%, transparent 50%)",
        color: "white",
        borderRadius: 18,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          color: "#FBBF24",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Pourquoi LIBERIA Premium
      </p>
      <h2
        style={{
          margin: "12px 0 6px 0",
          fontFamily: "Outfit, Inter, system-ui",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        Ce que tu débloques en passant Premium
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.55, maxWidth: 560 }}>
        Le coach IA, l'analyse, les opportunités et la mémoire personnelle deviennent illimités et personnalisés en
        continu. Annulable à tout moment.
      </p>
      <ul
        style={{
          marginTop: 18,
          listStyle: "none",
          padding: 0,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
        }}
      >
        {items.map((it) => (
          <li
            key={it.title}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "14px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }} aria-hidden>
              {it.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "white", lineHeight: 1.3 }}>
                {it.title}
              </p>
              <div
                style={{
                  marginTop: 6,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  fontSize: 11.5,
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.55)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      fontSize: 9.5,
                    }}
                  >
                    Gratuit
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.82)" }}>{it.free}</span>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#FBBF24",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      fontSize: 9.5,
                    }}
                  >
                    Premium
                  </span>
                  <span style={{ color: "white", fontWeight: 500 }}>{it.premium}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

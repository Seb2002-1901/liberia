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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutFeedback } from "@/components/billing/checkout-feedback";
import { PortalButton } from "@/components/billing/portal-button";
import { PricingPlans } from "@/components/billing/pricing-plans";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import { formatDate } from "@/lib/utils";
import { getFinanceData } from "@/lib/services/finance";
import { inferBillingState } from "@/lib/billing/state";
import { ROUTES } from "@/lib/constants";

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

              {/* Billing state banner */}
              {billing.kind === "trial" && (
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-5 w-5 text-[hsl(var(--gold))]" />
                      <div>
                        <p className="font-medium">
                          {billing.daysLeft === null
                            ? t("banners.trialTitle")
                            : t("banners.trialTitleWithDays", { days: billing.daysLeft })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {billing.trialEndsAt
                            ? t("banners.trialBillingFrom", { date: formatDate(billing.trialEndsAt) })
                            : t("banners.trialBillingSoon")}
                          {billing.cancelAtPeriodEnd
                            ? t("banners.trialCancelled")
                            : t("banners.trialCanCancel")}
                        </p>
                      </div>
                    </div>
                    {sub.has_customer && <PortalButton />}
                  </CardContent>
                </Card>
              )}

              {billing.kind === "active" && (
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[hsl(var(--success))]" />
                      <div>
                        <p className="font-medium">
                          {billing.cancelAtPeriodEnd
                            ? t("banners.activeTitleCancelling")
                            : t("banners.activeTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {billing.cancelAtPeriodEnd
                            ? billing.currentPeriodEnd
                              ? t("banners.activeKeptUntil", { date: formatDate(billing.currentPeriodEnd) })
                              : t("banners.activeKeptUntilFallback")
                            : billing.currentPeriodEnd
                              ? t("banners.activeRenews", { date: formatDate(billing.currentPeriodEnd) })
                              : t("banners.activeManaged")}
                        </p>
                      </div>
                    </div>
                    {sub.has_customer && <PortalButton />}
                  </CardContent>
                </Card>
              )}

              {billing.kind === "past_due" && (
                <Card className="border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.05)]">
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-[hsl(var(--warning))]" />
                      <div>
                        <p className="font-medium text-[hsl(var(--warning))]">
                          {t("banners.pastDueTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">{t("banners.pastDueBody")}</p>
                      </div>
                    </div>
                    {sub.has_customer && <PortalButton />}
                  </CardContent>
                </Card>
              )}

              {billing.kind === "lapsed" && (
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-5">
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 h-5 w-5 text-[hsl(var(--gold))]" />
                      <div>
                        <p className="font-medium">
                          {sub.trial_used
                            ? t("banners.lapsedPausedTitle")
                            : t("banners.lapsedNewTitle")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sub.trial_used
                            ? t("banners.lapsedPausedBody")
                            : t("banners.lapsedNewBody", { days: TRIAL_DAYS })}
                        </p>
                      </div>
                    </div>
                    {sub.has_customer && <PortalButton />}
                  </CardContent>
                </Card>
              )}

              {/* Status chip */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("status.label")}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={
                      sub.status === "trialing"
                        ? "gold"
                        : sub.status === "active"
                          ? "success"
                          : sub.status === "past_due" || sub.status === "unpaid"
                            ? "warning"
                            : "secondary"
                    }
                  >
                    {sub.status === "trialing"
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
                                : t("status.none")}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {sub.trial_used && billing.kind === "lapsed"
                      ? t("status.trialUsedNote")
                      : !sub.status
                        ? t("status.freshNote", { days: TRIAL_DAYS })
                        : t("status.manageNote")}
                  </p>
                </CardContent>
              </Card>

              {timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="h-4 w-4 text-[hsl(var(--gold))]" />
                      {t("timeline.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {timeline.map((event, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                        >
                          <span
                            aria-hidden
                            className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--gold))]"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">
                              {event.label}
                            </p>
                            {event.detail && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {event.detail}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
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
          <NavItem label="Investissements" href="/design-match/investissements-v3" iconPath="M22 12L18 7l-5 5-4-3-7 7|M22 7V12 17H22Z" />
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
  const displayName = firstName ?? "explorer";
  const pillName = fullName ?? "Mon profil";
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

import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.subscription.metadata");
  return { title: t("title") };
}

export default async function SubscriptionPage() {
  const t = await getTranslations("app.subscription");
  const data = await getFinanceData();
  const sub = data.subscription;
  const billing = inferBillingState(sub);
  const timeline = buildAccountTimeline(sub, t);

  return (
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

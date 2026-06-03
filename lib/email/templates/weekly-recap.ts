import { createEmailTranslator } from "@/lib/email/i18n";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  type EmailRender,
  escape,
  heroCard,
  metricsTable,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

export type WeeklyEmailInput = {
  firstName: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  savingsRate: number;
  stabilityScore: number;
  planStepsDoneThisWeek: number;
  planStepsRemaining: number;
  unsubscribeUrl: string;
  appUrl: string;
  locale?: string | null;
  currency?: string;
};

export async function renderWeeklyEmail(
  input: WeeklyEmailInput,
): Promise<EmailRender> {
  const {
    firstName,
    monthlyIncome,
    monthlyExpenses,
    cashflow,
    savingsRate,
    stabilityScore,
    planStepsDoneThisWeek,
    planStepsRemaining,
    unsubscribeUrl,
    appUrl,
    locale,
    currency = "CHF",
  } = input;

  const { t, intlLocale } = await createEmailTranslator(locale);

  const subject = t("weekly.subject", { score: stabilityScore });
  const toneText =
    cashflow >= 0 ? t("weekly.tonePositive") : t("weekly.toneNegative");

  const planBlock =
    planStepsRemaining > 0
      ? noticeCard({
          eyebrow: t("weekly.planEyebrow"),
          body:
            planStepsDoneThisWeek > 0
              ? t("weekly.planBodyDoneAndRemaining", {
                  done: planStepsDoneThisWeek,
                  doneNoun:
                    planStepsDoneThisWeek > 1
                      ? t("weekly.stepPlural")
                      : t("weekly.stepSingular"),
                  remaining: planStepsRemaining,
                  remainingNoun:
                    planStepsRemaining > 1
                      ? t("weekly.stepPlural")
                      : t("weekly.stepSingular"),
                })
              : t("weekly.planBodyRemaining", {
                  remaining: planStepsRemaining,
                  remainingNoun:
                    planStepsRemaining > 1
                      ? t("weekly.stepPlural")
                      : t("weekly.stepSingular"),
                }),
        })
      : "";

  const fmt = (n: number) => formatCurrency(n, currency, intlLocale);

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: t("weekly.heroBody", { score: stabilityScore, tone: escape(toneText) }),
    }) +
    metricsTable([
      { label: t("weekly.metrics.income"), value: fmt(monthlyIncome) },
      { label: t("weekly.metrics.expenses"), value: fmt(monthlyExpenses) },
      {
        label: t("weekly.metrics.leftover"),
        value: fmt(cashflow),
        tone: cashflow >= 0 ? "neutral" : "danger",
      },
      {
        label: t("weekly.metrics.savingsRate"),
        value: formatPercent(savingsRate, intlLocale),
      },
    ]) +
    planBlock +
    primaryButton({ label: t("weekly.cta"), href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: t("weekly.eyebrow"),
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: t("weekly.footer"),
  });

  const text = `${t("common.greeting", { firstName })}

${t("weekly.metrics.income")} : ${fmt(monthlyIncome)}
${t("weekly.metrics.expenses")} : ${fmt(monthlyExpenses)}
${t("weekly.metrics.leftover")} : ${fmt(cashflow)}
${t("weekly.metrics.savingsRate")} : ${formatPercent(savingsRate, intlLocale)}

${t("weekly.cta")} : ${appUrl}/dashboard

${t("common.disclaimer")}
${t("common.unsubscribe")} : ${unsubscribeUrl}`;

  return { subject, html, text };
}

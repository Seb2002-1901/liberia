import { createEmailTranslator } from "@/lib/email/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  type EmailRender,
  escape,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

export type EncouragementEmailInput = {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
  /** Short headline computed server-side. Stays in the caller's locale. */
  headline: string;
  metric?: { label: string; value: number; currency?: string };
  locale?: string | null;
};

export async function renderEncouragementEmail(
  input: EncouragementEmailInput,
): Promise<EmailRender> {
  const { firstName, appUrl, unsubscribeUrl, headline, metric, locale } = input;
  const { t, intlLocale } = await createEmailTranslator(locale);

  const subject = t("encouragement.subject");

  const metricBlock = metric
    ? noticeCard({
        eyebrow: metric.label,
        body: `<strong style="font-size:18px;">${escape(formatCurrency(metric.value, metric.currency, intlLocale))}</strong>`,
      })
    : "";

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: `${escape(headline)} ${t("encouragement.heroBodyTail")}`,
    }) +
    metricBlock +
    primaryButton({ label: t("encouragement.cta"), href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: t("encouragement.eyebrow"),
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: t("encouragement.footer"),
  });

  const text = `${t("common.greeting", { firstName })}

${headline} ${t("encouragement.heroBodyTail")}${metric ? `\n\n${metric.label} : ${formatCurrency(metric.value, metric.currency, intlLocale)}` : ""}

${t("common.openApp")} : ${appUrl}/dashboard

${t("common.unsubscribe")} : ${unsubscribeUrl}`;

  return { subject, html, text };
}

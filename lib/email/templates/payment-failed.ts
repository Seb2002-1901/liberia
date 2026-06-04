import { createEmailTranslator, getLayoutLocaleStrings } from "@/lib/email/i18n";
import {
  EMAIL_THEME,
  type EmailRender,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

export type PaymentFailedEmailInput = {
  firstName: string;
  appUrl: string;
  portalUrl?: string;
  locale?: string | null;
};

export async function renderPaymentFailedEmail(
  input: PaymentFailedEmailInput,
): Promise<EmailRender> {
  const { firstName, appUrl, portalUrl, locale } = input;
  const { t, locale: resolvedLocale } = await createEmailTranslator(locale);
  const layoutLocale = getLayoutLocaleStrings(
    t,
    resolvedLocale,
    `${appUrl}/settings`,
  );

  const subject = t("paymentFailed.subject");

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: t("paymentFailed.heroBody"),
    }) +
    noticeCard({
      eyebrow: t("paymentFailed.noticeEyebrow"),
      body: t("paymentFailed.noticeBody"),
      toneColor: EMAIL_THEME.MUTED,
    }) +
    primaryButton({
      label: t("paymentFailed.cta"),
      href: portalUrl ?? `${appUrl}/settings/subscription`,
    });

  const html = renderLayout({
    subject,
    eyebrow: t("paymentFailed.eyebrow"),
    inner,
    appUrl,
    locale: layoutLocale,
    footerDisclaimer: t("paymentFailed.footer"),
  });

  const text = `${t("common.greeting", { firstName })}

${t("paymentFailed.heroBody")}

${t("paymentFailed.noticeBody")}

${t("paymentFailed.cta")} : ${portalUrl ?? `${appUrl}/settings/subscription`}`;

  return { subject, html, text };
}

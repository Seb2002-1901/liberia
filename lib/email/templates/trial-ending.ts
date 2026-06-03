import { createEmailTranslator } from "@/lib/email/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  type EmailRender,
  escape,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
  secondaryButton,
} from "@/lib/email/layout";

export type TrialEndingEmailInput = {
  firstName: string;
  appUrl: string;
  daysLeft: 1 | 3;
  trialEndsAt: string;
  monthlyAmount: number;
  currency: string;
  portalUrl?: string;
  locale?: string | null;
};

export async function renderTrialEndingEmail(
  input: TrialEndingEmailInput,
): Promise<EmailRender> {
  const {
    firstName,
    appUrl,
    daysLeft,
    trialEndsAt,
    monthlyAmount,
    currency,
    portalUrl,
    locale,
  } = input;

  const { t, intlLocale } = await createEmailTranslator(locale);

  const subject =
    daysLeft === 1 ? t("trialEnding.subject1") : t("trialEnding.subject3");

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(trialEndsAt));
    } catch {
      return trialEndsAt;
    }
  })();

  const amountFmt = formatCurrency(monthlyAmount, currency, intlLocale);

  const heroKey = daysLeft === 1 ? "trialEnding.hero1" : "trialEnding.hero3";
  const textKey = daysLeft === 1 ? "trialEnding.text1" : "trialEnding.text3";

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: t(heroKey, {
        date: escape(formattedDate),
        amount: escape(amountFmt),
      }),
    }) +
    noticeCard({
      eyebrow: t("trialEnding.noticeEyebrow"),
      body: t("trialEnding.noticeBody"),
    }) +
    primaryButton({
      label: t("trialEnding.ctaManage"),
      href: portalUrl ?? `${appUrl}/settings/subscription`,
    }) +
    secondaryButton({
      label: t("trialEnding.ctaApp"),
      href: `${appUrl}/dashboard`,
    });

  const html = renderLayout({
    subject,
    eyebrow: t("trialEnding.eyebrow"),
    inner,
    appUrl,
    footerDisclaimer: t("trialEnding.footer"),
  });

  const text = `${t("common.greeting", { firstName })}

${t(textKey, { date: formattedDate, amount: amountFmt })}

${t("trialEnding.noticeBody")}

${t("trialEnding.ctaManage")} : ${portalUrl ?? `${appUrl}/settings/subscription`}
${t("trialEnding.ctaApp")} : ${appUrl}/dashboard`;

  return { subject, html, text };
}

import { createEmailTranslator, getLayoutLocaleStrings } from "@/lib/email/i18n";
import {
  type EmailRender,
  escape,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
  secondaryButton,
} from "@/lib/email/layout";

export type InactivityEmailInput = {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
  daysSinceLast: number;
  locale?: string | null;
};

export async function renderInactivityEmail(
  input: InactivityEmailInput,
): Promise<EmailRender> {
  const { firstName, appUrl, unsubscribeUrl, daysSinceLast, locale } = input;
  const { t, locale: resolvedLocale } = await createEmailTranslator(locale);
  const layoutLocale = getLayoutLocaleStrings(
    t,
    resolvedLocale,
    `${appUrl}/settings`,
  );

  const subject = t("inactivity.subject");
  const sinceLine =
    daysSinceLast >= 21
      ? t("inactivity.since21")
      : daysSinceLast >= 14
        ? t("inactivity.since14")
        : t("inactivity.sinceShort");

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: `${escape(sinceLine)} ${t("inactivity.heroBodyTail")}`,
    }) +
    noticeCard({
      eyebrow: t("inactivity.noticeEyebrow"),
      body: t("inactivity.noticeBody"),
    }) +
    primaryButton({
      label: t("inactivity.ctaCoach"),
      href: `${appUrl}/coach`,
    }) +
    secondaryButton({
      label: t("inactivity.ctaApp"),
      href: `${appUrl}/dashboard`,
    });

  const html = renderLayout({
    subject,
    eyebrow: t("inactivity.eyebrow"),
    inner,
    appUrl,
    unsubscribeUrl,
    locale: layoutLocale,
    footerDisclaimer: t("inactivity.footer"),
  });

  const text = `${t("common.greeting", { firstName })}

${sinceLine} ${t("inactivity.heroBodyTail")}

${t("inactivity.ctaCoach")} : ${appUrl}/coach
${t("inactivity.ctaApp")} : ${appUrl}/dashboard

${t("common.unsubscribe")} : ${unsubscribeUrl}`;

  return { subject, html, text };
}

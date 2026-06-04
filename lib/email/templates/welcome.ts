import { createEmailTranslator, getLayoutLocaleStrings } from "@/lib/email/i18n";
import {
  type EmailRender,
  escape,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

export type WelcomeEmailInput = {
  firstName: string;
  appUrl: string;
  /** Profile locale ("fr-CH", "en", …). Falls back to EN when missing. */
  locale?: string | null;
};

/**
 * Sent after account creation. Calm intro — no aggressive onboarding,
 * no upsell, just a warm welcome in the user's preferred language.
 */
export async function renderWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<EmailRender> {
  const { firstName, appUrl, locale } = input;
  const { t, locale: resolvedLocale } = await createEmailTranslator(locale);
  const layoutLocale = getLayoutLocaleStrings(
    t,
    resolvedLocale,
    `${appUrl}/settings`,
  );

  const subject = t("welcome.subject");

  const inner =
    heroCard({
      greeting: t("common.greeting", { firstName }),
      body: t("welcome.heroBody"),
    }) +
    noticeCard({
      eyebrow: t("welcome.noticeEyebrow"),
      body: t("welcome.noticeBody"),
    }) +
    primaryButton({
      label: t("welcome.cta"),
      href: `${appUrl}/onboarding`,
    });

  const html = renderLayout({
    subject,
    eyebrow: t("welcome.eyebrow"),
    inner,
    appUrl,
    locale: layoutLocale,
    footerDisclaimer: `${t("welcome.footer")} <a href="${escape(appUrl)}/settings" style="color:#9999a3;">→</a>`,
  });

  const text = `${t("common.greeting", { firstName })}

${t("welcome.textHero")}

${t("welcome.textNotice")}

${t("welcome.textCtaLine")} : ${appUrl}/onboarding

${t("common.disclaimer")}`;

  return { subject, html, text };
}

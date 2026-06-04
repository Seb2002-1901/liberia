import { createEmailTranslator, getLayoutLocaleStrings } from "@/lib/email/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  type EmailRender,
  escape,
  heroCard,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

export type GoalMilestoneEmailInput = {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
  goalTitle: string;
  milestonePct: 50 | 80 | 100;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  locale?: string | null;
};

export async function renderGoalMilestoneEmail(
  input: GoalMilestoneEmailInput,
): Promise<EmailRender> {
  const {
    firstName,
    appUrl,
    unsubscribeUrl,
    goalTitle,
    milestonePct,
    currentAmount,
    targetAmount,
    currency,
    locale,
  } = input;

  const { t, intlLocale, locale: resolvedLocale } = await createEmailTranslator(locale);
  const layoutLocale = getLayoutLocaleStrings(
    t,
    resolvedLocale,
    `${appUrl}/settings`,
  );
  const remaining = Math.max(0, targetAmount - currentAmount);

  const subjectKey =
    milestonePct === 100
      ? "goalMilestone.subject100"
      : milestonePct === 80
        ? "goalMilestone.subject80"
        : "goalMilestone.subject50";
  const heroKey =
    milestonePct === 100
      ? "goalMilestone.hero100"
      : milestonePct === 80
        ? "goalMilestone.hero80"
        : "goalMilestone.hero50";
  const textKey =
    milestonePct === 100
      ? "goalMilestone.text100"
      : milestonePct === 80
        ? "goalMilestone.text80"
        : "goalMilestone.text50";

  const subject = t(subjectKey, { goal: goalTitle });

  const params = {
    goal: escape(goalTitle),
    amount: escape(formatCurrency(targetAmount, currency, intlLocale)),
    remaining: escape(formatCurrency(remaining, currency, intlLocale)),
  };

  const heroBody = t(heroKey, params);
  const noticeBody =
    milestonePct === 100
      ? t("goalMilestone.notice100")
      : t("goalMilestone.noticeRest");

  const inner =
    heroCard({ greeting: t("common.greeting", { firstName }), body: heroBody }) +
    noticeCard({ eyebrow: t("goalMilestone.noticeEyebrow"), body: noticeBody }) +
    primaryButton({ label: t("goalMilestone.cta"), href: `${appUrl}/goals` });

  const html = renderLayout({
    subject,
    eyebrow: t("goalMilestone.eyebrow"),
    inner,
    appUrl,
    unsubscribeUrl,
    locale: layoutLocale,
    footerDisclaimer: t("goalMilestone.footer"),
  });

  const textParams = {
    goal: goalTitle,
    amount: formatCurrency(targetAmount, currency, intlLocale),
    remaining: formatCurrency(remaining, currency, intlLocale),
  };

  const text = `${t("common.greeting", { firstName })}

${t(textKey, textParams)}

${t("goalMilestone.cta")} : ${appUrl}/goals

${t("common.unsubscribe")} : ${unsubscribeUrl}`;

  return { subject, html, text };
}

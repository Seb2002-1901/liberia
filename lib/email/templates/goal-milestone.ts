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
  /** Threshold reached: 50 / 80 / 100. */
  milestonePct: 50 | 80 | 100;
  currentAmount: number;
  targetAmount: number;
  currency: string;
};

/**
 * Sent when a goal crosses 50 / 80 / 100% completion. Observational
 * tone — no confetti, no superlatives. Just "you crossed this line".
 */
export function renderGoalMilestoneEmail(
  input: GoalMilestoneEmailInput,
): EmailRender {
  const {
    firstName,
    appUrl,
    unsubscribeUrl,
    goalTitle,
    milestonePct,
    currentAmount,
    targetAmount,
    currency,
  } = input;

  const remaining = Math.max(0, targetAmount - currentAmount);

  const subject =
    milestonePct === 100
      ? `« ${goalTitle} » — objectif atteint`
      : milestonePct === 80
        ? `« ${goalTitle} » — plus que 20% à parcourir`
        : `« ${goalTitle} » — palier 50% franchi`;

  const heroBody =
    milestonePct === 100
      ? `Ton objectif <strong>« ${escape(goalTitle)} »</strong> est atteint. ${escape(formatCurrency(targetAmount, currency))} mis de côté. C'est posé.`
      : milestonePct === 80
        ? `Tu es à <strong>80%</strong> de ton objectif <strong>« ${escape(goalTitle)} »</strong>. Plus que ${escape(formatCurrency(remaining, currency))} à parcourir.`
        : `Tu viens de franchir le palier <strong>50%</strong> sur <strong>« ${escape(goalTitle)} »</strong>. La moitié du chemin est faite.`;

  const noticeBody =
    milestonePct === 100
      ? `Tu peux soit clôturer cet objectif dans LIBERIA, soit le faire évoluer vers un palier suivant — au choix.`
      : `Continue à ce rythme. Pas d'accélération forcée nécessaire — la régularité fait l'essentiel du travail.`;

  const inner =
    heroCard({ greeting: `Salut ${firstName},`, body: heroBody }) +
    noticeCard({ eyebrow: "La suite", body: noticeBody }) +
    primaryButton({ label: "Voir mes objectifs", href: `${appUrl}/goals` });

  const html = renderLayout({
    subject,
    eyebrow: "Objectif",
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: `Tu reçois cet email parce que les rappels d'objectifs sont activés dans <a href="${escape(appUrl)}/settings" style="color:#9999a3;">tes paramètres</a>.`,
  });

  const text = `Salut ${firstName},

${
    milestonePct === 100
      ? `« ${goalTitle} » est atteint. ${formatCurrency(targetAmount, currency)} mis de côté.`
      : milestonePct === 80
        ? `Tu es à 80% de « ${goalTitle} ». Plus que ${formatCurrency(remaining, currency)}.`
        : `Tu viens de franchir 50% sur « ${goalTitle} ».`
  }

Voir mes objectifs : ${appUrl}/goals

Se désinscrire : ${unsubscribeUrl}`;

  return { subject, html, text };
}

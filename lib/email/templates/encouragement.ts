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
  /** Short headline computed server-side (e.g. "Ton runway a atteint 2 mois"). */
  headline: string;
  /** Optional metric to surface alongside the headline. */
  metric?: { label: string; value: number; currency?: string };
};

/**
 * Sent when a positive milestone is detected (savings rate improving,
 * runway crossing a threshold, several plan steps completed in a row).
 * Calm, observational tone — never "well done!" / arcade vibes.
 */
export function renderEncouragementEmail(
  input: EncouragementEmailInput,
): EmailRender {
  const { firstName, appUrl, unsubscribeUrl, headline, metric } = input;
  const subject = "Tu avances dans la bonne direction";

  const metricBlock = metric
    ? noticeCard({
        eyebrow: metric.label,
        body: `<strong style="font-size:18px;">${escape(formatCurrency(metric.value, metric.currency))}</strong>`,
      })
    : "";

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body: escape(headline) + ` C'est le genre de progression qui compte sur la durée.`,
    }) +
    metricBlock +
    primaryButton({ label: "Voir mon tableau de bord", href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: "Progression",
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: `Tu reçois cet email parce que les encouragements sont activés dans <a href="${escape(appUrl)}/settings" style="color:#9999a3;">tes paramètres</a>.`,
  });

  const text = `Salut ${firstName},

${headline} C'est le genre de progression qui compte sur la durée.${metric ? `\n\n${metric.label} : ${formatCurrency(metric.value, metric.currency)}` : ""}

Ouvre LIBERIA : ${appUrl}/dashboard

Se désinscrire : ${unsubscribeUrl}`;

  return { subject, html, text };
}

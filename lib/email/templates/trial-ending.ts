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
  /** Number of days remaining before the trial converts to a paid sub. */
  daysLeft: 1 | 3;
  /** ISO date of the trial end (used to format a human date). */
  trialEndsAt: string;
  /** Monthly price the user is about to be charged. */
  monthlyAmount: number;
  /** Currency used for the formatted amount. */
  currency: string;
  /** Direct link to the Stripe Customer Portal (when available). */
  portalUrl?: string;
};

/**
 * Sent J-3 and J-1 before the trial converts. Tone: informational +
 * reassuring. No FOMO, no "act now". The user keeps full control.
 */
export function renderTrialEndingEmail(input: TrialEndingEmailInput): EmailRender {
  const {
    firstName,
    appUrl,
    daysLeft,
    trialEndsAt,
    monthlyAmount,
    currency,
    portalUrl,
  } = input;

  const subject =
    daysLeft === 1
      ? "Ton essai LIBERIA se termine demain"
      : "Ton essai LIBERIA se termine dans 3 jours";

  const formattedDate = (() => {
    try {
      return new Intl.DateTimeFormat("fr-CH", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(trialEndsAt));
    } catch {
      return trialEndsAt;
    }
  })();

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body:
        daysLeft === 1
          ? `Ton essai se termine <strong>demain (${escape(formattedDate)})</strong>. Ton abonnement Premium prendra automatiquement le relais à <strong>${escape(formatCurrency(monthlyAmount, currency))}/mois</strong>, sans interruption d'accès.`
          : `Ton essai se termine dans <strong>3 jours (${escape(formattedDate)})</strong>. Ensuite, ton abonnement Premium prendra automatiquement le relais à <strong>${escape(formatCurrency(monthlyAmount, currency))}/mois</strong>.`,
    }) +
    noticeCard({
      eyebrow: "Tu gardes le contrôle",
      body: `Tu peux annuler à tout moment depuis ton portail d'abonnement — aucune justification, aucune friction. Si tu poursuis, ton accès reste continu.`,
    }) +
    (portalUrl
      ? primaryButton({ label: "Gérer mon abonnement", href: portalUrl })
      : primaryButton({
          label: "Gérer mon abonnement",
          href: `${appUrl}/settings/subscription`,
        })) +
    secondaryButton({ label: "Ouvrir LIBERIA", href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: "Essai gratuit",
    inner,
    appUrl,
    footerDisclaimer: `Cet email t'est envoyé parce qu'il concerne directement ton abonnement LIBERIA. Tu peux le gérer depuis <a href="${escape(appUrl)}/settings/subscription" style="color:#9999a3;">ton espace abonnement</a>.`,
  });

  const text = `Salut ${firstName},

${
    daysLeft === 1
      ? `Ton essai LIBERIA se termine demain (${formattedDate}). Ton abonnement Premium prendra automatiquement le relais à ${formatCurrency(monthlyAmount, currency)}/mois.`
      : `Ton essai LIBERIA se termine dans 3 jours (${formattedDate}). Ensuite, ton abonnement Premium prendra le relais à ${formatCurrency(monthlyAmount, currency)}/mois.`
  }

Tu peux annuler à tout moment depuis ton portail d'abonnement.

Gérer mon abonnement : ${portalUrl ?? `${appUrl}/settings/subscription`}
Ouvrir LIBERIA : ${appUrl}/dashboard`;

  return { subject, html, text };
}

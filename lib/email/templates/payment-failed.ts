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
  /** Direct link to the Stripe Customer Portal (preferred) or settings. */
  portalUrl?: string;
};

/**
 * Sent when Stripe reports `invoice.payment_failed` (sub → past_due).
 * Tone: factual + reassuring. No alarm, no blame. We tell the user
 * what happened and how to fix it in one click.
 */
export function renderPaymentFailedEmail(
  input: PaymentFailedEmailInput,
): EmailRender {
  const { firstName, appUrl, portalUrl } = input;
  const subject = "Ton paiement LIBERIA n'a pas abouti";
  const t = EMAIL_THEME;

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body: `Le dernier prélèvement de ton abonnement n'a pas abouti. C'est généralement dû à un moyen de paiement expiré ou plafonné — rien de plus.`,
    }) +
    noticeCard({
      eyebrow: "Tes données sont en sécurité",
      body: `Tes objectifs, ton plan et ton historique restent intacts. Mets à jour ton moyen de paiement quand tu veux, et ton accès se réactive automatiquement.`,
      toneColor: t.MUTED,
    }) +
    primaryButton({
      label: "Mettre à jour mon paiement",
      href: portalUrl ?? `${appUrl}/settings/subscription`,
    });

  const html = renderLayout({
    subject,
    eyebrow: "Paiement en attente",
    inner,
    appUrl,
    footerDisclaimer: `Cet email t'est envoyé parce qu'il concerne directement ton abonnement LIBERIA.`,
  });

  const text = `Salut ${firstName},

Le dernier prélèvement de ton abonnement LIBERIA n'a pas abouti. C'est généralement dû à un moyen de paiement expiré ou plafonné.

Tes données restent en sécurité — objectifs, plan et historique sont intacts. Mets à jour ton moyen de paiement quand tu veux et ton accès se réactive automatiquement.

Mettre à jour mon paiement : ${portalUrl ?? `${appUrl}/settings/subscription`}`;

  return { subject, html, text };
}

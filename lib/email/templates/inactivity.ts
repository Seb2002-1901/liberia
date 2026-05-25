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
  /** Approximate days since last interaction (capped server-side). */
  daysSinceLast: number;
};

/**
 * Sent after a configurable period of no activity. Tone: gentle and
 * non-judgmental — "on fait un point ?" not "you're slipping". Never
 * trigger more than once per cooldown window (caller's responsibility).
 */
export function renderInactivityEmail(input: InactivityEmailInput): EmailRender {
  const { firstName, appUrl, unsubscribeUrl, daysSinceLast } = input;
  const subject = "On fait un point rapide ensemble ?";

  const sinceLine =
    daysSinceLast >= 21
      ? `Ça fait quelques semaines qu'on s'est pas croisé·s.`
      : daysSinceLast >= 14
        ? `Ça fait deux semaines qu'on s'est pas vus.`
        : `Ça fait quelques jours qu'on s'est pas vus.`;

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body: `${escape(sinceLine)} Pas de souci — la régularité prime sur l'intensité. Si tu veux reprendre, ouvre LIBERIA et fais un check-in rapide. On reprend tranquillement.`,
    }) +
    noticeCard({
      eyebrow: "Si tu veux",
      body: `Pas envie d'ouvrir l'app ? Tu peux désactiver ces rappels d'un clic. LIBERIA reste là quand tu reviens.`,
    }) +
    primaryButton({
      label: "Faire un check-in avec le coach",
      href: `${appUrl}/coach`,
    }) +
    secondaryButton({ label: "Ouvrir LIBERIA", href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: "Reprise en douceur",
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: `Tu reçois cet email parce que les rappels de suivi sont activés dans <a href="${escape(appUrl)}/settings" style="color:#9999a3;">tes paramètres</a>.`,
  });

  const text = `Salut ${firstName},

${sinceLine} Pas de souci — la régularité prime sur l'intensité. Si tu veux reprendre, ouvre LIBERIA et fais un check-in rapide.

Faire un check-in : ${appUrl}/coach
Ouvrir LIBERIA : ${appUrl}/dashboard

Se désinscrire : ${unsubscribeUrl}`;

  return { subject, html, text };
}

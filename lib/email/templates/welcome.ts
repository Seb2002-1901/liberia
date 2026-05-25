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
};

/**
 * Sent after account creation. Calm intro — no aggressive onboarding,
 * no upsell, just a warm "bienvenue".
 */
export function renderWelcomeEmail(input: WelcomeEmailInput): EmailRender {
  const { firstName, appUrl } = input;
  const subject = "Bienvenue dans LIBERIA";

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body: `Content de t'accueillir. LIBERIA est ton espace pour reprendre le contrôle de tes finances — calmement, sans jugement, à ton rythme.`,
    }) +
    noticeCard({
      eyebrow: "Pour bien démarrer",
      body: `Trois minutes suffisent : renseigne tes revenus, tes dépenses principales et ton objectif. On affine le reste ensemble au fil des semaines.`,
    }) +
    primaryButton({ label: "Compléter mon profil", href: `${appUrl}/onboarding` });

  const html = renderLayout({
    subject,
    eyebrow: "Bienvenue",
    inner,
    appUrl,
    footerDisclaimer: `Tu reçois cet email parce que tu viens de créer ton compte LIBERIA. Tes préférences sont ajustables dans <a href="${escape(appUrl)}/settings" style="color:#9999a3;">tes paramètres</a>.`,
  });

  const text = `Salut ${firstName},

Content de t'accueillir dans LIBERIA.

LIBERIA est ton espace pour reprendre le contrôle de tes finances — calmement, sans jugement, à ton rythme.

Pour bien démarrer : trois minutes suffisent. Renseigne tes revenus, tes dépenses principales et ton objectif. On affine le reste ensemble.

Compléter mon profil : ${appUrl}/onboarding

LIBERIA n'est pas un conseil financier réglementé.`;

  return { subject, html, text };
}

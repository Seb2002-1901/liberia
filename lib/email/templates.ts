/**
 * Email templates — plain HTML strings, no React-Email dep.
 * Keep them simple and inline-styled so they render consistently in
 * Gmail, Apple Mail, Outlook web.
 */
import { formatCurrency, formatPercent } from "@/lib/utils";

const BRAND_GOLD = "#c9a96e";
const BG = "#0a0a0c";
const CARD = "#15151a";
const FG = "#f1ede4";
const MUTED = "#9999a3";

export type WeeklyEmailInput = {
  firstName: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  savingsRate: number;
  stabilityScore: number;
  planStepsDoneThisWeek: number;
  planStepsRemaining: number;
  unsubscribeUrl: string;
  appUrl: string;
};

export function renderWeeklyEmail(input: WeeklyEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    firstName,
    monthlyIncome,
    monthlyExpenses,
    cashflow,
    savingsRate,
    stabilityScore,
    planStepsDoneThisWeek,
    planStepsRemaining,
    unsubscribeUrl,
    appUrl,
  } = input;

  const subject = `Ton récap LIBERIA — score ${stabilityScore}/100`;
  const cashflowTone = cashflow >= 0 ? "positif" : "tendu";

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 16px;">
          <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:${BRAND_GOLD};margin:0 0 8px 0;letter-spacing:0.04em;">LIBERIA</h1>
          <p style="color:${MUTED};font-size:12px;margin:0 0 24px 0;text-transform:uppercase;letter-spacing:0.18em;">Récap de la semaine</p>

          <div style="background:${CARD};border:1px solid #2a2a32;border-radius:16px;padding:24px;margin-bottom:16px;">
            <p style="font-size:16px;margin:0 0 8px 0;">Salut ${escape(firstName)},</p>
            <p style="color:${MUTED};font-size:14px;line-height:1.55;margin:0;">
              Voici ta photo financière de la semaine. Ton reste à vivre est ${escape(cashflowTone)}, ton score de stabilité est de <strong style="color:${FG};">${stabilityScore}/100</strong>.
            </p>
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
            <tr>
              <td width="50%" style="padding-right:8px;vertical-align:top;">
                <div style="background:${CARD};border:1px solid #2a2a32;border-radius:12px;padding:14px;">
                  <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">Revenus</p>
                  <p style="font-size:18px;font-weight:600;margin:0;">${escape(formatCurrency(monthlyIncome))}</p>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;vertical-align:top;">
                <div style="background:${CARD};border:1px solid #2a2a32;border-radius:12px;padding:14px;">
                  <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">Dépenses</p>
                  <p style="font-size:18px;font-weight:600;margin:0;">${escape(formatCurrency(monthlyExpenses))}</p>
                </div>
              </td>
            </tr>
            <tr><td colspan="2" style="height:8px;"></td></tr>
            <tr>
              <td width="50%" style="padding-right:8px;vertical-align:top;">
                <div style="background:${CARD};border:1px solid #2a2a32;border-radius:12px;padding:14px;">
                  <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">Reste à vivre</p>
                  <p style="font-size:18px;font-weight:600;color:${cashflow >= 0 ? FG : "#ef6464"};margin:0;">${escape(formatCurrency(cashflow))}</p>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;vertical-align:top;">
                <div style="background:${CARD};border:1px solid #2a2a32;border-radius:12px;padding:14px;">
                  <p style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">Taux d'épargne</p>
                  <p style="font-size:18px;font-weight:600;margin:0;">${escape(formatPercent(savingsRate))}</p>
                </div>
              </td>
            </tr>
          </table>

          ${
            planStepsRemaining > 0
              ? `<div style="background:${CARD};border:1px solid #2a2a32;border-radius:16px;padding:20px;margin-bottom:16px;">
                  <p style="color:${BRAND_GOLD};font-size:11px;text-transform:uppercase;letter-spacing:0.18em;margin:0 0 8px 0;">Ton plan</p>
                  <p style="font-size:14px;line-height:1.55;color:${FG};margin:0;">
                    ${planStepsDoneThisWeek > 0 ? `Tu as validé <strong>${planStepsDoneThisWeek}</strong> ${planStepsDoneThisWeek > 1 ? "étapes" : "étape"} cette semaine. ` : ""}Il reste <strong>${planStepsRemaining}</strong> ${planStepsRemaining > 1 ? "étapes" : "étape"} à compléter — une à la fois, sans pression.
                  </p>
                </div>`
              : ""
          }

          <div style="text-align:center;margin:24px 0;">
            <a href="${escape(appUrl)}/dashboard" style="display:inline-block;background:${BRAND_GOLD};color:${BG};padding:12px 24px;border-radius:12px;font-weight:600;text-decoration:none;font-size:14px;">Ouvrir LIBERIA</a>
          </div>

          <p style="color:${MUTED};font-size:11px;line-height:1.6;text-align:center;margin:24px 0 0 0;">
            LIBERIA est un outil de pilotage personnel. Aucune information ici n'est un conseil financier réglementé.<br>
            Tu reçois cet email parce que tu as activé le récap hebdo dans <a href="${escape(appUrl)}/settings" style="color:${MUTED};">tes paramètres</a>.
            <br><a href="${escape(unsubscribeUrl)}" style="color:${MUTED};">Se désinscrire</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Salut ${firstName},

Voici ton récap LIBERIA de la semaine.

Revenus : ${formatCurrency(monthlyIncome)}
Dépenses : ${formatCurrency(monthlyExpenses)}
Reste à vivre : ${formatCurrency(cashflow)}
Taux d'épargne : ${formatPercent(savingsRate)}
Score de stabilité : ${stabilityScore}/100

${planStepsRemaining > 0 ? `Plan : ${planStepsDoneThisWeek > 0 ? `${planStepsDoneThisWeek} étape(s) validée(s) cette semaine. ` : ""}${planStepsRemaining} étape(s) à compléter.\n\n` : ""}Ouvre LIBERIA : ${appUrl}/dashboard

LIBERIA n'est pas un conseil financier réglementé.
Se désinscrire : ${unsubscribeUrl}`;

  return { subject, html, text };
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

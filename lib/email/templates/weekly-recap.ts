import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  type EmailRender,
  escape,
  heroCard,
  metricsTable,
  noticeCard,
  primaryButton,
  renderLayout,
} from "@/lib/email/layout";

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

export function renderWeeklyEmail(input: WeeklyEmailInput): EmailRender {
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

  const planBlock =
    planStepsRemaining > 0
      ? noticeCard({
          eyebrow: "Ton plan",
          body:
            (planStepsDoneThisWeek > 0
              ? `Tu as validé <strong>${planStepsDoneThisWeek}</strong> ${planStepsDoneThisWeek > 1 ? "étapes" : "étape"} cette semaine. `
              : "") +
            `Il reste <strong>${planStepsRemaining}</strong> ${planStepsRemaining > 1 ? "étapes" : "étape"} à compléter — une à la fois, sans pression.`,
        })
      : "";

  const inner =
    heroCard({
      greeting: `Salut ${firstName},`,
      body: `Voici ta photo financière de la semaine. Ton reste à vivre est ${escape(cashflowTone)}, ton score de stabilité est de <strong>${stabilityScore}/100</strong>.`,
    }) +
    metricsTable([
      { label: "Revenus", value: formatCurrency(monthlyIncome) },
      { label: "Dépenses", value: formatCurrency(monthlyExpenses) },
      {
        label: "Reste à vivre",
        value: formatCurrency(cashflow),
        tone: cashflow >= 0 ? "neutral" : "danger",
      },
      { label: "Taux d'épargne", value: formatPercent(savingsRate) },
    ]) +
    planBlock +
    primaryButton({ label: "Ouvrir LIBERIA", href: `${appUrl}/dashboard` });

  const html = renderLayout({
    subject,
    eyebrow: "Récap de la semaine",
    inner,
    appUrl,
    unsubscribeUrl,
    footerDisclaimer: `Tu reçois cet email parce que tu as activé le récap hebdo dans <a href="${escape(appUrl)}/settings" style="color:#9999a3;">tes paramètres</a>.`,
  });

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

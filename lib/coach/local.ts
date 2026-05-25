/**
 * Local coach response generator — deterministic French replies that
 * use the user's memory + financial snapshot to give a coherent,
 * non-judgmental response. Activated by /api/ai/chat when
 * ANTHROPIC_API_KEY isn't configured, so the coach surface stays
 * functional in dev / preview / pre-launch without burning tokens.
 *
 * Design rules:
 *  - never invent numbers; only use the snapshot values passed in
 *  - never give regulated financial advice (no "achète X", "investis dans Y")
 *  - adapt wording to the resolved coaching tone (calm / direct /
 *    structured / gentle)
 *  - keep replies short (2–4 short paragraphs / a few bullets)
 *  - acknowledge → orient → propose → open question
 *
 * The shape returned matches what a future LLM would produce, so the
 * UI / persistence path stays identical.
 */
import { formatCurrency } from "@/lib/utils";
import { resolveCoachingTone } from "@/lib/coach/tone";
import type { FinancialProfile, UserMemory } from "@/types/database";

export type CoachLocalInput = {
  userMessage: string;
  history: { role: "user" | "assistant"; content: string }[];
  fullName?: string | null;
  financialProfile: FinancialProfile | null;
  memory: UserMemory | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  monthlyDebt: number;
  currency: string;
};

type Tone = "calm" | "direct" | "structured" | "gentle";

type Intent =
  | "next_action"
  | "stress"
  | "subscription"
  | "savings"
  | "debt"
  | "budget"
  | "goal"
  | "greeting"
  | "thanks"
  | "unclear";

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().trim();
  if (/^(merci|cool|super|génial|nickel|parfait|top|ok)\b/.test(lower))
    return "thanks";
  if (/^(salut|bonjour|coucou|hello|hey|hola)\b/.test(lower)) return "greeting";
  if (
    /(par où|par ou|que dois.je|que faire|commencer|priorité|prochaine étape|cette semaine|aujourd'hui)/.test(
      lower,
    )
  )
    return "next_action";
  if (/(stress|anxieu|anxiété|fatigué|déprim|pression|peur|inquiet|paniqu)/.test(lower))
    return "stress";
  if (/(abonnement)/.test(lower)) return "subscription";
  if (/(économis|épargn|mettre.{1,4}côté|coussin|réserve)/.test(lower))
    return "savings";
  if (/(dette|crédit|remboursement|rembourser|prêt|emprunt|carte de crédit)/.test(lower))
    return "debt";
  if (/(budget|dépens)/.test(lower)) return "budget";
  if (/(objectif|fonds.{1,4}urgence|projet|but)/.test(lower)) return "goal";
  return "unclear";
}

function firstName(fullName?: string | null): string {
  if (!fullName) return "";
  return fullName.split(" ")[0] ?? "";
}

/**
 * Public entry point. Returns a markdown string ready to stream back
 * to the client (one chunk, persisted to ai_messages by the route).
 */
export function generateLocalCoachReply(input: CoachLocalInput): string {
  const tone = resolveCoachingTone(
    input.memory?.coaching_tone ?? null,
    input.financialProfile?.behavior_traits ?? [],
  );
  const intent = detectIntent(input.userMessage);
  const ctx = deriveContext(input);

  switch (intent) {
    case "greeting":
      return greeting(ctx, tone, firstName(input.fullName));
    case "thanks":
      return thanks(ctx, tone);
    case "next_action":
      return nextActionReply(ctx, tone);
    case "stress":
      return stressReply(ctx, tone);
    case "subscription":
      return subscriptionReply(ctx, tone);
    case "savings":
      return savingsReply(ctx, tone);
    case "debt":
      return debtReply(ctx, tone);
    case "budget":
      return budgetReply(ctx, tone);
    case "goal":
      return goalReply(ctx, tone);
    case "unclear":
    default:
      return unclearReply(ctx, tone);
  }
}

type Ctx = {
  cashflow: number;
  runway: number;
  savingsRate: number;
  dti: number;
  monthlyExpenses: number;
  fmt: (n: number) => string;
  hasIncome: boolean;
  hasExpenses: boolean;
  hasFund: boolean;
  mainGoal: string | null;
  challenges: string[];
  triggers: string[];
  traits: Set<string>;
};

function deriveContext(input: CoachLocalInput): Ctx {
  const { monthlyIncome, monthlyExpenses, currentSavings, monthlyDebt, currency } = input;
  const cashflow = monthlyIncome - monthlyExpenses;
  const runway = monthlyExpenses > 0 ? currentSavings / monthlyExpenses : Infinity;
  const savingsRate = monthlyIncome > 0 ? cashflow / monthlyIncome : 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;
  return {
    cashflow,
    runway,
    savingsRate,
    dti,
    monthlyExpenses,
    fmt: (n) => formatCurrency(n, currency),
    hasIncome: monthlyIncome > 0,
    hasExpenses: monthlyExpenses > 0,
    hasFund: input.financialProfile?.has_emergency_fund ?? false,
    mainGoal: input.financialProfile?.main_goal ?? null,
    challenges: input.memory?.recurring_challenges ?? [],
    triggers: input.memory?.spending_triggers ?? [],
    traits: new Set(input.financialProfile?.behavior_traits ?? []),
  };
}

function openLine(tone: Tone, ack: string): string {
  switch (tone) {
    case "direct":
      return `${ack}`;
    case "structured":
      return `${ack} Voilà comment je verrais les choses.`;
    case "gentle":
      return `${ack} Pas de précipitation, on avance à ton rythme.`;
    case "calm":
    default:
      return `${ack}`;
  }
}

function closeLine(tone: Tone): string {
  switch (tone) {
    case "direct":
      return "\n\nTu veux qu'on attaque par où ?";
    case "structured":
      return "\n\nSouhaites-tu qu'on détaille une étape en particulier ?";
    case "gentle":
      return "\n\nDis-moi simplement comment tu te sens vis-à-vis de tout ça.";
    case "calm":
    default:
      return "\n\nTu veux qu'on creuse un point en particulier ?";
  }
}

function greeting(ctx: Ctx, tone: Tone, name: string): string {
  const hi = name ? `Salut ${name},` : "Salut,";
  const status = ctx.hasIncome
    ? ctx.cashflow >= 0
      ? `ton reste à vivre mensuel est de **${ctx.fmt(ctx.cashflow)}**.`
      : `tu es actuellement à **${ctx.fmt(Math.abs(ctx.cashflow))} de moins** que tes dépenses mensuelles — c'est mesurable, donc adressable.`
    : "on peut commencer dès que tu auras renseigné tes revenus et dépenses.";
  return (
    `${hi} content de te revoir. ${status}\n\n` +
    (tone === "direct"
      ? "Qu'est-ce qu'on attaque aujourd'hui ?"
      : tone === "structured"
        ? "On peut faire le point sur 1 priorité, 1 risque ou 1 action — au choix."
        : "Comment je peux t'aider aujourd'hui ?")
  );
}

function thanks(_ctx: Ctx, tone: Tone): string {
  switch (tone) {
    case "direct":
      return "Avec plaisir. Continue comme ça — la régularité fait tout.";
    case "structured":
      return "Avec plaisir. Pense à noter le résultat dans LIBERIA pour que la trace reste.";
    case "gentle":
      return "C'est moi qui te remercie. Prends ton temps, je suis là quand tu veux.";
    case "calm":
    default:
      return "Avec plaisir. On reprend quand tu en as envie.";
  }
}

function nextActionReply(ctx: Ctx, tone: Tone): string {
  const ack = openLine(tone, "Bonne question.");
  // Pick a single next-best-action based on context priority.
  let action: string;
  if (ctx.cashflow < 0 && ctx.hasIncome && ctx.hasExpenses) {
    const cut = Math.max(20, Math.round(Math.abs(ctx.cashflow) * 0.5));
    action =
      `Ta priorité du moment c'est de **réduire ton écart mensuel**. ` +
      `Aujourd'hui, identifie **une seule dépense récurrente** que tu peux baisser d'environ **${ctx.fmt(cut)}** — un abonnement, une livraison, un poste shopping. ` +
      `Tu n'as pas besoin de tout changer, juste de poser **un premier verrou**.`;
  } else if (ctx.dti >= 30) {
    action =
      `Tes remboursements représentent **${ctx.dti.toFixed(0)}%** de tes revenus — c'est ce qui pèse le plus actuellement. ` +
      `Cette semaine, liste tes crédits par taux d'intérêt et concentre tes prochains efforts sur le plus coûteux.`;
  } else if (!ctx.hasFund && ctx.cashflow > 0) {
    const target = Math.max(50, Math.round(ctx.cashflow * 0.3));
    action =
      `Tu n'as pas encore de fonds d'urgence. C'est ton premier palier. ` +
      `Programme **un virement automatique de ${ctx.fmt(target)}** en début de mois vers un compte séparé. ` +
      `Symbolique au début, structurel ensuite.`;
  } else if (ctx.savingsRate < 0.05 && ctx.hasIncome) {
    action =
      `Ton taux d'épargne est faible. Cette semaine, **passe en revue tes abonnements actifs** et coupe ceux que tu n'as pas utilisés ce mois-ci. ` +
      `C'est l'action avec le meilleur ratio effort / impact.`;
  } else {
    action =
      `Tu as une base saine. **Choisis une habitude à tester pendant 30 jours** : ` +
      `un virement automatique, un plafond shopping hebdo, ou une revue financière du dimanche soir.`;
  }
  return `${ack}\n\n${action}${closeLine(tone)}`;
}

function stressReply(ctx: Ctx, tone: Tone): string {
  const ack =
    tone === "direct"
      ? "Le stress financier, ça se mesure et ça se réduit."
      : tone === "structured"
        ? "Compris. On va décomposer ce qui pèse."
        : "Je comprends. Avoir de la pression autour de l'argent, c'est dur — et c'est très courant.";
  let body = "";
  if (ctx.cashflow < 0) {
    body =
      `Le déclencheur le plus probable de ton stress c'est l'écart entre revenus et dépenses : actuellement **${ctx.fmt(Math.abs(ctx.cashflow))} de plus** que ce qui rentre. ` +
      `On peut s'attaquer à ça **une dépense à la fois**, pas tout d'un coup.`;
  } else if (!ctx.hasFund && ctx.runway < 1) {
    body =
      `Sans réserve, chaque imprévu devient une crise. La meilleure façon de baisser ton stress, c'est de **commencer un fonds d'urgence** — même symbolique. ` +
      `Un coussin de quelques centaines de CHF change déjà beaucoup la sensation au quotidien.`;
  } else {
    body =
      `Tu n'es pas en zone rouge financièrement, mais la charge mentale peut quand même peser. ` +
      `Une revue financière courte chaque semaine (10 minutes) suffit souvent à reprendre la main mentalement.`;
  }
  return `${ack}\n\n${body}${closeLine(tone)}`;
}

function subscriptionReply(ctx: Ctx, tone: Tone): string {
  const ack = openLine(tone, "Bonne piste — c'est souvent là que dorment le plus de petites fuites.");
  const body =
    `**Méthode rapide** : ouvre tes 3 derniers relevés bancaires, surligne chaque ligne récurrente, et pose-toi UNE question par ligne — « Est-ce que je l'ai utilisé ce mois-ci ? ». ` +
    `Coupe sans hésiter ceux qui répondent non — tu peux toujours te réabonner. ` +
    `Vise **1 abonnement coupé cette semaine**, pas 5 — la régularité bat la performance.`;
  return `${ack}\n\n${body}${closeLine(tone)}`;
}

function savingsReply(ctx: Ctx, tone: Tone): string {
  const ack = openLine(tone, "Très bien.");
  let body = "";
  if (ctx.cashflow <= 0) {
    body =
      `Pour pouvoir épargner, il faut d'abord **dégager du reste à vivre** — chercher à mettre de côté quand on est négatif crée de la culpabilité sans résultat. ` +
      `Concentrons-nous d'abord sur la réduction d'une dépense, puis on parle d'épargne.`;
  } else {
    const target = Math.max(50, Math.round(ctx.cashflow * 0.2));
    body =
      `Ton reste à vivre est de **${ctx.fmt(ctx.cashflow)}/mois**. Si tu démarres modestement avec **${ctx.fmt(target)}** virés automatiquement en début de mois vers un compte séparé, ` +
      `tu construis l'habitude sans la ressentir. C'est cette automaticité qui fait la différence à 12 mois.`;
  }
  return `${ack}\n\n${body}${closeLine(tone)}`;
}

function debtReply(ctx: Ctx, _tone: Tone): string {
  const ack = "Important d'en parler clairement.";
  let body = "";
  if (ctx.dti >= 30) {
    body =
      `Tes remboursements représentent **${ctx.dti.toFixed(0)}%** de tes revenus — au-dessus de 30%, c'est lourd. ` +
      `Stratégie : **liste tes crédits par taux d'intérêt** (du plus cher au moins cher) et concentre les remboursements supplémentaires sur le plus coûteux. ` +
      `Les autres restent au minimum tant que celui-ci n'est pas soldé.`;
  } else if (ctx.dti > 0) {
    body =
      `Tes remboursements représentent **${ctx.dti.toFixed(0)}%** de tes revenus — c'est gérable. ` +
      `Tant que c'est sous 25%, tu peux continuer à équilibrer remboursement et épargne. Au-dessus, priorité au remboursement.`;
  } else {
    body =
      `Tu n'as pas de remboursement déclaré dans LIBERIA actuellement. ` +
      `Si tu as un crédit en cours qui n'est pas encore enregistré, ajoute-le côté Dépenses pour qu'on puisse le suivre ensemble.`;
  }
  return `${ack}\n\n${body}${closeLine(_tone)}`;
}

function budgetReply(ctx: Ctx, tone: Tone): string {
  const ack = openLine(tone, "Faisons le point.");
  const body = ctx.hasIncome
    ? `Tu as **${ctx.fmt(ctx.cashflow)}** de reste à vivre par mois (${(ctx.savingsRate * 100).toFixed(0)}% de tes revenus). ` +
      `${ctx.cashflow >= 0 ? "C'est ta marge de manœuvre — c'est avec ça qu'on construit." : "L'écart est négatif — on va travailler sur sa réduction avant tout le reste."}\n\n` +
      `Pour un budget plus net, je te suggère **3 enveloppes mentales** :\n` +
      `- Fixes (loyer, factures, assurances)\n- Variables (courses, transport, sorties)\n- Mise de côté (épargne, dettes accélérées)\n\n` +
      `Cette semaine, regarde simplement combien chaque enveloppe pèse réellement.`
    : `Je n'ai pas encore tes revenus et dépenses. Renseigne-les dans LIBERIA — même une estimation suffit pour démarrer.`;
  return `${ack}\n\n${body}${closeLine(tone)}`;
}

function goalReply(ctx: Ctx, tone: Tone): string {
  const ack = openLine(tone, "Avoir un cap, c'est ce qui fait la différence.");
  let body = "";
  if (ctx.mainGoal === "emergency_fund" || !ctx.hasFund) {
    body =
      `Ton premier palier raisonnable : **1 mois de dépenses** de côté${ctx.hasExpenses ? ` (soit environ **${ctx.fmt(ctx.monthlyExpenses)}** dans ton cas)` : ""}. ` +
      `Une fois atteint, on vise 3 mois, puis 6. Étape par étape.`;
  } else if (ctx.mainGoal === "debt_payoff") {
    body =
      `Ton objectif est de réduire la dette. Fixe-toi un palier mesurable sur 90 jours (par exemple solder une carte de crédit) plutôt qu'un objectif total — c'est plus motivant.`;
  } else {
    body =
      `Définis ton objectif avec **3 critères** : un montant cible, une échéance, et un montant mensuel à mettre de côté. ` +
      `Sans ces 3 éléments, l'objectif reste flou. Pose-les dans LIBERIA et on l'attaque.`;
  }
  return `${ack}\n\n${body}${closeLine(tone)}`;
}

function unclearReply(ctx: Ctx, tone: Tone): string {
  const ack =
    tone === "direct"
      ? "Pour qu'on aille à l'essentiel, deux options."
      : tone === "structured"
        ? "Quelques angles possibles."
        : "Pas de souci. On peut partir d'un angle simple.";
  const summary = ctx.hasIncome
    ? `Ton reste à vivre est de **${ctx.fmt(ctx.cashflow)}/mois**${ctx.hasFund ? "" : " et tu n'as pas encore de fonds d'urgence"}.`
    : "Tes données financières ne sont pas encore renseignées — on peut commencer par là.";
  return (
    `${ack}\n\n${summary}\n\n` +
    `- Tu veux **réduire une dépense** ? Dis « quelle dépense surveiller cette semaine ».\n` +
    `- Tu veux **commencer à épargner** ? Dis « comment construire un fonds d'urgence ».\n` +
    `- Tu veux **gérer une dette** ? Dis « par quoi rembourser en priorité ».\n` +
    `- Tu veux **un point général** ? Dis « fais-moi un bilan rapide ».${closeLine(tone)}`
  );
}


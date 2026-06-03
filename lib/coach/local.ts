/**
 * Local coach response generator — deterministic replies that use the
 * user's memory + financial snapshot to give a coherent, non-judgmental
 * response. Activated by /api/ai/chat when ANTHROPIC_API_KEY isn't
 * configured, so the coach surface stays functional in dev / preview /
 * pre-launch without burning tokens.
 *
 * Design rules:
 *  - never invent numbers; only use the snapshot values passed in
 *  - never give regulated financial advice
 *  - adapt wording to the resolved coaching tone (calm / direct /
 *    structured / gentle)
 *  - keep replies short (2–4 short paragraphs / a few bullets)
 *  - acknowledge → orient → propose → open question
 *
 * Locale: the helper accepts a `t` translator scoped to `app.coach.local.*`.
 * The caller (api/ai/chat/route.ts) builds it from the user's profile
 * locale via `getTranslations`. Every visible string comes from the
 * JSON catalogue — no embedded language anywhere here.
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
  locale?: string;
};

export type CoachTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

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

/**
 * Intent detection is intentionally locale-aware via a simple keyword
 * map. EN gets parallel patterns; everything else falls back to
 * `unclear` so the user still gets a coherent response (rather than a
 * misclassification).
 */
const INTENT_PATTERNS: Record<string, Partial<Record<Intent, RegExp[]>>> = {
  fr: {
    thanks: [/^(merci|cool|super|génial|nickel|parfait|top|ok)\b/],
    greeting: [/^(salut|bonjour|coucou|hello|hey|hola)\b/],
    next_action: [
      /(par où|par ou|que dois.je|que faire|commencer|priorité|prochaine étape|cette semaine|aujourd'hui)/,
    ],
    stress: [/(stress|anxieu|anxiété|fatigué|déprim|pression|peur|inquiet|paniqu)/],
    subscription: [/(abonnement)/],
    savings: [/(économis|épargn|mettre.{1,4}côté|coussin|réserve)/],
    debt: [/(dette|crédit|remboursement|rembourser|prêt|emprunt|carte de crédit)/],
    budget: [/(budget|dépens)/],
    goal: [/(objectif|fonds.{1,4}urgence|projet|but)/],
  },
  en: {
    thanks: [/^(thanks|thank you|great|cool|awesome|perfect|nice|ok)\b/],
    greeting: [/^(hi|hello|hey|howdy)\b/],
    next_action: [
      /(where (do|should) i (start|begin)|what (do|should) i do|next step|this week|today)/,
    ],
    stress: [/(stress|anxiou|anxiety|tired|depress|pressure|fear|worry|panic)/],
    subscription: [/(subscription|subscribe)/],
    savings: [/(saving|save|set aside|cushion|reserve|nest egg)/],
    debt: [/(debt|loan|repayment|credit card|borrow)/],
    budget: [/(budget|spend)/],
    goal: [/(goal|emergency fund|project|target)/],
  },
};

function detectIntent(message: string, locale: string): Intent {
  const lower = message.toLowerCase().trim();
  const baseLocale = locale.split("-")[0];
  const patterns = INTENT_PATTERNS[baseLocale] ?? INTENT_PATTERNS.en;
  for (const intent of [
    "thanks",
    "greeting",
    "next_action",
    "stress",
    "subscription",
    "savings",
    "debt",
    "budget",
    "goal",
  ] as Intent[]) {
    const regexes = patterns[intent];
    if (regexes?.some((r) => r.test(lower))) return intent;
  }
  return "unclear";
}

function firstName(fullName?: string | null): string {
  if (!fullName) return "";
  return fullName.split(" ")[0] ?? "";
}

export function generateLocalCoachReply(
  input: CoachLocalInput,
  t: CoachTranslator,
): string {
  const tone = resolveCoachingTone(
    input.memory?.coaching_tone ?? null,
    input.financialProfile?.behavior_traits ?? [],
  );
  const locale = input.locale ?? "fr";
  const intent = detectIntent(input.userMessage, locale);
  const ctx = deriveContext(input);

  switch (intent) {
    case "greeting":
      return greeting(ctx, tone, firstName(input.fullName), t);
    case "thanks":
      return thanks(tone, t);
    case "next_action":
      return nextActionReply(ctx, tone, t);
    case "stress":
      return stressReply(ctx, tone, t);
    case "subscription":
      return subscriptionReply(tone, t);
    case "savings":
      return savingsReply(ctx, tone, t);
    case "debt":
      return debtReply(ctx, tone, t);
    case "budget":
      return budgetReply(ctx, tone, t);
    case "goal":
      return goalReply(ctx, tone, t);
    case "unclear":
    default:
      return unclearReply(ctx, tone, t);
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
  const { monthlyIncome, monthlyExpenses, currentSavings, monthlyDebt, currency, locale } = input;
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
    fmt: (n) => formatCurrency(n, currency, locale),
    hasIncome: monthlyIncome > 0,
    hasExpenses: monthlyExpenses > 0,
    hasFund: input.financialProfile?.has_emergency_fund ?? false,
    mainGoal: input.financialProfile?.main_goal ?? null,
    challenges: input.memory?.recurring_challenges ?? [],
    triggers: input.memory?.spending_triggers ?? [],
    traits: new Set(input.financialProfile?.behavior_traits ?? []),
  };
}

function openLine(tone: Tone, ack: string, t: CoachTranslator): string {
  return t(`openLine.${tone}`, { ack });
}

function closeLine(tone: Tone, t: CoachTranslator): string {
  return `\n\n${t(`closeLine.${tone}`)}`;
}

function greeting(ctx: Ctx, tone: Tone, name: string, t: CoachTranslator): string {
  const hi = name ? t("greeting.hello", { name }) : t("greeting.helloNoName");
  const status = ctx.hasIncome
    ? ctx.cashflow >= 0
      ? t("greeting.statusPositive", { cashflow: ctx.fmt(ctx.cashflow) })
      : t("greeting.statusNegative", { gap: ctx.fmt(Math.abs(ctx.cashflow)) })
    : t("greeting.statusEmpty");
  const bridge = t("greeting.bridge");
  const promptKey =
    tone === "direct"
      ? "greeting.promptDirect"
      : tone === "structured"
        ? "greeting.promptStructured"
        : "greeting.promptDefault";
  return `${hi} ${bridge} ${status}\n\n${t(promptKey)}`;
}

function thanks(tone: Tone, t: CoachTranslator): string {
  return t(`thanks.${tone}`);
}

function nextActionReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack = openLine(tone, t("nextAction.ack"), t);
  let body: string;
  if (ctx.cashflow < 0 && ctx.hasIncome && ctx.hasExpenses) {
    const cut = Math.max(20, Math.round(Math.abs(ctx.cashflow) * 0.5));
    body = t("nextAction.cashflowNegative", { cut: ctx.fmt(cut) });
  } else if (ctx.dti >= 30) {
    body = t("nextAction.highDti", { pct: ctx.dti.toFixed(0) });
  } else if (!ctx.hasFund && ctx.cashflow > 0) {
    const target = Math.max(50, Math.round(ctx.cashflow * 0.3));
    body = t("nextAction.noFund", { target: ctx.fmt(target) });
  } else if (ctx.savingsRate < 0.05 && ctx.hasIncome) {
    body = t("nextAction.lowSavings");
  } else {
    body = t("nextAction.habit");
  }
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function stressReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack =
    tone === "direct"
      ? t("stress.ackDirect")
      : tone === "structured"
        ? t("stress.ackStructured")
        : t("stress.ackCalm");
  let body: string;
  if (ctx.cashflow < 0) {
    body = t("stress.bodyCashflow", { gap: ctx.fmt(Math.abs(ctx.cashflow)) });
  } else if (!ctx.hasFund && ctx.runway < 1) {
    body = t("stress.bodyNoFund");
  } else {
    body = t("stress.bodyMental");
  }
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function subscriptionReply(tone: Tone, t: CoachTranslator): string {
  const ack = openLine(tone, t("subscription.ack"), t);
  return `${ack}\n\n${t("subscription.body")}${closeLine(tone, t)}`;
}

function savingsReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack = openLine(tone, t("savings.ack"), t);
  let body: string;
  if (ctx.cashflow <= 0) {
    body = t("savings.bodyNegative");
  } else {
    const target = Math.max(50, Math.round(ctx.cashflow * 0.2));
    body = t("savings.bodyPositive", {
      cashflow: ctx.fmt(ctx.cashflow),
      target: ctx.fmt(target),
    });
  }
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function debtReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack = t("debt.ack");
  let body: string;
  if (ctx.dti >= 30) {
    body = t("debt.bodyHigh", { pct: ctx.dti.toFixed(0) });
  } else if (ctx.dti > 0) {
    body = t("debt.bodyManageable", { pct: ctx.dti.toFixed(0) });
  } else {
    body = t("debt.bodyNone");
  }
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function budgetReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack = openLine(tone, t("budget.ack"), t);
  const body = ctx.hasIncome
    ? t("budget.bodyData", {
        cashflow: ctx.fmt(ctx.cashflow),
        rate: (ctx.savingsRate * 100).toFixed(0),
        tail:
          ctx.cashflow >= 0
            ? t("budget.tailPositive")
            : t("budget.tailNegative"),
      })
    : t("budget.bodyEmpty");
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function goalReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack = openLine(tone, t("goal.ack"), t);
  let body: string;
  if (ctx.mainGoal === "emergency_fund" || !ctx.hasFund) {
    body = ctx.hasExpenses
      ? t("goal.emergencyWithAmount", {
          monthlyExpenses: ctx.fmt(ctx.monthlyExpenses),
        })
      : t("goal.emergencyNoAmount");
  } else if (ctx.mainGoal === "debt_payoff") {
    body = t("goal.debtPayoff");
  } else {
    body = t("goal.generic");
  }
  return `${ack}\n\n${body}${closeLine(tone, t)}`;
}

function unclearReply(ctx: Ctx, tone: Tone, t: CoachTranslator): string {
  const ack =
    tone === "direct"
      ? t("unclear.ackDirect")
      : tone === "structured"
        ? t("unclear.ackStructured")
        : t("unclear.ackDefault");
  const summary = ctx.hasIncome
    ? t("unclear.summaryWithData", {
        cashflow: ctx.fmt(ctx.cashflow),
        fundNote: ctx.hasFund ? "" : t("unclear.fundNoteMissing"),
      })
    : t("unclear.summaryEmpty");
  return `${ack}\n\n${summary}\n\n${t("unclear.options")}${closeLine(tone, t)}`;
}

import "server-only";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  GOAL_TYPES,
  type ExpenseCategoryId,
  type IncomeCategoryId,
  type GoalTypeId,
} from "@/lib/constants";

/**
 * Phase 3.1 — coach proposed actions.
 *
 * The coach can now emit STRUCTURED suggestions alongside its natural
 * reply, using Anthropic native tool_use. The "tool" is not actually
 * executed by the model — it's a typed signal to the UI that we
 * should render a confirmation card. The user clicks Confirm and the
 * server action does the real INSERT.
 *
 * Why tool_use rather than markdown markers:
 *   - Anthropic VALIDATES the input against the JSON schema at the
 *     API boundary — we can never receive a malformed amount or an
 *     unknown category.
 *   - The model decides naturally when to call it (or not) based on
 *     the system-prompt rules, no fragile regex on the user's text.
 *
 * Caveat on tool_result: when stop_reason=tool_use, the next API call
 * normally needs a matching tool_result block. We side-step this by
 * stripping tool_use from the persisted conversation history before
 * the next turn (route handler responsibility). The model never sees
 * its own previous tool_use, so no orphan handshake is required. This
 * keeps ai_messages text-only and avoids a migration.
 */

export const PROPOSE_EXPENSE_TOOL_NAME = "propose_expense" as const;

/**
 * Tool the coach calls when the user reports a real, completed
 * expense (past tense, specific amount). The UI renders a
 * confirmation card; the user decides whether to persist.
 *
 * Phase 3.1.2 — the tool now distinguishes fixed recurring expenses
 * ("Mon loyer est 1500 CHF par mois" → FIXED MONTHLY) from variable
 * one-off transactions ("J'ai dépensé 42 CHF chez Coop" → VARIABLE
 * ONE_TIME). Failing to make this distinction logged the loyer as a
 * one-off and let the recurring backbone of the budget fall through
 * the cracks.
 */
export const PROPOSE_EXPENSE_TOOL: Tool = {
  name: PROPOSE_EXPENSE_TOOL_NAME,
  description:
    "Call this tool when the user reports an expense — either a REAL completed transaction (past tense, specific amount: 'J'ai dépensé 42 CHF chez Coop', 'Restaurant 68') OR a recurring fixed expense they want recorded (present-tense statement of a monthly/yearly cost: 'Mon loyer est 1500 par mois', 'Mon assurance c'est 220 CHF par mois', 'Je paie 12 CHF par mois pour Netflix'). DO NOT call for hypothetical / future / estimated spending. DO NOT call twice in the same reply. The UI shows a confirmation card with Confirm/Cancel; you NEVER persist the expense yourself, NEVER claim it was recorded. Always write a short natural reply BEFORE calling the tool. Pick `expense_type` carefully: VARIABLE_ONE_TIME for a single past transaction (Coop, restaurant, gas station, café); FIXED_RECURRING for any line that repeats automatically every period (rent, subscription, insurance, phone, loan payment, utilities).",
  input_schema: {
    type: "object",
    properties: {
      expense_type: {
        type: "string",
        enum: ["variable_one_time", "fixed_recurring"],
        description:
          "VARIABLE_ONE_TIME for a single past transaction (the typical 'J'ai dépensé X chez Y' case). FIXED_RECURRING for a line that repeats every period (rent, subscription, insurance, phone). When in doubt and the user used past tense with a venue name, prefer variable_one_time.",
      },
      frequency: {
        type: "string",
        enum: ["one_time", "monthly", "weekly", "yearly"],
        description:
          "Cadence. For expense_type=variable_one_time this MUST be 'one_time'. For expense_type=fixed_recurring pick the cadence the user mentioned (default to 'monthly' if unspecified — most household fixed expenses are monthly).",
      },
      amount: {
        type: "number",
        description:
          "Positive amount in the user's currency. Round to 2 decimals.",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code. Default to the user's profile currency (see finance context).",
      },
      label: {
        type: "string",
        description:
          "Short descriptive label (merchant, vendor, or brief description). 80 chars max. Examples: 'Coop', 'Restaurant Lac', 'Loyer', 'Netflix', 'Assurance santé'.",
      },
      category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description:
          "Best-guess category from the allowed list. 'food' for groceries/supermarkets/restaurants, 'transport' for fuel/public transport/taxi, 'leisure' for entertainment/sports/hobbies, 'shopping' for clothes/electronics, 'health' for pharmacy/medical, 'housing' for rent/mortgage, 'utilities' for energy/internet/phone, 'insurance' for insurance premiums, 'subscriptions' for streaming/SaaS subscriptions, 'other' when uncertain.",
      },
      notes: {
        type: "string",
        description:
          "Optional 1-line free note. Leave empty unless the user provided context worth keeping (e.g. 'cadeau anniv mère').",
      },
    },
    required: ["expense_type", "frequency", "amount", "currency", "label", "category"],
  },
};

export type ExpenseTypeId = "variable_one_time" | "fixed_recurring";

/**
 * Validated shape returned to the client after the SDK already
 * type-checked it. Mirrors the JSON schema above but exposed as a
 * TypeScript type so the client / server action share the contract.
 */
export interface ProposeExpenseInput {
  expense_type: ExpenseTypeId;
  frequency: "one_time" | "monthly" | "weekly" | "yearly";
  amount: number;
  currency: string;
  label: string;
  category: ExpenseCategoryId;
  notes?: string;
}

/* ════════════════════════════════════════════════════════════
 * Sprint Coach IA — outils complémentaires (S3+).
 *
 * Le coach peut désormais proposer 3 actions supplémentaires en plus
 * de propose_expense :
 *   - propose_income  : un nouveau revenu ("augmentation +800", "loyer
 *                       perçu", "freelance facturé 1500")
 *   - propose_goal    : un nouvel objectif financier ("acheter une
 *                       maison à 20 000 CHF sur 2 ans")
 *   - propose_budget  : fixer ou modifier un plafond mensuel par
 *                       catégorie ("mets 500 CHF de budget nourriture")
 *
 * Mêmes principes que propose_expense :
 *  - Le modèle EXTRAIT, ne PERSISTE jamais. L'UI affiche une carte
 *    de confirmation, l'action server fait l'INSERT/UPSERT après
 *    consentement explicite de l'utilisateur.
 *  - Plusieurs tool_use peuvent coexister dans la même réponse —
 *    le route handler les loope toutes (vs l'ancien comportement
 *    qui prenait la première et break-ait). Permet le pattern :
 *    "5 CHF Coop, 200 CHF assurance, 800 CHF bureau, +800 salaire"
 *    → 4 cartes (3 dépenses + 1 revenu) en une réponse.
 * ════════════════════════════════════════════════════════════ */

export const PROPOSE_INCOME_TOOL_NAME = "propose_income" as const;

export const PROPOSE_INCOME_TOOL: Tool = {
  name: PROPOSE_INCOME_TOOL_NAME,
  description:
    "Call this tool when the user reports a real income — either a recurring monthly salary/freelance/rental ('Mon salaire c'est 4800 CHF par mois', 'Je facture 1500 CHF par mois en freelance') OR a one-off received payment ('J'ai reçu 800 CHF de prime', 'Vente Vinted 220'). DO NOT call for hypothetical / future / estimated income. Pick `frequency` carefully: 'monthly' for recurring salary/rent, 'yearly' for annual bonuses, 'one_time' for single transactions like a gift or freelance gig already invoiced. Always write a short natural reply BEFORE calling the tool. NEVER claim the income is recorded — the UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      frequency: {
        type: "string",
        enum: ["one_time", "monthly", "weekly", "yearly"],
        description:
          "Cadence. 'monthly' for a recurring salary/rent/freelance retainer. 'one_time' for a single past receipt (bonus, gift, single freelance gig). 'yearly' for annual bonuses. 'weekly' if the user explicitly said so.",
      },
      amount: {
        type: "number",
        description:
          "Positive amount in the user's currency. Round to 2 decimals.",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code. Default to the user's profile currency (see finance context).",
      },
      label: {
        type: "string",
        description:
          "Short descriptive label. 80 chars max. Examples: 'Salaire', 'Freelance Acme', 'Prime annuelle', 'Loyer perçu', 'Vente Vinted'.",
      },
      category: {
        type: "string",
        enum: INCOME_CATEGORIES.map((c) => c.id),
        description:
          "Best-guess category from the allowed list. 'salary' for employer salary, 'freelance' for freelance/consulting, 'business' for self-employment, 'investments' for dividends/interest, 'aid' for unemployment/aids, 'rental' for rental income, 'other' otherwise.",
      },
      notes: {
        type: "string",
        description:
          "Optional 1-line free note. Leave empty unless the user provided context worth keeping.",
      },
    },
    required: ["frequency", "amount", "currency", "label", "category"],
  },
};

export interface ProposeIncomeInput {
  frequency: "one_time" | "monthly" | "weekly" | "yearly";
  amount: number;
  currency: string;
  label: string;
  category: IncomeCategoryId;
  notes?: string;
}

export const PROPOSE_GOAL_TOOL_NAME = "propose_goal" as const;

export const PROPOSE_GOAL_TOOL: Tool = {
  name: PROPOSE_GOAL_TOOL_NAME,
  description:
    "Call this tool when the user states a NEW concrete financial goal with a target amount ('Je veux acheter une maison à 20 000 CHF sur 2 ans', 'Je veux 10 000 CHF de fonds d'urgence', 'Économiser 5000 pour des vacances dans 1 an'). DO NOT call for vague aspirations ('je veux être riche'). Always write a short natural reply BEFORE calling the tool. NEVER claim the goal is created — the UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Short descriptive title for the goal. 80 chars max. Examples: 'Apport maison', 'Fonds d'urgence', 'Voyage Japon', 'Rembourser crédit auto'.",
      },
      type: {
        type: "string",
        enum: GOAL_TYPES.map((g) => g.id),
        description:
          "Best-guess goal category. 'emergency_fund' for safety net, 'debt_payoff' for paying off a loan, 'savings' for general saving, 'purchase' for a big item, 'travel' for trips, 'increase_income' for income goals, 'other' otherwise.",
      },
      targetAmount: {
        type: "number",
        description: "Target amount in the user's currency. Positive integer or 2-decimal number.",
      },
      currentAmount: {
        type: "number",
        description: "Amount the user already has saved towards this goal. 0 if not mentioned.",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code. Default to the user's profile currency.",
      },
      deadline: {
        type: "string",
        description:
          "Optional ISO date (YYYY-MM-DD) when the user wants to reach the goal. Compute from natural language: 'dans 2 ans' from today, 'd'ici fin 2027', 'avant juin'. Leave empty if not mentioned.",
      },
      notes: {
        type: "string",
        description: "Optional 1-line free note.",
      },
    },
    required: ["title", "type", "targetAmount", "currency"],
  },
};

export interface ProposeGoalInput {
  title: string;
  type: GoalTypeId;
  targetAmount: number;
  currentAmount?: number;
  currency: string;
  deadline?: string;
  notes?: string;
}

export const PROPOSE_BUDGET_TOOL_NAME = "propose_budget" as const;

export const PROPOSE_BUDGET_TOOL: Tool = {
  name: PROPOSE_BUDGET_TOOL_NAME,
  description:
    "Call this tool when the user wants to SET or CHANGE a monthly budget cap for an expense category ('Mets 500 CHF de budget nourriture', 'Je veux pas dépasser 300 CHF de loisirs par mois', 'Cap mes restos à 200'). DO NOT call for analytical questions ('combien je dépense en bouffe ?'). Always write a short natural reply BEFORE calling the tool. NEVER claim the budget is set — the UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description:
          "Expense category to cap. Same taxonomy as propose_expense.",
      },
      monthlyLimit: {
        type: "number",
        description:
          "Monthly cap in the user's currency. Positive number, 2 decimals max.",
      },
      currency: {
        type: "string",
        description:
          "ISO currency code. Default to the user's profile currency.",
      },
    },
    required: ["category", "monthlyLimit", "currency"],
  },
};

export interface ProposeBudgetInput {
  category: ExpenseCategoryId;
  monthlyLimit: number;
  currency: string;
}

/** Toutes les tools exposées au modèle en un tableau prêt-à-passer. */
export const COACH_TOOLS: Tool[] = [
  PROPOSE_EXPENSE_TOOL,
  PROPOSE_INCOME_TOOL,
  PROPOSE_GOAL_TOOL,
  PROPOSE_BUDGET_TOOL,
];

export const COACH_TOOL_NAMES = [
  PROPOSE_EXPENSE_TOOL_NAME,
  PROPOSE_INCOME_TOOL_NAME,
  PROPOSE_GOAL_TOOL_NAME,
  PROPOSE_BUDGET_TOOL_NAME,
] as const;

export type CoachToolName = typeof COACH_TOOL_NAMES[number];

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

/* ════════════════════════════════════════════════════════════
 * Sprint Advisor V3 — outils de MISE À JOUR.
 *
 * propose_update_goal : changer target / deadline / currentAmount /
 *   title / type d'un objectif existant identifié par son TITRE
 *   (le coach lit la liste des objectifs dans le contexte financier,
 *   identifie celui que l'utilisateur veut modifier par son titre).
 *
 * Le tool retourne dans son input le NOUVEAU `title` cible et les
 * nouveaux champs ; la server action recherche un goal qui matche
 * `match_title` (texte fourni séparément) ET appartient au user
 * connecté. Si plusieurs matches : l'action retourne ambiguity et
 * le coach pose une question au tour suivant.
 *
 * SCOPE LIMITÉ — sprint actuel : objectifs uniquement. Pas
 * d'update/delete pour expenses/incomes/budgets (besoin d'une UX
 * de désambiguïsation plus poussée — risque trop élevé d'écraser
 * une donnée sans le vouloir).
 * ════════════════════════════════════════════════════════════ */

export const PROPOSE_UPDATE_GOAL_TOOL_NAME = "propose_update_goal" as const;

export const PROPOSE_UPDATE_GOAL_TOOL: Tool = {
  name: PROPOSE_UPDATE_GOAL_TOOL_NAME,
  description:
    "Call this tool when the user wants to UPDATE an existing financial goal (change target amount, deadline, progress, or rename it). The user must clearly reference WHICH goal — by title or topic. Example triggers: 'change mon objectif maison à 30000', 'déplace mon fonds d'urgence à décembre 2027', 'augmente mon objectif retraite à 500000', 'j'ai déjà 5000 sur l'objectif vacances'. DO NOT call for vague 'change my goal' — ask which one first. The UI shows a confirmation card before any DB write.",
  input_schema: {
    type: "object",
    properties: {
      match_title: {
        type: "string",
        description:
          "Title (or partial title) of the existing goal to update. Used to look it up server-side. Must match what the user said and what's in the goals list of the finance context.",
      },
      newTargetAmount: {
        type: "number",
        description:
          "New target amount in user's currency. Omit if not changing.",
      },
      newCurrentAmount: {
        type: "number",
        description: "New current saved amount. Omit if not changing.",
      },
      newDeadline: {
        type: "string",
        description:
          "New ISO date (YYYY-MM-DD). Omit if not changing.",
      },
      newTitle: {
        type: "string",
        description: "Rename the goal. Omit if not renaming.",
      },
      currency: {
        type: "string",
        description: "ISO currency code.",
      },
    },
    required: ["match_title", "currency"],
  },
};

export interface ProposeUpdateGoalInput {
  match_title: string;
  newTargetAmount?: number;
  newCurrentAmount?: number;
  newDeadline?: string;
  newTitle?: string;
  currency: string;
}

export const PROPOSE_DELETE_GOAL_TOOL_NAME = "propose_delete_goal" as const;

export const PROPOSE_DELETE_GOAL_TOOL: Tool = {
  name: PROPOSE_DELETE_GOAL_TOOL_NAME,
  description:
    "Call this tool when the user wants to DELETE an existing goal. Reference the goal by title. Example: 'supprime mon objectif voyage Japon', 'efface l'objectif voiture, j'abandonne'. ALWAYS ask for confirmation in your text reply (the user might mean 'mark as completed' rather than delete). The UI also shows a confirmation card before any DB write.",
  input_schema: {
    type: "object",
    properties: {
      match_title: {
        type: "string",
        description:
          "Title of the existing goal to delete. Server-side lookup.",
      },
    },
    required: ["match_title"],
  },
};

export interface ProposeDeleteGoalInput {
  match_title: string;
}

/* ════════════════════════════════════════════════════════════
 * Sprint Iris V4 — update/delete pour expenses, incomes, budget
 * + memory write + plan step toggle.
 *
 * Stratégie de désambiguïsation pour expenses/incomes :
 *  - Le coach passe match_label (ILIKE substring sur label)
 *  - Optionnel : match_amount (exact match dans une tolérance ±2%)
 *  - Optionnel : match_category (filtre supplémentaire)
 *  - 0 result → notFound, 1 → execute, >1 → ambiguous (server
 *    retourne les candidats au coach pour qu'il pose une question)
 *
 * Pour budget : 1 row par (user, category) — pas d'ambiguïté
 * possible. Le coach passe la catégorie directement.
 * ════════════════════════════════════════════════════════════ */

export const PROPOSE_UPDATE_EXPENSE_TOOL_NAME = "propose_update_expense" as const;

export const PROPOSE_UPDATE_EXPENSE_TOOL: Tool = {
  name: PROPOSE_UPDATE_EXPENSE_TOOL_NAME,
  description:
    "Call this tool to UPDATE an existing expense (correct an amount, change a frequency, fix the category). The user must reference WHICH expense — by label, amount, or category. Examples: 'change mon loyer à 1600', 'corrige la dépense Coop, c'était 45 pas 5', 'l'assurance maladie c'est 280 pas 250'. If user is vague ('change ma dépense') and you can't tell which one from the context — ask first before calling the tool. The UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      match_label: {
        type: "string",
        description:
          "Label substring of the existing expense to update (ILIKE lookup). REQUIRED.",
      },
      match_category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description:
          "Optional category filter for disambiguation when multiple labels match.",
      },
      newAmount: {
        type: "number",
        description: "New amount in user currency. Omit if not changing.",
      },
      newFrequency: {
        type: "string",
        enum: ["one_time", "monthly", "weekly", "yearly"],
        description: "New frequency. Omit if not changing.",
      },
      newCategory: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description: "New category. Omit if not changing.",
      },
      newLabel: {
        type: "string",
        description: "Rename the expense. Omit if not renaming.",
      },
      currency: {
        type: "string",
        description: "ISO currency code.",
      },
    },
    required: ["match_label", "currency"],
  },
};

export interface ProposeUpdateExpenseInput {
  match_label: string;
  match_category?: ExpenseCategoryId;
  newAmount?: number;
  newFrequency?: "one_time" | "monthly" | "weekly" | "yearly";
  newCategory?: ExpenseCategoryId;
  newLabel?: string;
  currency: string;
}

export const PROPOSE_DELETE_EXPENSE_TOOL_NAME = "propose_delete_expense" as const;

export const PROPOSE_DELETE_EXPENSE_TOOL: Tool = {
  name: PROPOSE_DELETE_EXPENSE_TOOL_NAME,
  description:
    "Call this tool to DELETE an existing expense. User must clearly reference WHICH one. Example: 'supprime la dépense Netflix', 'efface l'assurance auto, je n'ai plus la voiture'. ALWAYS ask the user to confirm in your text reply before calling — deletion is permanent.",
  input_schema: {
    type: "object",
    properties: {
      match_label: { type: "string", description: "Label substring." },
      match_category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description: "Optional category filter.",
      },
    },
    required: ["match_label"],
  },
};

export interface ProposeDeleteExpenseInput {
  match_label: string;
  match_category?: ExpenseCategoryId;
}

export const PROPOSE_UPDATE_INCOME_TOOL_NAME = "propose_update_income" as const;

export const PROPOSE_UPDATE_INCOME_TOOL: Tool = {
  name: PROPOSE_UPDATE_INCOME_TOOL_NAME,
  description:
    "Call this tool to UPDATE an existing income (salary raise, change of freelance retainer, correction). Examples: 'mon salaire passe à 5200', 'corrige le freelance à 1800', 'augmentation, je suis à 5500 maintenant'. User must reference which income by label.",
  input_schema: {
    type: "object",
    properties: {
      match_label: {
        type: "string",
        description: "Label substring of existing income. REQUIRED.",
      },
      match_category: {
        type: "string",
        enum: INCOME_CATEGORIES.map((c) => c.id),
        description: "Optional category filter.",
      },
      newAmount: { type: "number", description: "New amount. Omit if not changing." },
      newFrequency: {
        type: "string",
        enum: ["one_time", "monthly", "weekly", "yearly"],
        description: "New frequency. Omit if not changing.",
      },
      newLabel: { type: "string", description: "Rename. Omit if not renaming." },
      currency: { type: "string", description: "ISO currency." },
    },
    required: ["match_label", "currency"],
  },
};

export interface ProposeUpdateIncomeInput {
  match_label: string;
  match_category?: IncomeCategoryId;
  newAmount?: number;
  newFrequency?: "one_time" | "monthly" | "weekly" | "yearly";
  newLabel?: string;
  currency: string;
}

export const PROPOSE_DELETE_INCOME_TOOL_NAME = "propose_delete_income" as const;

export const PROPOSE_DELETE_INCOME_TOOL: Tool = {
  name: PROPOSE_DELETE_INCOME_TOOL_NAME,
  description:
    "Call this tool to DELETE an existing income. Example: 'supprime le revenu freelance Acme, j'ai arrêté ce client'. Confirm in your text reply.",
  input_schema: {
    type: "object",
    properties: {
      match_label: { type: "string", description: "Label substring." },
      match_category: {
        type: "string",
        enum: INCOME_CATEGORIES.map((c) => c.id),
        description: "Optional category filter.",
      },
    },
    required: ["match_label"],
  },
};

export interface ProposeDeleteIncomeInput {
  match_label: string;
  match_category?: IncomeCategoryId;
}

export const PROPOSE_DELETE_BUDGET_TOOL_NAME = "propose_delete_budget" as const;

export const PROPOSE_DELETE_BUDGET_TOOL: Tool = {
  name: PROPOSE_DELETE_BUDGET_TOOL_NAME,
  description:
    "Call this tool to REMOVE a monthly budget cap on a category. Example: 'supprime mon budget loisirs, je ne veux plus de plafond là-dessus'. The UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description: "Category whose budget cap to remove.",
      },
    },
    required: ["category"],
  },
};

export interface ProposeDeleteBudgetInput {
  category: ExpenseCategoryId;
}

export const PROPOSE_ADD_MEMORY_TOOL_NAME = "propose_add_memory" as const;

export const PROPOSE_ADD_MEMORY_TOOL: Tool = {
  name: PROPOSE_ADD_MEMORY_TOOL_NAME,
  description:
    "Call this tool to SAVE a personal note about the user that should persist across conversations. Use sparingly: only for stable personal context that will matter in future sessions. Examples: 'note que je veux acheter une moto vers 2027', 'rappelle-toi que je suis stressé par les factures', 'mémorise que je préfère l'épargne 3a au compte-titres'. Don't use for one-off facts that are already in the finance context (current balance, current goals — those refresh automatically).",
  input_schema: {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["goal", "constraint", "preference", "context", "event"],
        description:
          "Category of memory: 'goal' (long-term aspiration not yet a formal goal), 'constraint' (lifestyle limit, dependents, contract), 'preference' (risk tolerance, investment style), 'context' (job, family, location), 'event' (recent life change, decision pending).",
      },
      summary: {
        type: "string",
        description: "1-2 line summary of the note. Will be shown in the user's memory dashboard.",
      },
    },
    required: ["kind", "summary"],
  },
};

export interface ProposeAddMemoryInput {
  kind: "goal" | "constraint" | "preference" | "context" | "event";
  summary: string;
}

export const PROPOSE_DELETE_MEMORY_TOOL_NAME = "propose_delete_memory" as const;

export const PROPOSE_DELETE_MEMORY_TOOL: Tool = {
  name: PROPOSE_DELETE_MEMORY_TOOL_NAME,
  description:
    "Call this tool to ARCHIVE (soft-delete) a personal memory entry. Use when the user explicitly asks to forget or remove a note. Examples: 'oublie ma note moto', 'efface la mémoire sur la voiture'. Server lookup by ILIKE on the summary. The UI shows a confirmation card.",
  input_schema: {
    type: "object",
    properties: {
      match_summary: {
        type: "string",
        description:
          "Substring of the memory summary to match (ILIKE lookup server-side).",
      },
    },
    required: ["match_summary"],
  },
};

export interface ProposeDeleteMemoryInput {
  match_summary: string;
}

export const PROPOSE_TOGGLE_PLAN_STEP_TOOL_NAME = "propose_toggle_plan_step" as const;

export const PROPOSE_TOGGLE_PLAN_STEP_TOOL: Tool = {
  name: PROPOSE_TOGGLE_PLAN_STEP_TOOL_NAME,
  description:
    "Call this tool to MARK a plan step as completed (or uncompleted). The user must reference WHICH step — usually by its number, title, or focus area. Example: 'marque la première étape comme terminée', 'j'ai fini l'étape budget', 'reprends l'étape 3, je dois la refaire'. If multiple matches, ask for precision before calling.",
  input_schema: {
    type: "object",
    properties: {
      match_query: {
        type: "string",
        description:
          "Title or focus substring of the plan step. Server ILIKE lookup against plan_steps.title OR plan_steps.focus.",
      },
      completed: {
        type: "boolean",
        description: "True to mark completed, false to mark uncompleted.",
      },
    },
    required: ["match_query", "completed"],
  },
};

export interface ProposeTogglePlanStepInput {
  match_query: string;
  completed: boolean;
}

/** Toutes les tools exposées au modèle en un tableau prêt-à-passer. */
export const COACH_TOOLS: Tool[] = [
  PROPOSE_EXPENSE_TOOL,
  PROPOSE_INCOME_TOOL,
  PROPOSE_GOAL_TOOL,
  PROPOSE_BUDGET_TOOL,
  PROPOSE_UPDATE_GOAL_TOOL,
  PROPOSE_DELETE_GOAL_TOOL,
  PROPOSE_UPDATE_EXPENSE_TOOL,
  PROPOSE_DELETE_EXPENSE_TOOL,
  PROPOSE_UPDATE_INCOME_TOOL,
  PROPOSE_DELETE_INCOME_TOOL,
  PROPOSE_DELETE_BUDGET_TOOL,
  PROPOSE_ADD_MEMORY_TOOL,
  PROPOSE_DELETE_MEMORY_TOOL,
  PROPOSE_TOGGLE_PLAN_STEP_TOOL,
];

export const COACH_TOOL_NAMES = [
  PROPOSE_EXPENSE_TOOL_NAME,
  PROPOSE_INCOME_TOOL_NAME,
  PROPOSE_GOAL_TOOL_NAME,
  PROPOSE_BUDGET_TOOL_NAME,
  PROPOSE_UPDATE_GOAL_TOOL_NAME,
  PROPOSE_DELETE_GOAL_TOOL_NAME,
  PROPOSE_UPDATE_EXPENSE_TOOL_NAME,
  PROPOSE_DELETE_EXPENSE_TOOL_NAME,
  PROPOSE_UPDATE_INCOME_TOOL_NAME,
  PROPOSE_DELETE_INCOME_TOOL_NAME,
  PROPOSE_DELETE_BUDGET_TOOL_NAME,
  PROPOSE_ADD_MEMORY_TOOL_NAME,
  PROPOSE_DELETE_MEMORY_TOOL_NAME,
  PROPOSE_TOGGLE_PLAN_STEP_TOOL_NAME,
] as const;

export type CoachToolName = typeof COACH_TOOL_NAMES[number];

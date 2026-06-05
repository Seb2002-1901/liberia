import "server-only";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from "@/lib/constants";

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

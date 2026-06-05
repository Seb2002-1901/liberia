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
 */
export const PROPOSE_EXPENSE_TOOL: Tool = {
  name: PROPOSE_EXPENSE_TOOL_NAME,
  description:
    "Call this tool when, AND ONLY WHEN, the user reports a REAL completed expense with a specific amount (past tense, e.g. 'J'ai dépensé 42 CHF chez Coop', 'Restaurant 68', 'J'ai payé 12.50 le café'). DO NOT call for hypothetical, future, estimated or planned spending. DO NOT call for recurring expenses (rent, subscriptions) — those go through the normal /expenses page. DO NOT call twice in the same reply. The UI will show the user a confirmation card with Confirm/Cancel buttons; you NEVER persist the expense yourself, NEVER claim it was recorded. Always also write a short natural reply BEFORE calling the tool.",
  input_schema: {
    type: "object",
    properties: {
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
          "Short descriptive label (merchant, vendor, or brief description). 80 chars max. Examples: 'Coop', 'Restaurant Lac', 'Essence Migrol', 'Café Starbucks'.",
      },
      category: {
        type: "string",
        enum: EXPENSE_CATEGORIES.map((c) => c.id),
        description:
          "Best-guess category from the allowed list. 'food' for groceries/supermarkets/restaurants, 'transport' for fuel/public transport/taxi, 'leisure' for entertainment/sports/hobbies, 'shopping' for clothes/electronics, 'health' for pharmacy/medical, 'other' when uncertain.",
      },
      notes: {
        type: "string",
        description:
          "Optional 1-line free note. Leave empty unless the user provided context worth keeping (e.g. 'cadeau anniv mère').",
      },
    },
    required: ["amount", "currency", "label", "category"],
  },
};

/**
 * Validated shape returned to the client after the SDK already
 * type-checked it. Mirrors the JSON schema above but exposed as a
 * TypeScript type so the client / server action share the contract.
 */
export interface ProposeExpenseInput {
  amount: number;
  currency: string;
  label: string;
  category: ExpenseCategoryId;
  notes?: string;
}

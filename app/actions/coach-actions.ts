"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

const expenseCategoryIds = EXPENSE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

/**
 * Validates the payload coming back from the client. The same fields
 * came from Anthropic via tool_use and were already validated against
 * the JSON schema at the SDK level — but the client posts back from
 * the BROWSER, so we re-validate here as if it were untrusted input
 * (because between SSE delivery and the user's click, anything can
 * happen — DOM tampering, custom client, replay).
 */
const proposeExpenseSchema = z.object({
  amount: z
    .number()
    .positive("errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  currency: z
    .string()
    .min(2, "errors.validation.amountInvalid")
    .max(8),
  label: z.string().min(1).max(80),
  category: z.enum(expenseCategoryIds),
  notes: z.string().max(280).nullable().optional(),
});

export type CoachExpensePayload = z.infer<typeof proposeExpenseSchema>;

/**
 * Inserts the coach-proposed expense once the user clicked Confirm
 * on the in-chat card. Always frequency='one_time' — coach proposals
 * are real-world transactions, not recurring lines (those go through
 * the /expenses page form).
 *
 * Side effects on success: revalidates every surface that displays
 * expense totals so the dashboard, budget and expenses pages reflect
 * the new line on the user's next navigation.
 */
export async function confirmProposedExpenseAction(
  input: CoachExpensePayload,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = proposeExpenseSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[coach/propose_expense] validation failed:",
      parsed.error.flatten(),
    );
    return { ok: false, error: tErr("invalidData") };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    label: parsed.data.label,
    amount: parsed.data.amount,
    category: parsed.data.category,
    frequency: "one_time",
    notes: parsed.data.notes ?? null,
  });

  if (error) {
    console.error(
      `[coach/propose_expense] insert failed: ${error.code ?? "?"} ${error.message}`,
    );
    return { ok: false, error: error.message };
  }

  // The user expects the dashboard to reflect this immediately.
  // Revalidate every surface that aggregates expenses.
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  // /coach also reads finance data into the prompt — refresh so the
  // next coach reply sees the new line in the financeContext block.
  revalidatePath("/coach");

  console.log(
    `[coach/propose_expense] inserted: ${parsed.data.amount} ${parsed.data.currency} ${parsed.data.label} (${parsed.data.category})`,
  );

  return { ok: true };
}

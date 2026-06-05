"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type ActionResult = { ok: true } | { ok: false; error: string };

const categoryIds = EXPENSE_CATEGORIES.map((c) => c.id) as [
  string,
  ...string[],
];

const upsertSchema = z.object({
  category: z.enum(categoryIds),
  monthly_limit: z
    .number()
    .min(0, "errors.validation.amountPositive")
    .max(10_000_000, "errors.validation.amountTooHigh"),
  currency: z.string().min(2).max(8),
});

export type CategoryBudgetUpsertInput = z.infer<typeof upsertSchema>;

/**
 * Phase 3.1.2 — set or update a monthly budget for a category. The
 * (user_id, category) uniqueness lets us upsert idempotently from the
 * UI so editing an existing budget doesn't accidentally create a
 * duplicate row.
 */
export async function upsertCategoryBudgetAction(
  input: CategoryBudgetUpsertInput,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("invalidData") };
  }
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase.from("category_budgets").upsert(
    {
      user_id: user.id,
      category: parsed.data.category,
      monthly_limit: parsed.data.monthly_limit,
      currency: parsed.data.currency,
    },
    { onConflict: "user_id,category" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/expenses/analytics");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  return { ok: true };
}

export async function deleteCategoryBudgetAction(
  category: string,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) return { ok: false, error: tErr("authRequired") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category", category);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/expenses/analytics");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  revalidatePath("/coach");
  return { ok: true };
}

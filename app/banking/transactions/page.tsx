import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ROUTES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { TransactionsClient } from "./transactions-client";

/**
 * Sprint V5 Banking V1 — page de réconciliation des transactions
 * importées via CSV.
 *
 * Liste les bank_transactions non encore réconciliées (par ordre
 * date desc). L'utilisateur peut pour chacune :
 *  - Confirmer + catégorie (suggérée si parser a deviné, sinon
 *    sélectionner manuel) → crée expense (montant négatif) ou
 *    income (montant positif) lié.
 *  - Ignorer → marque la transaction comme "ignored" (cas typique :
 *    virement interne entre 2 comptes du même user).
 *
 * Bulk action : "Tout valider avec catégorie suggérée" (uniquement
 * pour les lignes où le parser a deviné).
 */
export const dynamic = "force-dynamic";

export default async function BankTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect(ROUTES.login);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const params = await searchParams;
  const filter = params.filter === "all" ? "all" : "pending";

  let query = supabase
    .from("bank_transactions")
    .select(
      "id, transaction_date, amount, currency, label, suggested_category, reconciliation_status, raw_text",
    )
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(200);

  if (filter === "pending") {
    query = query.is("reconciliation_status", null);
  }

  const { data: rows } = await query;
  const transactions =
    (rows as Array<{
      id: string;
      transaction_date: string;
      amount: number;
      currency: string;
      label: string;
      suggested_category: string | null;
      reconciliation_status: string | null;
      raw_text: string | null;
    }> | null) ?? [];

  return (
    <TransactionsClient
      transactions={transactions}
      filter={filter}
      expenseCategories={EXPENSE_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
      }))}
      incomeCategories={INCOME_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
      }))}
    />
  );
}

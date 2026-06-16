"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  parseBankCsv,
  suggestCategory,
  buildDedupSeed,
  type BankHint,
} from "@/lib/banking/csv-parser";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getActionErrors } from "@/lib/i18n/action-errors";

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImportSummary = {
  importId: string;
  bankHint: BankHint;
  rowCount: number;
  importedCount: number;
  skippedDuplicateCount: number;
  parseErrorCount: number;
};

/**
 * Sprint V5 Banking V1 — import CSV bancaire avec dédup automatique.
 *
 * Flux :
 *   1. Parse le CSV (auto-détection format banque)
 *   2. Pour chaque transaction parsée, calcule un hash de dédup
 *      (sha256 sur userId + date + amount + label normalisé)
 *   3. Insert dans bank_transactions avec ON CONFLICT DO NOTHING
 *   4. Crée une bank_imports row de tracking
 *   5. NE crée PAS automatiquement les expenses/incomes — l'utilisateur
 *      voit la liste et choisit quoi réconcilier (1 décision = 1 click).
 *
 * Pas d'écriture sur expenses/incomes ici — la réconciliation est
 * une étape user-driven séparée pour éviter de polluer le budget avec
 * des transactions non-vérifiées.
 */
export async function importBankCsvAction(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: tErr("invalidRequest") };
  }
  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, error: tErr("audioTooLarge") };
  }
  if (file.size === 0) {
    return { ok: false, error: tErr("invalidRequest") };
  }

  const content = await file.text();
  const parsed = parseBankCsv(content);

  if (parsed.transactions.length === 0 && parsed.parseErrors.length > 0) {
    // Aucune transaction extraite : on log l'import en failed
    await supabase.from("bank_imports").insert({
      user_id: user.id,
      bank_hint: parsed.bankHint,
      file_name: file.name,
      file_size_bytes: file.size,
      row_count: parsed.rowCount,
      imported_count: 0,
      skipped_duplicate_count: 0,
      status: "failed",
      error_message: `Parse errors: ${parsed.parseErrors.length}`,
    });
    return { ok: false, error: tErr("csvParseFailed") };
  }

  // Insert bank_imports
  const importInsert = await supabase
    .from("bank_imports")
    .insert({
      user_id: user.id,
      bank_hint: parsed.bankHint,
      file_name: file.name,
      file_size_bytes: file.size,
      row_count: parsed.rowCount,
      imported_count: 0,
      skipped_duplicate_count: 0,
      status: "pending",
    })
    .select("id")
    .single();
  if (importInsert.error || !importInsert.data) {
    return { ok: false, error: importInsert.error?.message ?? "import insert failed" };
  }
  const importId = (importInsert.data as { id: string }).id;

  // Dédup + insert bank_transactions
  let imported = 0;
  let skipped = 0;

  // Préfetch les dedup_hash existants pour cet utilisateur (perf)
  const existingHashesSet = new Set<string>();
  const { data: existing } = await supabase
    .from("bank_transactions")
    .select("dedup_hash")
    .eq("user_id", user.id);
  if (existing) {
    for (const row of existing as Array<{ dedup_hash: string }>) {
      existingHashesSet.add(row.dedup_hash);
    }
  }

  const rowsToInsert: Array<Record<string, unknown>> = [];
  for (const tx of parsed.transactions) {
    const seed = buildDedupSeed(user.id, tx.date, tx.amount, tx.label);
    const dedupHash = sha256(seed);
    if (existingHashesSet.has(dedupHash)) {
      skipped++;
      continue;
    }
    existingHashesSet.add(dedupHash);
    rowsToInsert.push({
      user_id: user.id,
      import_id: importId,
      dedup_hash: dedupHash,
      transaction_date: tx.date,
      amount: tx.amount,
      currency: tx.currency,
      label: tx.label,
      raw_text: tx.raw,
      suggested_category: suggestCategory(tx.label),
    });
  }

  if (rowsToInsert.length > 0) {
    // Insert par chunks de 200 pour éviter les payloads Postgres trop gros
    const CHUNK = 200;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
      const chunk = rowsToInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from("bank_transactions").insert(chunk);
      if (error) {
        // On marque l'import partial et on remonte l'erreur
        await supabase
          .from("bank_imports")
          .update({
            status: "failed",
            error_message: error.message,
            imported_count: imported,
            skipped_duplicate_count: skipped,
          })
          .eq("id", importId);
        return { ok: false, error: error.message };
      }
      imported += chunk.length;
    }
  }

  await supabase
    .from("bank_imports")
    .update({
      imported_count: imported,
      skipped_duplicate_count: skipped,
      status: "completed",
    })
    .eq("id", importId);

  revalidatePath("/banking");
  revalidatePath("/banking/import");
  revalidatePath("/banking/transactions");

  return {
    ok: true,
    data: {
      importId,
      bankHint: parsed.bankHint,
      rowCount: parsed.rowCount,
      importedCount: imported,
      skippedDuplicateCount: skipped,
      parseErrorCount: parsed.parseErrors.length,
    },
  };
}

/**
 * Réconcilie une bank_transaction en créant une expense (montant
 * négatif) ou un income (montant positif) liée. Idempotent : ré-appeler
 * sur une transaction déjà réconciliée retourne ok sans rien faire.
 */
export async function reconcileBankTransactionAction(
  txId: string,
  category: string,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { data: tx, error: lookupError } = await supabase
    .from("bank_transactions")
    .select("id, amount, label, transaction_date, reconciliation_status")
    .eq("id", txId)
    .eq("user_id", user.id)
    .single();
  if (lookupError || !tx) {
    return { ok: false, error: tErr("invalidRequest") };
  }
  const t = tx as {
    id: string;
    amount: number;
    label: string;
    transaction_date: string;
    reconciliation_status: string | null;
  };
  if (
    t.reconciliation_status === "created_expense" ||
    t.reconciliation_status === "created_income"
  ) {
    return { ok: true };
  }

  if (t.amount < 0) {
    const { data: created, error: insErr } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        label: t.label.slice(0, 80) || "Bank import",
        amount: Math.abs(t.amount),
        category,
        frequency: "one_time",
        source: "csv_import",
        notes: `Importé depuis CSV bancaire — date originale ${t.transaction_date}`,
      })
      .select("id")
      .single();
    if (insErr || !created) {
      return { ok: false, error: insErr?.message ?? "insert expense failed" };
    }
    await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "created_expense",
        reconciled_expense_id: (created as { id: string }).id,
        reconciled_at: new Date().toISOString(),
      })
      .eq("id", t.id)
      .eq("user_id", user.id);
  } else {
    const { data: created, error: insErr } = await supabase
      .from("incomes")
      .insert({
        user_id: user.id,
        label: t.label.slice(0, 80) || "Bank import",
        amount: t.amount,
        category,
        frequency: "one_time",
        source: "csv_import",
        notes: `Importé depuis CSV bancaire — date originale ${t.transaction_date}`,
      })
      .select("id")
      .single();
    if (insErr || !created) {
      return { ok: false, error: insErr?.message ?? "insert income failed" };
    }
    await supabase
      .from("bank_transactions")
      .update({
        reconciliation_status: "created_income",
        reconciled_income_id: (created as { id: string }).id,
        reconciled_at: new Date().toISOString(),
      })
      .eq("id", t.id)
      .eq("user_id", user.id);
  }

  revalidatePath("/banking/transactions");
  revalidatePath("/expenses");
  revalidatePath("/incomes");
  revalidatePath("/design-match/depenses-v3");
  revalidatePath("/design-match/revenus-v3");
  revalidatePath("/dashboard");
  revalidatePath("/design-match/dashboard-v3");
  return { ok: true };
}

/**
 * Marquer une transaction comme "ignorée" (l'utilisateur ne veut pas
 * la garder en finance — ex : virement interne entre ses propres
 * comptes). N'affecte pas la dédup : la ligne reste pour info.
 */
export async function ignoreBankTransactionAction(
  txId: string,
): Promise<ActionResult> {
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase
    .from("bank_transactions")
    .update({
      reconciliation_status: "ignored",
      reconciled_at: new Date().toISOString(),
    })
    .eq("id", txId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/banking/transactions");
  return { ok: true };
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

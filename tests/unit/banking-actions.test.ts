import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint V5 Banking V1 — tests des server actions de réconciliation.
 *
 * On valide :
 *   1. reconcile une dépense (montant négatif) crée une expense liée
 *   2. reconcile un revenu (montant positif) crée un income lié
 *   3. reconcile sur tx déjà réconciliée = no-op idempotent
 *   4. ignore marque le statut "ignored"
 *   5. auth obligatoire sur les 3 actions
 *   6. RLS via filtre user_id dans le lookup
 */

type Row = Record<string, unknown>;

const state = {
  supabaseConfigured: true,
  userId: "u-abc" as string | null,
  bankTransactions: [] as Row[],
  insertedExpenses: [] as Row[],
  insertedIncomes: [] as Row[],
  updatesOnTx: [] as { id: string; patch: Row }[],
  revalidated: [] as string[],
};

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => state.supabaseConfigured,
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.userId ? { id: state.userId } : null },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: (col1: string, val1: unknown) => ({
          eq: (col2: string, val2: unknown) => ({
            single: async () => {
              if (table === "bank_transactions") {
                const row = state.bankTransactions.find(
                  (r) =>
                    r[col1] === val1 && r[col2] === val2,
                );
                return row
                  ? { data: row, error: null }
                  : { data: null, error: { message: "not found" } };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
      insert: (row: Row) => ({
        select: () => ({
          single: async () => {
            if (table === "expenses") {
              const id = `exp-${state.insertedExpenses.length + 1}`;
              state.insertedExpenses.push({ ...row, id });
              return { data: { id }, error: null };
            }
            if (table === "incomes") {
              const id = `inc-${state.insertedIncomes.length + 1}`;
              state.insertedIncomes.push({ ...row, id });
              return { data: { id }, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      update: (patch: Row) => ({
        eq: (col1: string, val1: unknown) => ({
          eq: async (col2: string, val2: unknown) => {
            if (table === "bank_transactions") {
              const row = state.bankTransactions.find(
                (r) =>
                  r[col1] === val1 && r[col2] === val2,
              );
              if (row) {
                state.updatesOnTx.push({
                  id: row.id as string,
                  patch,
                });
                Object.assign(row, patch);
              }
              return { error: null };
            }
            return { error: null };
          },
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/i18n/action-errors", () => ({
  getActionErrors: async () => (k: string) => `T(${k})`,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => {
    state.revalidated.push(p);
  },
}));

beforeEach(() => {
  state.supabaseConfigured = true;
  state.userId = "u-abc";
  state.bankTransactions = [];
  state.insertedExpenses = [];
  state.insertedIncomes = [];
  state.updatesOnTx = [];
  state.revalidated = [];
});

describe("reconcileBankTransactionAction", () => {
  it("crée une expense pour montant négatif", async () => {
    state.bankTransactions = [
      {
        id: "tx-1",
        user_id: "u-abc",
        amount: -42.5,
        label: "COOP-2120 Lausanne",
        transaction_date: "2026-03-15",
        reconciliation_status: null,
      },
    ];
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await reconcileBankTransactionAction("tx-1", "food");
    expect(res).toEqual({ ok: true });
    expect(state.insertedExpenses).toHaveLength(1);
    expect(state.insertedExpenses[0]).toMatchObject({
      user_id: "u-abc",
      amount: 42.5,
      category: "food",
      frequency: "one_time",
      source: "csv_import",
    });
    expect(state.updatesOnTx[0].patch.reconciliation_status).toBe(
      "created_expense",
    );
    expect(state.revalidated).toContain("/design-match/depenses-v3");
  });

  it("crée un income pour montant positif", async () => {
    state.bankTransactions = [
      {
        id: "tx-2",
        user_id: "u-abc",
        amount: 4800,
        label: "Salaire mars Employer SA",
        transaction_date: "2026-03-14",
        reconciliation_status: null,
      },
    ];
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await reconcileBankTransactionAction("tx-2", "salary");
    expect(res).toEqual({ ok: true });
    expect(state.insertedIncomes).toHaveLength(1);
    expect(state.insertedIncomes[0]).toMatchObject({
      amount: 4800,
      category: "salary",
      source: "csv_import",
    });
    expect(state.updatesOnTx[0].patch.reconciliation_status).toBe(
      "created_income",
    );
    expect(state.revalidated).toContain("/design-match/revenus-v3");
  });

  it("idempotent — re-reconcile sur tx déjà créée ne fait rien", async () => {
    state.bankTransactions = [
      {
        id: "tx-3",
        user_id: "u-abc",
        amount: -42.5,
        label: "Coop",
        transaction_date: "2026-03-15",
        reconciliation_status: "created_expense",
      },
    ];
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await reconcileBankTransactionAction("tx-3", "food");
    expect(res).toEqual({ ok: true });
    // Pas de nouvelle expense créée
    expect(state.insertedExpenses).toHaveLength(0);
    expect(state.updatesOnTx).toHaveLength(0);
  });

  it("refuse si pas authentifié", async () => {
    state.userId = null;
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await reconcileBankTransactionAction("tx-x", "food");
    expect(res).toEqual({ ok: false, error: "T(authRequired)" });
  });

  it("retourne erreur si tx introuvable (RLS user_id différent)", async () => {
    state.bankTransactions = [
      {
        id: "tx-4",
        user_id: "u-OTHER",
        amount: -10,
        label: "x",
        transaction_date: "2026-03-15",
        reconciliation_status: null,
      },
    ];
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await reconcileBankTransactionAction("tx-4", "food");
    expect(res.ok).toBe(false);
  });

  it("revalide les pages cibles après création", async () => {
    state.bankTransactions = [
      {
        id: "tx-5",
        user_id: "u-abc",
        amount: -50,
        label: "Migros",
        transaction_date: "2026-03-16",
        reconciliation_status: null,
      },
    ];
    const { reconcileBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    await reconcileBankTransactionAction("tx-5", "food");
    expect(state.revalidated).toContain("/banking/transactions");
    expect(state.revalidated).toContain("/expenses");
    expect(state.revalidated).toContain("/design-match/dashboard-v3");
  });
});

describe("ignoreBankTransactionAction", () => {
  it("marque la tx comme ignored", async () => {
    state.bankTransactions = [
      {
        id: "tx-6",
        user_id: "u-abc",
        amount: -100,
        label: "Virement interne",
        transaction_date: "2026-03-16",
        reconciliation_status: null,
      },
    ];
    const { ignoreBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await ignoreBankTransactionAction("tx-6");
    expect(res).toEqual({ ok: true });
    expect(state.updatesOnTx[0].patch.reconciliation_status).toBe("ignored");
  });

  it("refuse si pas authentifié", async () => {
    state.userId = null;
    const { ignoreBankTransactionAction } = await import(
      "@/app/actions/banking"
    );
    const res = await ignoreBankTransactionAction("tx-x");
    expect(res).toEqual({ ok: false, error: "T(authRequired)" });
  });
});

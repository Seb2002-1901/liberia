import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint Coach IA — invariants des 3 nouvelles server actions de
 * confirmation. On valide :
 *  - refus si Supabase pas configuré (mode démo / preview)
 *  - refus si pas de session utilisateur
 *  - insertion / upsert correcte sur le golden path
 *  - re-validation Zod côté serveur (DOM tampering)
 *  - revalidatePath des pages V3 cibles
 */

const state = {
  supabaseConfigured: true,
  userId: "u-abc" as string | null,
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  upserts: [] as Array<{
    table: string;
    row: Record<string, unknown>;
    conflict?: string;
  }>,
  revalidated: [] as string[],
  insertError: null as { code?: string; message: string } | null,
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
      insert: async (row: Record<string, unknown>) => {
        if (state.insertError) return { error: state.insertError };
        state.inserts.push({ table, row });
        return { error: null };
      },
      upsert: async (
        row: Record<string, unknown>,
        opts?: { onConflict?: string },
      ) => {
        if (state.insertError) return { error: state.insertError };
        state.upserts.push({ table, row, conflict: opts?.onConflict });
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/lib/i18n/action-errors", () => ({
  getActionErrors: async () => (k: string) => `T(${k})`,
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    state.revalidated.push(path);
  },
}));

beforeEach(() => {
  state.supabaseConfigured = true;
  state.userId = "u-abc";
  state.inserts = [];
  state.upserts = [];
  state.revalidated = [];
  state.insertError = null;
});

describe("confirmProposedIncomeAction", () => {
  it("inserts income on golden path + revalidates revenus-v3", async () => {
    const { confirmProposedIncomeAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedIncomeAction({
      frequency: "monthly",
      amount: 4800,
      currency: "CHF",
      label: "Salaire",
      category: "salary",
      notes: null,
    });
    expect(res).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe("incomes");
    expect(state.inserts[0].row.user_id).toBe("u-abc");
    expect(state.inserts[0].row.amount).toBe(4800);
    expect(state.revalidated).toContain("/design-match/revenus-v3");
    expect(state.revalidated).toContain("/dashboard");
  });

  it("rejects amount <= 0", async () => {
    const { confirmProposedIncomeAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedIncomeAction({
      frequency: "monthly",
      amount: -100,
      currency: "CHF",
      label: "Salaire",
      category: "salary",
      notes: null,
    });
    expect(res).toEqual({ ok: false, error: "T(invalidData)" });
    expect(state.inserts).toHaveLength(0);
  });

  it("rejects unknown category", async () => {
    const { confirmProposedIncomeAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedIncomeAction({
      frequency: "monthly",
      amount: 100,
      currency: "CHF",
      label: "X",
      category: "unicorn" as unknown as "salary",
      notes: null,
    });
    expect(res.ok).toBe(false);
  });

  it("refuses if no session", async () => {
    state.userId = null;
    const { confirmProposedIncomeAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedIncomeAction({
      frequency: "monthly",
      amount: 4800,
      currency: "CHF",
      label: "Salaire",
      category: "salary",
      notes: null,
    });
    expect(res).toEqual({ ok: false, error: "T(authRequired)" });
  });
});

describe("confirmProposedGoalAction", () => {
  it("inserts goal on golden path", async () => {
    const { confirmProposedGoalAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedGoalAction({
      title: "Apport maison",
      type: "purchase",
      targetAmount: 20000,
      currentAmount: 3000,
      currency: "CHF",
      deadline: "2028-06-15",
      notes: null,
    });
    expect(res).toEqual({ ok: true });
    expect(state.inserts[0].table).toBe("goals");
    expect(state.inserts[0].row.target_amount).toBe(20000);
    expect(state.inserts[0].row.current_amount).toBe(3000);
    expect(state.revalidated).toContain("/design-match/objectifs-v3");
  });

  it("accepts goal without deadline", async () => {
    const { confirmProposedGoalAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedGoalAction({
      title: "Fonds d'urgence",
      type: "emergency_fund",
      targetAmount: 10000,
      currentAmount: 0,
      currency: "CHF",
      deadline: null,
      notes: null,
    });
    expect(res).toEqual({ ok: true });
    expect(state.inserts[0].row.deadline).toBeNull();
  });

  it("rejects currentAmount > targetAmount", async () => {
    const { confirmProposedGoalAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedGoalAction({
      title: "X",
      type: "savings",
      targetAmount: 1000,
      currentAmount: 5000,
      currency: "CHF",
      deadline: null,
      notes: null,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects invalid deadline", async () => {
    const { confirmProposedGoalAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedGoalAction({
      title: "X",
      type: "savings",
      targetAmount: 1000,
      currentAmount: 0,
      currency: "CHF",
      deadline: "not-a-date",
      notes: null,
    });
    expect(res.ok).toBe(false);
  });
});

describe("confirmProposedBudgetAction", () => {
  it("upserts category_budgets with onConflict on (user_id,category)", async () => {
    const { confirmProposedBudgetAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedBudgetAction({
      category: "food",
      monthlyLimit: 500,
      currency: "CHF",
    });
    expect(res).toEqual({ ok: true });
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].table).toBe("category_budgets");
    expect(state.upserts[0].row).toMatchObject({
      user_id: "u-abc",
      category: "food",
      monthly_limit: 500,
    });
    expect(state.upserts[0].conflict).toBe("user_id,category");
    expect(state.revalidated).toContain("/design-match/budget-v3");
  });

  it("rejects monthlyLimit <= 0", async () => {
    const { confirmProposedBudgetAction } = await import(
      "@/app/actions/coach-actions"
    );
    const res = await confirmProposedBudgetAction({
      category: "food",
      monthlyLimit: 0,
      currency: "CHF",
    });
    expect(res.ok).toBe(false);
  });
});

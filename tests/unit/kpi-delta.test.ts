import { describe, expect, it } from "vitest";
import {
  computeExpenseMonthlyDelta,
  computeIncomeMonthlyDelta,
  computeRemainderMonthlyDelta,
} from "@/lib/calculations/kpi-delta";
import type { Expense, Income } from "@/types/database";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const REF = new Date(Date.UTC(2026, 5, 15)); // 15 juin 2026

function mkExpense(amount: number, created_at: string): Expense {
  return {
    id: `e-${created_at}-${amount}`,
    user_id: "u",
    label: "x",
    amount,
    category: "food",
    frequency: "one_time",
    notes: null,
    created_at,
    updated_at: created_at,
  };
}

function mkIncome(amount: number, created_at: string): Income {
  return {
    id: `i-${created_at}-${amount}`,
    user_id: "u",
    label: "x",
    amount,
    category: "salary",
    frequency: "one_time",
    notes: null,
    created_at,
    updated_at: created_at,
  } as Income;
}

/* -------------------------------------------------------------------------- */
/*  computeExpenseMonthlyDelta                                                 */
/* -------------------------------------------------------------------------- */

describe("computeExpenseMonthlyDelta", () => {
  it("retourne neutral si mois précédent vide", () => {
    const r = computeExpenseMonthlyDelta(
      [mkExpense(100, "2026-06-10T00:00:00Z")],
      REF,
    );
    expect(r.direction).toBe("neutral");
    expect(r.percent).toBeNull();
  });

  it("positive +20% si dépenses passent de 100 à 120", () => {
    const r = computeExpenseMonthlyDelta(
      [
        mkExpense(100, "2026-05-15T00:00:00Z"),
        mkExpense(120, "2026-06-10T00:00:00Z"),
      ],
      REF,
    );
    expect(r.direction).toBe("positive");
    expect(r.percent).toBe(20);
  });

  it("negative -25% si dépenses passent de 200 à 150", () => {
    const r = computeExpenseMonthlyDelta(
      [
        mkExpense(200, "2026-05-10T00:00:00Z"),
        mkExpense(150, "2026-06-12T00:00:00Z"),
      ],
      REF,
    );
    expect(r.direction).toBe("negative");
    expect(r.percent).toBe(25);
  });

  it("ignore les rows sans created_at ou avec date invalide", () => {
    const corrupt = {
      ...mkExpense(100, ""),
      created_at: "",
    } as Expense;
    const r = computeExpenseMonthlyDelta([corrupt], REF);
    expect(r.direction).toBe("neutral");
  });

  it("ignore les rows en dehors des 2 mois pertinents", () => {
    const r = computeExpenseMonthlyDelta(
      [
        mkExpense(1000, "2024-01-01T00:00:00Z"), // hors fenêtre
        mkExpense(50, "2026-06-01T00:00:00Z"),
      ],
      REF,
    );
    // Pas de m-1 → neutral, pas de delta calculé.
    expect(r.direction).toBe("neutral");
  });

  it("traverse correctement décembre → janvier", () => {
    const refJan = new Date(Date.UTC(2026, 0, 15)); // janvier 2026
    const r = computeExpenseMonthlyDelta(
      [
        mkExpense(80, "2025-12-20T00:00:00Z"), // mois précédent
        mkExpense(100, "2026-01-10T00:00:00Z"), // mois courant
      ],
      refJan,
    );
    expect(r.direction).toBe("positive");
    expect(r.percent).toBe(25); // (100-80)/80 = 25%
  });
});

/* -------------------------------------------------------------------------- */
/*  computeIncomeMonthlyDelta                                                  */
/* -------------------------------------------------------------------------- */

describe("computeIncomeMonthlyDelta", () => {
  it("ignore les revenus récurrents (ils s'annulent entre les deux mois)", () => {
    const recurring: Income = {
      ...mkIncome(5000, "2026-05-01T00:00:00Z"),
      frequency: "monthly",
    } as Income;
    const r = computeIncomeMonthlyDelta([recurring], REF);
    expect(r.direction).toBe("neutral");
  });

  it("compare bien les revenus ponctuels (primes, etc.)", () => {
    const r = computeIncomeMonthlyDelta(
      [
        mkIncome(500, "2026-05-15T00:00:00Z"),
        mkIncome(800, "2026-06-12T00:00:00Z"),
      ],
      REF,
    );
    expect(r.direction).toBe("positive");
    expect(r.percent).toBe(60);
  });
});

/* -------------------------------------------------------------------------- */
/*  computeRemainderMonthlyDelta                                               */
/* -------------------------------------------------------------------------- */

describe("computeRemainderMonthlyDelta", () => {
  it("calcule le delta du reste à vivre comme différence de différences", () => {
    // Mois précédent : 1000 revenus - 800 dépenses = 200 reste
    // Mois courant   : 1200 revenus - 700 dépenses = 500 reste
    // Delta = (500-200)/200 = +150 %
    const incomes = [
      mkIncome(1000, "2026-05-10T00:00:00Z"),
      mkIncome(1200, "2026-06-10T00:00:00Z"),
    ];
    const expenses = [
      mkExpense(800, "2026-05-12T00:00:00Z"),
      mkExpense(700, "2026-06-12T00:00:00Z"),
    ];
    const r = computeRemainderMonthlyDelta(incomes, expenses, REF);
    expect(r.direction).toBe("positive");
    expect(r.percent).toBe(150);
  });

  it("neutral si reste à vivre du mois précédent = 0", () => {
    const r = computeRemainderMonthlyDelta(
      [mkIncome(100, "2026-06-01T00:00:00Z")],
      [],
      REF,
    );
    expect(r.direction).toBe("neutral");
  });
});

/* -------------------------------------------------------------------------- */
/*  Déterminisme + edge cases                                                  */
/* -------------------------------------------------------------------------- */

describe("kpi-delta — pureté", () => {
  it("est déterministe — mêmes entrées → mêmes sorties", () => {
    const exps = [
      mkExpense(100, "2026-05-10T00:00:00Z"),
      mkExpense(150, "2026-06-12T00:00:00Z"),
    ];
    const a = computeExpenseMonthlyDelta(exps, REF);
    const b = computeExpenseMonthlyDelta(exps, REF);
    expect(a).toEqual(b);
  });

  it("arrondit le percent à 1 décimale", () => {
    const r = computeExpenseMonthlyDelta(
      [
        mkExpense(100, "2026-05-01T00:00:00Z"),
        mkExpense(133, "2026-06-01T00:00:00Z"),
      ],
      REF,
    );
    // 33% exact — sera arrondi à 33.0
    expect(r.percent).toBe(33);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildExpenseEntriesFromBreakdown,
  hasAnyKnownExpense,
  ONBOARDING_EXPENSE_TAG,
  sumKnownExpenses,
  type ExpenseBreakdown,
} from "@/lib/onboarding/expenses";

const USER_ID = "user-abc-1234";

const full: ExpenseBreakdown = {
  housing: 1500,
  insurance: 400,
  food: 600,
  transport: 200,
};

const half: ExpenseBreakdown = {
  housing: 1500,
  insurance: null,
  food: 600,
  transport: null,
};

const allNull: ExpenseBreakdown = {
  housing: null,
  insurance: null,
  food: null,
  transport: null,
};

const withZero: ExpenseBreakdown = {
  housing: 1500,
  insurance: 400,
  food: 600,
  transport: 0, // "je n'ai pas de coût transport ce mois"
};

const negative: ExpenseBreakdown = {
  housing: -100,
  insurance: 400,
  food: 600,
  transport: 200,
};

/* -------------------------------------------------------------------------- */
/*  buildExpenseEntriesFromBreakdown                                           */
/* -------------------------------------------------------------------------- */

describe("buildExpenseEntriesFromBreakdown", () => {
  it("renvoie 4 entries quand les 4 catégories sont renseignées", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    expect(r.length).toBe(4);
  });

  it("ordre canonique : housing → insurance → food → transport", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    expect(r.map((e) => e.category)).toEqual([
      "housing",
      "insurance",
      "food",
      "transport",
    ]);
  });

  it("renvoie 2 entries quand 2 montants + 2 null", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, half);
    expect(r.length).toBe(2);
    expect(r.map((e) => e.category)).toEqual(["housing", "food"]);
  });

  it("renvoie 0 entries quand tout est null", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, allNull);
    expect(r).toEqual([]);
  });

  it("accepte un montant 0 comme valeur valide (entry créée)", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, withZero);
    expect(r.length).toBe(4);
    const transport = r.find((e) => e.category === "transport");
    expect(transport?.amount).toBe(0);
  });

  it("ignore les montants négatifs (défense)", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, negative);
    expect(r.length).toBe(3);
    expect(r.map((e) => e.category)).toEqual([
      "insurance",
      "food",
      "transport",
    ]);
  });

  it("chaque entry a frequency = 'monthly'", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    for (const e of r) {
      expect(e.frequency).toBe("monthly");
    }
  });

  it("chaque entry porte le tag d'idempotence dans notes", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    for (const e of r) {
      expect(e.notes).toBe(ONBOARDING_EXPENSE_TAG);
    }
  });

  it("chaque entry porte le user_id fourni", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    for (const e of r) {
      expect(e.user_id).toBe(USER_ID);
    }
  });

  it("le label de chaque entry est lisible en FR (pas un id technique)", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    const labels = r.map((e) => e.label);
    expect(labels).toContain("Logement (loyer ou hypothèque)");
    expect(labels).toContain("Assurances");
    expect(labels).toContain("Alimentation");
    expect(labels).toContain("Transport");
  });

  it("les montants matchent le breakdown", () => {
    const r = buildExpenseEntriesFromBreakdown(USER_ID, full);
    expect(r.find((e) => e.category === "housing")?.amount).toBe(1500);
    expect(r.find((e) => e.category === "insurance")?.amount).toBe(400);
    expect(r.find((e) => e.category === "food")?.amount).toBe(600);
    expect(r.find((e) => e.category === "transport")?.amount).toBe(200);
  });
});

/* -------------------------------------------------------------------------- */
/*  sumKnownExpenses                                                           */
/* -------------------------------------------------------------------------- */

describe("sumKnownExpenses", () => {
  it("somme les 4 montants quand tous renseignés", () => {
    expect(sumKnownExpenses(full)).toBe(2700);
  });

  it("ignore les null et somme uniquement les valeurs connues", () => {
    expect(sumKnownExpenses(half)).toBe(2100); // 1500 + 600
  });

  it("retourne 0 quand tout est null", () => {
    expect(sumKnownExpenses(allNull)).toBe(0);
  });

  it("inclut les 0 (valeur valide)", () => {
    expect(sumKnownExpenses(withZero)).toBe(2500); // 1500 + 400 + 600 + 0
  });

  it("ignore les négatifs", () => {
    expect(sumKnownExpenses(negative)).toBe(1200); // 400 + 600 + 200, housing -100 ignoré
  });
});

/* -------------------------------------------------------------------------- */
/*  hasAnyKnownExpense                                                         */
/* -------------------------------------------------------------------------- */

describe("hasAnyKnownExpense", () => {
  it("true quand au moins une catégorie renseignée", () => {
    expect(hasAnyKnownExpense(full)).toBe(true);
    expect(hasAnyKnownExpense(half)).toBe(true);
    expect(
      hasAnyKnownExpense({ housing: 0, insurance: null, food: null, transport: null }),
    ).toBe(true);
  });

  it("false quand tout est null", () => {
    expect(hasAnyKnownExpense(allNull)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  Constantes stables                                                         */
/* -------------------------------------------------------------------------- */

describe("ONBOARDING_EXPENSE_TAG", () => {
  it("est une string non-vide stable", () => {
    expect(typeof ONBOARDING_EXPENSE_TAG).toBe("string");
    expect(ONBOARDING_EXPENSE_TAG.length).toBeGreaterThan(0);
  });

  it("vaut exactement '[onboarding]' (locked, ne pas modifier sans migration)", () => {
    expect(ONBOARDING_EXPENSE_TAG).toBe("[onboarding]");
  });
});

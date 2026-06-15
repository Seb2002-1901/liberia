import { describe, it, expect } from "vitest";
import { parseSseProposedAction } from "@/components/coach/proposed-action-types";

/**
 * Sprint Coach IA — validation du parser SSE pour les 4 events
 * propose_*. Le SDK Anthropic valide déjà côté serveur, mais on
 * re-vérifie côté client car le payload transite par le DOM (potentiel
 * tampering / replay).
 */

describe("parseSseProposedAction", () => {
  it("parses propose_expense (variable_one_time)", () => {
    const result = parseSseProposedAction("propose_expense", {
      toolUseId: "tu_1",
      expense_type: "variable_one_time",
      frequency: "one_time",
      amount: 42,
      currency: "CHF",
      label: "Coop",
      category: "food",
      notes: null,
    });
    expect(result).toEqual({
      kind: "expense",
      toolUseId: "tu_1",
      expense_type: "variable_one_time",
      frequency: "one_time",
      amount: 42,
      currency: "CHF",
      label: "Coop",
      category: "food",
      notes: null,
    });
  });

  it("parses propose_expense (fixed_recurring monthly)", () => {
    const result = parseSseProposedAction("propose_expense", {
      toolUseId: "tu_2",
      expense_type: "fixed_recurring",
      frequency: "monthly",
      amount: 1500,
      currency: "CHF",
      label: "Loyer",
      category: "housing",
      notes: "appart",
    });
    expect(result?.kind).toBe("expense");
    if (result?.kind === "expense") {
      expect(result.expense_type).toBe("fixed_recurring");
      expect(result.frequency).toBe("monthly");
      expect(result.notes).toBe("appart");
    }
  });

  it("parses propose_income (monthly salary)", () => {
    const result = parseSseProposedAction("propose_income", {
      toolUseId: "tu_3",
      frequency: "monthly",
      amount: 4800,
      currency: "CHF",
      label: "Salaire",
      category: "salary",
    });
    expect(result).toEqual({
      kind: "income",
      toolUseId: "tu_3",
      frequency: "monthly",
      amount: 4800,
      currency: "CHF",
      label: "Salaire",
      category: "salary",
      notes: null,
    });
  });

  it("parses propose_income (one_time bonus)", () => {
    const result = parseSseProposedAction("propose_income", {
      toolUseId: "tu_4",
      frequency: "one_time",
      amount: 800,
      currency: "CHF",
      label: "Prime",
      category: "salary",
      notes: "13e mois",
    });
    expect(result?.kind).toBe("income");
  });

  it("parses propose_goal (with deadline + currentAmount)", () => {
    const result = parseSseProposedAction("propose_goal", {
      toolUseId: "tu_5",
      title: "Apport maison",
      type: "purchase",
      targetAmount: 20000,
      currentAmount: 3000,
      currency: "CHF",
      deadline: "2028-06-15",
    });
    expect(result).toEqual({
      kind: "goal",
      toolUseId: "tu_5",
      title: "Apport maison",
      type: "purchase",
      targetAmount: 20000,
      currentAmount: 3000,
      currency: "CHF",
      deadline: "2028-06-15",
      notes: null,
    });
  });

  it("parses propose_goal (no deadline / no current)", () => {
    const result = parseSseProposedAction("propose_goal", {
      toolUseId: "tu_6",
      title: "Fonds d'urgence",
      type: "emergency_fund",
      targetAmount: 10000,
      currency: "CHF",
    });
    expect(result?.kind).toBe("goal");
    if (result?.kind === "goal") {
      expect(result.currentAmount).toBe(0);
      expect(result.deadline).toBeNull();
    }
  });

  it("parses propose_budget", () => {
    const result = parseSseProposedAction("propose_budget", {
      toolUseId: "tu_7",
      category: "food",
      monthlyLimit: 500,
      currency: "CHF",
    });
    expect(result).toEqual({
      kind: "budget",
      toolUseId: "tu_7",
      category: "food",
      monthlyLimit: 500,
      currency: "CHF",
    });
  });

  it("rejects unknown event types", () => {
    expect(
      parseSseProposedAction("propose_unicorn", {
        toolUseId: "tu_x",
        whatever: 1,
      }),
    ).toBeNull();
  });

  it("rejects payload without toolUseId", () => {
    expect(
      parseSseProposedAction("propose_expense", {
        expense_type: "variable_one_time",
        frequency: "one_time",
        amount: 42,
        currency: "CHF",
        label: "Coop",
        category: "food",
      }),
    ).toBeNull();
  });

  it("rejects propose_expense with bad frequency", () => {
    expect(
      parseSseProposedAction("propose_expense", {
        toolUseId: "tu_x",
        expense_type: "variable_one_time",
        frequency: "fortnight",
        amount: 42,
        currency: "CHF",
        label: "Coop",
        category: "food",
      }),
    ).toBeNull();
  });

  it("rejects propose_expense with negative amount", () => {
    expect(
      parseSseProposedAction("propose_expense", {
        toolUseId: "tu_x",
        expense_type: "variable_one_time",
        frequency: "one_time",
        amount: -10,
        currency: "CHF",
        label: "Coop",
        category: "food",
      }),
    ).toBeNull();
  });

  it("rejects propose_income with empty label", () => {
    expect(
      parseSseProposedAction("propose_income", {
        toolUseId: "tu_x",
        frequency: "monthly",
        amount: 4800,
        currency: "CHF",
        label: "",
        category: "salary",
      }),
    ).toBeNull();
  });

  it("rejects propose_goal with zero target", () => {
    expect(
      parseSseProposedAction("propose_goal", {
        toolUseId: "tu_x",
        title: "X",
        type: "savings",
        targetAmount: 0,
        currency: "CHF",
      }),
    ).toBeNull();
  });

  it("rejects propose_budget with zero limit", () => {
    expect(
      parseSseProposedAction("propose_budget", {
        toolUseId: "tu_x",
        category: "food",
        monthlyLimit: 0,
        currency: "CHF",
      }),
    ).toBeNull();
  });

  describe("multi-action scenario", () => {
    it("le pattern '5 CHF supermarché, 200 CHF assurance, 800 CHF bureau, +800 salaire' produit 4 actions", () => {
      // Simule ce que /api/ai/chat émettrait pour ce message utilisateur :
      // 3 propose_expense + 1 propose_income en SSE séquentielles.
      const events: Array<[string, Record<string, unknown>]> = [
        [
          "propose_expense",
          {
            toolUseId: "tu_a",
            expense_type: "variable_one_time",
            frequency: "one_time",
            amount: 5,
            currency: "CHF",
            label: "Supermarché",
            category: "food",
          },
        ],
        [
          "propose_expense",
          {
            toolUseId: "tu_b",
            expense_type: "fixed_recurring",
            frequency: "monthly",
            amount: 200,
            currency: "CHF",
            label: "Assurance",
            category: "insurance",
          },
        ],
        [
          "propose_expense",
          {
            toolUseId: "tu_c",
            expense_type: "variable_one_time",
            frequency: "one_time",
            amount: 800,
            currency: "CHF",
            label: "Bureau",
            category: "shopping",
          },
        ],
        [
          "propose_income",
          {
            toolUseId: "tu_d",
            frequency: "one_time",
            amount: 800,
            currency: "CHF",
            label: "Revenu additionnel",
            category: "other",
          },
        ],
      ];
      const parsed = events
        .map(([ev, payload]) => parseSseProposedAction(ev, payload))
        .filter((p): p is NonNullable<typeof p> => p !== null);
      expect(parsed).toHaveLength(4);
      const kinds = parsed.map((p) => p.kind);
      expect(kinds).toEqual(["expense", "expense", "expense", "income"]);
      const expenses = parsed.filter((p) => p.kind === "expense");
      const incomes = parsed.filter((p) => p.kind === "income");
      expect(expenses).toHaveLength(3);
      expect(incomes).toHaveLength(1);
    });
  });
});

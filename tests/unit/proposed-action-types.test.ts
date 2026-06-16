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

  describe("propose_update_goal", () => {
    it("parses with newTargetAmount only", () => {
      const result = parseSseProposedAction("propose_update_goal", {
        toolUseId: "tu_u1",
        match_title: "maison",
        newTargetAmount: 30000,
        currency: "CHF",
      });
      expect(result).toEqual({
        kind: "update_goal",
        toolUseId: "tu_u1",
        match_title: "maison",
        newTargetAmount: 30000,
        newCurrentAmount: null,
        newDeadline: null,
        newTitle: null,
        currency: "CHF",
      });
    });

    it("parses with newDeadline only", () => {
      const result = parseSseProposedAction("propose_update_goal", {
        toolUseId: "tu_u2",
        match_title: "vacances",
        newDeadline: "2028-12-31",
        currency: "CHF",
      });
      expect(result?.kind).toBe("update_goal");
      if (result?.kind === "update_goal") {
        expect(result.newDeadline).toBe("2028-12-31");
        expect(result.newTargetAmount).toBeNull();
      }
    });

    it("rejects no-op update (all fields empty)", () => {
      expect(
        parseSseProposedAction("propose_update_goal", {
          toolUseId: "tu_u3",
          match_title: "x",
          currency: "CHF",
        }),
      ).toBeNull();
    });

    it("rejects empty match_title", () => {
      expect(
        parseSseProposedAction("propose_update_goal", {
          toolUseId: "tu_u4",
          match_title: "",
          newTargetAmount: 1000,
          currency: "CHF",
        }),
      ).toBeNull();
    });
  });

  describe("propose_update_expense", () => {
    it("parses with newAmount + match_label", () => {
      const r = parseSseProposedAction("propose_update_expense", {
        toolUseId: "tu_ue1",
        match_label: "Coop",
        newAmount: 45,
        currency: "CHF",
      });
      expect(r?.kind).toBe("update_expense");
      if (r?.kind === "update_expense") {
        expect(r.newAmount).toBe(45);
        expect(r.newCategory).toBeNull();
      }
    });

    it("rejects no-op", () => {
      expect(
        parseSseProposedAction("propose_update_expense", {
          toolUseId: "tu_ue2",
          match_label: "X",
          currency: "CHF",
        }),
      ).toBeNull();
    });
  });

  describe("propose_delete_expense", () => {
    it("parses with match_label only", () => {
      const r = parseSseProposedAction("propose_delete_expense", {
        toolUseId: "tu_de1",
        match_label: "Netflix",
      });
      expect(r?.kind).toBe("delete_expense");
    });
  });

  describe("propose_update_income", () => {
    it("parses with newAmount", () => {
      const r = parseSseProposedAction("propose_update_income", {
        toolUseId: "tu_ui1",
        match_label: "Salaire",
        newAmount: 5200,
        currency: "CHF",
      });
      expect(r?.kind).toBe("update_income");
    });
  });

  describe("propose_delete_income", () => {
    it("parses", () => {
      const r = parseSseProposedAction("propose_delete_income", {
        toolUseId: "tu_di1",
        match_label: "Freelance Acme",
      });
      expect(r?.kind).toBe("delete_income");
    });
  });

  describe("propose_delete_budget", () => {
    it("parses", () => {
      const r = parseSseProposedAction("propose_delete_budget", {
        toolUseId: "tu_db1",
        category: "leisure",
      });
      expect(r?.kind).toBe("delete_budget");
    });
  });

  describe("propose_add_memory", () => {
    it("parses with goal kind", () => {
      const r = parseSseProposedAction("propose_add_memory", {
        toolUseId: "tu_m1",
        kind: "goal",
        summary: "User wants to buy a motorcycle in 2027",
      });
      expect(r?.kind).toBe("add_memory");
      if (r?.kind === "add_memory") {
        expect(r.memoryKind).toBe("goal");
      }
    });

    it("rejects unknown kind", () => {
      expect(
        parseSseProposedAction("propose_add_memory", {
          toolUseId: "tu_m2",
          kind: "unicorn",
          summary: "x",
        }),
      ).toBeNull();
    });

    it("rejects summary too short", () => {
      expect(
        parseSseProposedAction("propose_add_memory", {
          toolUseId: "tu_m3",
          kind: "goal",
          summary: "x",
        }),
      ).toBeNull();
    });
  });

  describe("propose_toggle_plan_step", () => {
    it("parses completed=true", () => {
      const r = parseSseProposedAction("propose_toggle_plan_step", {
        toolUseId: "tu_t1",
        match_query: "fonds urgence",
        completed: true,
      });
      expect(r?.kind).toBe("toggle_plan_step");
      if (r?.kind === "toggle_plan_step") {
        expect(r.completed).toBe(true);
      }
    });
  });

  describe("propose_delete_goal", () => {
    it("parses with match_title", () => {
      const result = parseSseProposedAction("propose_delete_goal", {
        toolUseId: "tu_d1",
        match_title: "voyage Japon",
      });
      expect(result).toEqual({
        kind: "delete_goal",
        toolUseId: "tu_d1",
        match_title: "voyage Japon",
      });
    });

    it("rejects empty match_title", () => {
      expect(
        parseSseProposedAction("propose_delete_goal", {
          toolUseId: "tu_d2",
          match_title: "",
        }),
      ).toBeNull();
    });
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

import { describe, expect, it } from "vitest";
import {
  PROPOSE_EXPENSE_TOOL,
  PROPOSE_EXPENSE_TOOL_NAME,
} from "@/lib/coach/tools";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

// Phase 3.1 — coach proposed-expense tool. The tool's JSON schema is
// the contract Anthropic uses to validate Sonnet's tool_use input
// before it ever reaches our route handler. If the schema drifts away
// from EXPENSE_CATEGORIES (a category is added/renamed) the model can
// emit categories our server action will reject as invalid. These
// tests lock the alignment.

describe("PROPOSE_EXPENSE_TOOL — Anthropic tool contract", () => {
  it("exposes the stable tool name the route handler matches against", () => {
    expect(PROPOSE_EXPENSE_TOOL.name).toBe(PROPOSE_EXPENSE_TOOL_NAME);
    expect(PROPOSE_EXPENSE_TOOL_NAME).toBe("propose_expense");
  });

  it("declares the six required fields the server action expects", () => {
    // Phase 3.1.2 added expense_type + frequency so the server can
    // tell "rent" (fixed_recurring, monthly) from "Coop" (variable_
    // one_time, one_time) without re-classifying server-side.
    expect(PROPOSE_EXPENSE_TOOL.input_schema.required).toEqual(
      expect.arrayContaining([
        "expense_type",
        "frequency",
        "amount",
        "currency",
        "label",
        "category",
      ]),
    );
  });

  it("constrains expense_type to fixed_recurring | variable_one_time", () => {
    const props = PROPOSE_EXPENSE_TOOL.input_schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    expect(props.expense_type?.enum?.slice().sort()).toEqual([
      "fixed_recurring",
      "variable_one_time",
    ]);
  });

  it("constrains frequency to the four legal cadences", () => {
    const props = PROPOSE_EXPENSE_TOOL.input_schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    expect(props.frequency?.enum?.slice().sort()).toEqual([
      "monthly",
      "one_time",
      "weekly",
      "yearly",
    ]);
  });

  it("exposes a category enum that matches EXPENSE_CATEGORIES one-to-one", () => {
    const schemaProps = PROPOSE_EXPENSE_TOOL.input_schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    const enumValues = schemaProps.category?.enum ?? [];
    const constantIds = EXPENSE_CATEGORIES.map((c) => c.id);
    expect(enumValues.slice().sort()).toEqual(constantIds.slice().sort());
  });

  it("forbids the coach from claiming the expense was saved", () => {
    // The description is the model's primary guidance for when NOT
    // to use the tool. Lock the core constraints so a future edit
    // doesn't accidentally drop the safety wording.
    const desc = PROPOSE_EXPENSE_TOOL.description?.toLowerCase() ?? "";
    expect(desc).toContain("real");
    expect(desc).toContain("never persist");
    expect(desc).toContain("never claim");
    expect(desc).toContain("hypothetical");
    expect(desc).toContain("recurring");
  });
});

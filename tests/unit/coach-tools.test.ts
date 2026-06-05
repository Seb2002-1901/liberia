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

  it("declares the four required fields the server action expects", () => {
    expect(PROPOSE_EXPENSE_TOOL.input_schema.required).toEqual(
      expect.arrayContaining(["amount", "currency", "label", "category"]),
    );
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

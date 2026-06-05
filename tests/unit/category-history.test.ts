import { describe, expect, it } from "vitest";
import { buildCategoryHistory } from "@/lib/calculations/analytics";

// Phase 3.1.3 — category history. Lock the monthly bucketing,
// recurring-vs-one_time semantics, and the trend tag thresholds.

const NOW = new Date("2024-06-15T12:00:00.000Z");

function exp(p: {
  amount: number;
  category?: string;
  frequency?: string;
  created_at?: string;
}) {
  return {
    amount: p.amount,
    category: p.category ?? "food",
    frequency: p.frequency ?? "monthly",
    created_at: p.created_at ?? "2024-06-10T08:00:00.000Z",
  };
}

describe("buildCategoryHistory — monthly bucketing", () => {
  it("places one_time entries in their calendar UTC month", () => {
    const rows = buildCategoryHistory(
      [
        exp({
          amount: 42,
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
        exp({
          amount: 100,
          frequency: "one_time",
          created_at: "2024-04-20T10:00:00.000Z",
        }),
      ],
      3,
      ["food"],
      NOW,
    );
    const food = rows.find((r) => r.category === "food")!;
    // Three months: April (oldest), May, June (latest).
    expect(food.monthly[0]).toBe(100); // April
    expect(food.monthly[1]).toBe(0); // May
    expect(food.monthly[2]).toBe(42); // June
  });

  it("spreads recurring entries across every month in the window", () => {
    const rows = buildCategoryHistory(
      [exp({ amount: 1500, frequency: "monthly", category: "housing" })],
      6,
      ["housing"],
      NOW,
    );
    const housing = rows.find((r) => r.category === "housing")!;
    expect(housing.monthly).toEqual([1500, 1500, 1500, 1500, 1500, 1500]);
    expect(housing.total).toBe(9000);
    expect(housing.average).toBe(1500);
  });

  it("ignores categories outside the requested set", () => {
    const rows = buildCategoryHistory(
      [exp({ amount: 100, category: "transport" })],
      3,
      ["food"],
      NOW,
    );
    const food = rows.find((r) => r.category === "food")!;
    expect(food.total).toBe(0);
    // transport row should not appear since not requested.
    expect(rows.find((r) => r.category === "transport")).toBeUndefined();
  });
});

describe("buildCategoryHistory — trend tag", () => {
  it("tags 'up' when last bucket > 15% over previous", () => {
    const rows = buildCategoryHistory(
      [
        exp({
          amount: 100,
          category: "food",
          frequency: "one_time",
          created_at: "2024-05-15T10:00:00.000Z",
        }),
        exp({
          amount: 200,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-15T10:00:00.000Z",
        }),
      ],
      3,
      ["food"],
      NOW,
    );
    expect(rows.find((r) => r.category === "food")!.trend).toBe("up");
  });

  it("tags 'down' when last bucket < 85% of previous", () => {
    const rows = buildCategoryHistory(
      [
        exp({
          amount: 200,
          category: "food",
          frequency: "one_time",
          created_at: "2024-05-15T10:00:00.000Z",
        }),
        exp({
          amount: 50,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-15T10:00:00.000Z",
        }),
      ],
      3,
      ["food"],
      NOW,
    );
    expect(rows.find((r) => r.category === "food")!.trend).toBe("down");
  });

  it("tags 'flat' for recurring monthly entries (stable across months)", () => {
    const rows = buildCategoryHistory(
      [exp({ amount: 1500, frequency: "monthly", category: "housing" })],
      3,
      ["housing"],
      NOW,
    );
    expect(rows.find((r) => r.category === "housing")!.trend).toBe("flat");
  });
});

describe("buildCategoryHistory — output ordering", () => {
  it("sorts results by total DESC so the page reads top-down", () => {
    const rows = buildCategoryHistory(
      [
        exp({
          amount: 50,
          category: "leisure",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
        exp({
          amount: 800,
          category: "food",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
        exp({
          amount: 200,
          category: "transport",
          frequency: "one_time",
          created_at: "2024-06-10T10:00:00.000Z",
        }),
      ],
      1,
      ["food", "transport", "leisure"],
      NOW,
    );
    expect(rows.map((r) => r.category)).toEqual(["food", "transport", "leisure"]);
  });
});

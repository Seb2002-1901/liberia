import { describe, expect, it } from "vitest";
import { computeExpenseBuckets } from "@/lib/calculations/aggregate";

// Phase 3.1.1 — fixed vs variable split. These tests pin the
// boundary semantics so a future refactor doesn't silently change
// which expense lands in which bucket (the dashboard / coach /
// budget all depend on them matching to the cent).
//
// All "now" values are injected so the tests don't break at month
// boundaries on the wall clock.

const NOW = new Date("2024-06-15T12:00:00.000Z");

function exp(
  partial: Partial<{
    amount: number;
    frequency: string;
    created_at: string;
  }>,
) {
  return {
    amount: partial.amount ?? 100,
    frequency: partial.frequency ?? "monthly",
    created_at: partial.created_at ?? "2024-06-10T08:00:00.000Z",
  };
}

describe("computeExpenseBuckets — fixed bucket (recurring)", () => {
  it("sums monthly entries at face value", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({ amount: 1500, frequency: "monthly" }),
        exp({ amount: 200, frequency: "monthly" }),
      ],
      { now: NOW },
    );
    expect(buckets.fixed).toBe(1700);
    expect(buckets.variable).toBe(0);
    expect(buckets.total).toBe(1700);
    expect(buckets.transactions).toBe(0);
  });

  it("prorates weekly entries to monthly (52/12 ≈ 4.333)", () => {
    const buckets = computeExpenseBuckets(
      [exp({ amount: 30, frequency: "weekly" })],
      { now: NOW },
    );
    expect(buckets.fixed).toBeCloseTo(130, 5);
  });

  it("prorates yearly entries to monthly (1/12)", () => {
    const buckets = computeExpenseBuckets(
      [exp({ amount: 1200, frequency: "yearly" })],
      { now: NOW },
    );
    expect(buckets.fixed).toBe(100);
  });

  it("falls back to multiplier 1 on unknown frequency (same as totalMonthly)", () => {
    const buckets = computeExpenseBuckets(
      [exp({ amount: 50, frequency: "wat" })],
      { now: NOW },
    );
    expect(buckets.fixed).toBe(50);
  });
});

describe("computeExpenseBuckets — variable bucket (one_time, current month)", () => {
  it("includes one_time entries created within the current UTC month", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({
          amount: 42,
          frequency: "one_time",
          created_at: "2024-06-15T10:00:00.000Z",
        }),
        exp({
          amount: 68,
          frequency: "one_time",
          created_at: "2024-06-01T00:00:00.000Z",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.variable).toBe(110);
    expect(buckets.transactions).toBe(2);
    expect(buckets.fixed).toBe(0);
  });

  it("excludes one_time entries from PRIOR months", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({
          amount: 200,
          frequency: "one_time",
          created_at: "2024-05-31T23:59:59.000Z",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.variable).toBe(0);
    expect(buckets.transactions).toBe(0);
  });

  it("excludes one_time entries from FUTURE months", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({
          amount: 200,
          frequency: "one_time",
          created_at: "2024-07-01T00:00:00.000Z",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.variable).toBe(0);
    expect(buckets.transactions).toBe(0);
  });

  it("treats the FIRST and LAST second of the month as IN range", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({
          amount: 5,
          frequency: "one_time",
          created_at: "2024-06-01T00:00:00.000Z",
        }),
        exp({
          amount: 7,
          frequency: "one_time",
          created_at: "2024-06-30T23:59:59.999Z",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.variable).toBe(12);
    expect(buckets.transactions).toBe(2);
  });

  it("skips entries with unparseable created_at", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({
          amount: 99,
          frequency: "one_time",
          created_at: "not-a-date",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.variable).toBe(0);
    expect(buckets.transactions).toBe(0);
  });
});

describe("computeExpenseBuckets — total invariant", () => {
  it("always equals fixed + variable (mixed real-world data)", () => {
    const buckets = computeExpenseBuckets(
      [
        exp({ amount: 1500, frequency: "monthly" }),
        exp({ amount: 30, frequency: "weekly" }),
        exp({ amount: 1200, frequency: "yearly" }),
        exp({
          amount: 42,
          frequency: "one_time",
          created_at: "2024-06-10T08:00:00.000Z",
        }),
        exp({
          amount: 68,
          frequency: "one_time",
          created_at: "2024-06-12T08:00:00.000Z",
        }),
        // out-of-month one_time — must not pollute
        exp({
          amount: 999,
          frequency: "one_time",
          created_at: "2024-04-01T00:00:00.000Z",
        }),
      ],
      { now: NOW },
    );
    expect(buckets.fixed).toBeCloseTo(1500 + 130 + 100, 5);
    expect(buckets.variable).toBe(110);
    expect(buckets.total).toBeCloseTo(buckets.fixed + buckets.variable, 5);
    expect(buckets.transactions).toBe(2);
  });

  it("returns all-zero on empty input", () => {
    expect(computeExpenseBuckets([], { now: NOW })).toEqual({
      fixed: 0,
      variable: 0,
      total: 0,
      transactions: 0,
    });
  });
});

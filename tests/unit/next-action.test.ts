import { describe, expect, it } from "vitest";
import { computeNextAction } from "@/lib/calculations/next-action";
import type { CompletenessResult } from "@/lib/calculations/completeness";
import type { Opportunity } from "@/lib/calculations/opportunities";

// Phase 3.1.7 — single next action derivation. Lock the priority
// ladder so a future tweak doesn't silently change which rule
// captures the dashboard's headline CTA.

function completeness(
  reliability: CompletenessResult["reliability"],
  partial: Partial<CompletenessResult> = {},
): CompletenessResult {
  return {
    score: partial.score ?? 0,
    structurelle: partial.structurelle ?? (reliability === "high" ? 100 : 50),
    detaillee: partial.detaillee ?? 0,
    optimale: partial.optimale ?? 0,
    detected: partial.detected ?? [],
    missing: partial.missing ?? [],
    reliability,
    canEstimateSavings: partial.canEstimateSavings ?? false,
  };
}

function opp(
  kind: Opportunity["kind"],
  priority: Opportunity["priority"],
  monthlyImpact: number,
): Opportunity {
  return {
    kind,
    priority,
    payload: { category: "food", amount: 100, limit: 200 },
    monthlyImpact,
    yearlyImpact: monthlyImpact * 12,
    action: "x",
  };
}

describe("computeNextAction — priority ladder", () => {
  it("rule 1: completion gate fires whenever reliability is not high (LOW)", () => {
    const next = computeNextAction({
      completeness: completeness("low"),
      opportunities: [opp("budget_over", "high", 200)],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.kind).toBe("complete_profile");
    expect(next.priority).toBe("high");
    expect(next.cta?.type).toBe("openCompletion");
  });

  it("rule 1: completion gate fires when reliability is medium too", () => {
    const next = computeNextAction({
      completeness: completeness("medium"),
      opportunities: [opp("budget_over", "high", 200)],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.kind).toBe("complete_profile");
    expect(next.bodyKey).toBe("complete_profile.bodyMedium");
  });

  it("rule 2: top opportunity with monthly impact wins once reliability is high", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [
        opp("low_emergency_fund", "high", 0), // qualitative, no $
        opp("budget_over", "high", 200), // concrete
      ],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.kind).toBe("act_on_opportunity");
    expect(next.monthlyImpact).toBe(200);
    expect(next.priority).toBe("high");
  });

  it("rule 2: skips zero-impact opportunities (no chiffré 0)", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [opp("low_emergency_fund", "high", 0)],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.kind).not.toBe("act_on_opportunity");
  });

  it("rule 4: builds emergency fund when runway < 1 and no actionable opportunity", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [opp("low_emergency_fund", "high", 0)],
      runwayMonths: 0.5,
      goalCount: 1,
    });
    expect(next.kind).toBe("build_emergency_fund");
    expect(next.priority).toBe("high");
  });

  it("rule 5: nudges to set a first goal when nothing's wrong", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [],
      runwayMonths: 6,
      goalCount: 0,
    });
    expect(next.kind).toBe("set_first_goal");
    expect(next.priority).toBe("low");
  });

  it("rule 6: continue (healthy default) — all axes happy", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [],
      runwayMonths: 6,
      goalCount: 2,
    });
    expect(next.kind).toBe("continue");
    expect(next.cta).toBeNull();
  });
});

describe("computeNextAction — CTA shape", () => {
  it("complete_profile triggers the in-app completion assistant (not a navigation)", () => {
    const next = computeNextAction({
      completeness: completeness("low"),
      opportunities: [],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.cta).toEqual({
      type: "openCompletion",
      labelKey: "complete_profile.cta",
    });
  });

  it("act_on_opportunity sends the user to /expenses/analytics", () => {
    const next = computeNextAction({
      completeness: completeness("high"),
      opportunities: [opp("budget_over", "high", 200)],
      runwayMonths: 6,
      goalCount: 1,
    });
    expect(next.cta).toEqual({
      type: "navigate",
      href: "/expenses/analytics",
      labelKey: "act_on_opportunity.cta",
    });
  });
});

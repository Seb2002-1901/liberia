import { describe, expect, it } from "vitest";
import { planSchema, planStepSchema } from "@/lib/ai/plan-schema";

describe("planStepSchema", () => {
  it("accepts a valid step", () => {
    const res = planStepSchema.safeParse({
      week_number: 1,
      focus: "Réduire les abonnements",
      title: "Lister tous les abonnements actifs",
      description: "Pose-les à plat : netflix, salle de sport, etc.",
      category: "reduce_expense",
      expected_impact_eur: 30,
    });
    expect(res.success).toBe(true);
  });

  it("rejects week_number > 13", () => {
    const res = planStepSchema.safeParse({
      week_number: 20,
      focus: "x",
      title: "y",
      category: "other",
    });
    expect(res.success).toBe(false);
  });

  it("defaults category to 'other'", () => {
    const res = planStepSchema.safeParse({
      week_number: 1,
      focus: "x",
      title: "y",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.category).toBe("other");
  });
});

describe("planSchema", () => {
  it("requires >=3 steps", () => {
    const res = planSchema.safeParse({
      title: "Plan",
      summary: "Résumé",
      steps: [
        { week_number: 1, focus: "x", title: "y", category: "other" },
        { week_number: 1, focus: "x", title: "y", category: "other" },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("caps steps at 40", () => {
    const steps = Array.from({ length: 41 }, (_, i) => ({
      week_number: 1,
      focus: "x",
      title: "y",
      category: "other" as const,
    }));
    const res = planSchema.safeParse({
      title: "Plan",
      summary: "Résumé",
      steps,
    });
    expect(res.success).toBe(false);
  });
});

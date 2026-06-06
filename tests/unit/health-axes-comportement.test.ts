import { describe, expect, it } from "vitest";
import { computeComportement } from "@/lib/calculations/health/axes/comportement";

describe("computeComportement", () => {
  it("returns UNKNOWN within onboarding grace (≤ 14 days)", () => {
    const r = computeComportement({
      txCount30d: 0,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 5,
    });
    expect(r.confidence).toBe("UNKNOWN");
  });

  it("returns LOW after grace if no engagement", () => {
    const r = computeComportement({
      txCount30d: 0,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 30,
    });
    expect(r.confidence).toBe("LOW");
    expect(r.score).toBe(0);
  });

  it("HIGH at 5+ engagement units", () => {
    const r = computeComportement({
      txCount30d: 5,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 60,
    });
    expect(r.confidence).toBe("HIGH");
    // engagement = 5, score = 20
    expect(r.score).toBe(20);
  });

  it("MEDIUM between 1-4 engagement units", () => {
    const r = computeComportement({
      txCount30d: 2,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 60,
    });
    expect(r.confidence).toBe("MEDIUM");
    expect(r.score).toBe(8);
  });

  it("weights coach messages at 0.5", () => {
    const r = computeComportement({
      txCount30d: 0,
      coachMsg30d: 4,
      memoryEntries30d: 0,
      accountAgeDays: 60,
    });
    // engagement = 2, score = 8
    expect(r.score).toBe(8);
  });

  it("weights memory entries at 2", () => {
    const r = computeComportement({
      txCount30d: 0,
      coachMsg30d: 0,
      memoryEntries30d: 3,
      accountAgeDays: 60,
    });
    // engagement = 6, score = 24
    expect(r.score).toBe(24);
  });

  it("saturates at 25 engagement units", () => {
    const r = computeComportement({
      txCount30d: 50,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 60,
    });
    expect(r.score).toBe(100);
  });

  it("Profile B — 18 tx / month, HIGH", () => {
    const r = computeComportement({
      txCount30d: 18,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 90,
    });
    // 18 × 4 = 72
    expect(r.score).toBe(72);
    expect(r.confidence).toBe("HIGH");
  });

  it("Profile J — inactive for 60 days, drops to LOW score", () => {
    const r = computeComportement({
      txCount30d: 0,
      coachMsg30d: 0,
      memoryEntries30d: 0,
      accountAgeDays: 150,
    });
    expect(r.score).toBe(0);
    expect(r.confidence).toBe("LOW");
  });

  it("stores raw inputs in components", () => {
    const r = computeComportement({
      txCount30d: 8,
      coachMsg30d: 2,
      memoryEntries30d: 1,
      accountAgeDays: 90,
    });
    expect(r.components.tx_count).toBe(8);
    expect(r.components.coach_msg).toBe(2);
    expect(r.components.memory_entries).toBe(1);
  });
});

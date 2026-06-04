import { describe, expect, it } from "vitest";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";

// The coach is a budget-coaching surface, not a regulated financial
// adviser. The prompt is the contract — if any future edit silently
// drops the guardrails (regulated-advice refusal, no-yield-promises,
// pro-redirect for off-scope questions), this test fails before ship.

describe("COACH_SYSTEM_PROMPT — guardrails are non-negotiable", () => {
  const prompt = COACH_SYSTEM_PROMPT.toLowerCase();

  it("identifies the coach as LIBERIA's coach, not a financial adviser", () => {
    expect(COACH_SYSTEM_PROMPT).toContain("LIBERIA");
    expect(prompt).toContain("pas un conseiller financier");
  });

  it("refuses regulated investment advice", () => {
    // Any one of these patterns suffices — they all signal a refusal
    // around investment specifics.
    expect(prompt).toMatch(/conseil en investissement|allocations|etf|crypto|immobilier locatif/);
    expect(prompt).toContain("réglementé");
  });

  it("refuses tax / legal / accounting specifics", () => {
    expect(prompt).toMatch(/fiscal/);
    expect(prompt).toMatch(/juridique/);
  });

  it("refuses yield / return / market-timing promises", () => {
    expect(prompt).toMatch(/rendement|garantie|garanti|capital garanti|timing de marché/);
  });

  it("redirects off-scope questions to a qualified professional", () => {
    expect(prompt).toMatch(/professionnel agréé|expert-comptable|conseiller/);
  });

  it("forbids inventing numbers — must cite the finance context", () => {
    expect(prompt).toMatch(/n['' ]invente jamais|n'invente jamais/);
  });

  it("stays calm, non-judgmental, non-alarmist", () => {
    expect(prompt).toMatch(/calme/);
    expect(prompt).toMatch(/jamais culpabilisant/);
    expect(prompt).toMatch(/jamais alarmiste/);
  });

  it("formats amounts in the user's currency (CHF default)", () => {
    expect(prompt).toMatch(/devise/);
    expect(prompt).toMatch(/chf/);
  });
});

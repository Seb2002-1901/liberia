import { describe, expect, it } from "vitest";
import {
  parseAndValidate,
  shouldRunExtraction,
} from "@/lib/ai/memory-extractor";

// Phase 2 — premium memory. These tests lock the pure extraction
// logic: the threshold heuristic that decides WHETHER to call the
// extractor at all, and the JSON parser that turns the raw Haiku
// response into validated entries. We never call Anthropic here —
// these are deterministic functions over strings.

describe("shouldRunExtraction — skip short / cheap exchanges", () => {
  const longUser = "Je veux acheter une maison à Lausanne d'ici 3 ans, j'ai déjà 25k mis de côté";
  const longReply =
    "Excellent objectif. Pour t'aider, faisons d'abord le point sur ton apport actuel et le coût total visé. À Lausanne, un T3 raisonnable tourne autour de 800k CHF, ce qui demande typiquement 160k d'apport.";

  it("returns true when both sides are substantive", () => {
    expect(
      shouldRunExtraction({
        userMessage: longUser,
        assistantReply: longReply,
        locale: "fr",
      }),
    ).toBe(true);
  });

  it("skips when the user message is below 30 chars", () => {
    expect(
      shouldRunExtraction({
        userMessage: "Merci !",
        assistantReply: longReply,
        locale: "fr",
      }),
    ).toBe(false);
  });

  it("skips when the assistant reply is below 100 chars", () => {
    expect(
      shouldRunExtraction({
        userMessage: longUser,
        assistantReply: "OK, compris.",
        locale: "fr",
      }),
    ).toBe(false);
  });
});

describe("parseAndValidate — robust to messy Haiku output", () => {
  it("parses a clean JSON array", () => {
    const raw = JSON.stringify([
      {
        kind: "goal",
        key: "buy_house",
        summary: "Acheter une maison à Lausanne d'ici 3 ans.",
        importance: 5,
        confidence: 5,
      },
    ]);
    const entries = parseAndValidate(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("goal");
    expect(entries[0].key).toBe("buy_house");
    expect(entries[0].importance).toBe(5);
  });

  it("returns [] on empty array", () => {
    expect(parseAndValidate("[]")).toEqual([]);
  });

  it("returns [] on empty string", () => {
    expect(parseAndValidate("")).toEqual([]);
    expect(parseAndValidate("   ")).toEqual([]);
  });

  it("strips ```json fences", () => {
    const raw = '```json\n[{"kind":"preference","key":"likes_simple","summary":"Préfère les explications simples.","importance":3,"confidence":4}]\n```';
    const entries = parseAndValidate(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("preference");
  });

  it("survives surrounding prose", () => {
    const raw =
      'Here is the array: [{"kind":"event","key":"salary_raise","summary":"Salaire augmenté de 8%.","importance":4,"confidence":5,"expires_in_days":180}] hope this helps';
    const entries = parseAndValidate(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].expiresInDays).toBe(180);
  });

  it("drops invalid entries silently", () => {
    const raw = JSON.stringify([
      { kind: "goal", key: "valid", summary: "OK", importance: 5, confidence: 5 },
      { kind: "invalid_kind", key: "x", summary: "y" },
      { key: "no_kind", summary: "y", importance: 3, confidence: 3 },
      { kind: "goal", summary: "no key", importance: 3, confidence: 3 },
      { kind: "goal", key: "no_summary", importance: 3, confidence: 3 },
    ]);
    const entries = parseAndValidate(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe("valid");
  });

  it("caps at MAX_EXTRACTIONS (3)", () => {
    const raw = JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({
        kind: "goal",
        key: `key_${i}`,
        summary: `Summary ${i}`,
        importance: 3,
        confidence: 3,
      })),
    );
    const entries = parseAndValidate(raw);
    expect(entries).toHaveLength(3);
  });

  it("clamps importance and confidence into [1, 5]", () => {
    const raw = JSON.stringify([
      {
        kind: "goal",
        key: "x",
        summary: "test",
        importance: 99,
        confidence: -3,
      },
    ]);
    const entries = parseAndValidate(raw);
    expect(entries[0].importance).toBe(5);
    expect(entries[0].confidence).toBe(1);
  });

  it("normalizes keys to safe snake_case slugs", () => {
    const raw = JSON.stringify([
      {
        kind: "goal",
        key: "Buy a HOUSE! (in Lausanne)",
        summary: "test",
        importance: 3,
        confidence: 3,
      },
    ]);
    const entries = parseAndValidate(raw);
    expect(entries[0].key).toBe("buy_a_house_in_lausanne");
  });

  it("returns [] on malformed JSON", () => {
    expect(parseAndValidate("{not valid")).toEqual([]);
    expect(parseAndValidate("not even json")).toEqual([]);
  });

  it("truncates oversized summary / detail", () => {
    const longSummary = "x".repeat(500);
    const longDetail = "y".repeat(1500);
    const raw = JSON.stringify([
      {
        kind: "goal",
        key: "x",
        summary: longSummary,
        detail: longDetail,
        importance: 3,
        confidence: 3,
      },
    ]);
    const entries = parseAndValidate(raw);
    expect(entries[0].summary.length).toBe(280);
    expect(entries[0].detail?.length).toBe(1000);
  });

  it("treats missing expires_in_days as evergreen (null)", () => {
    const raw = JSON.stringify([
      { kind: "goal", key: "x", summary: "y", importance: 3, confidence: 3 },
    ]);
    expect(parseAndValidate(raw)[0].expiresInDays).toBeNull();
  });
});

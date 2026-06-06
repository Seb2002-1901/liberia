import { describe, expect, it } from "vitest";
import {
  clamp,
  isoWeekString,
  latestSealableWeek,
  round,
  roundInt,
  subtractIsoWeeks,
  toUserTimezone,
} from "@/lib/calculations/health/utils";

// Phase 3.2 — utility primitives of the FHS pipeline. Every other
// layer depends on these, so they get the strictest tests.

describe("clamp", () => {
  it("returns value when within bounds", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it("returns min when below", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });
  it("returns max when above", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
  it("returns min on NaN — never NaN", () => {
    expect(clamp(Number.NaN, 0, 100)).toBe(0);
  });
});

describe("roundInt and round", () => {
  it("snaps to nearest integer", () => {
    expect(roundInt(0.4)).toBe(0);
    expect(roundInt(0.5)).toBe(1);
    // Math.round(-0.5) is -0 in JS — treat both signs of zero as zero.
    expect(Math.abs(roundInt(-0.5))).toBe(0);
    expect(roundInt(-1.5)).toBe(-1);
  });
  it("rounds to N decimals", () => {
    expect(round(1.236, 2)).toBe(1.24);
    expect(round(1.234, 2)).toBe(1.23);
  });
});

describe("isoWeekString", () => {
  // ISO week reference dates — checked against Date manually.

  it("returns week 23 of 2026 for a midweek June date", () => {
    // 2026-06-04 (Thursday) → ISO week 2026-W23
    const d = new Date("2026-06-04T12:00:00Z");
    expect(isoWeekString(d)).toBe("2026-W23");
  });

  it("handles year boundary — late December belongs to next year W1", () => {
    // 2024-12-30 (Monday) is ISO 2025-W01
    const d = new Date("2024-12-30T12:00:00Z");
    expect(isoWeekString(d)).toBe("2025-W01");
  });

  it("handles year boundary — early January belongs to previous year", () => {
    // 2023-01-01 (Sunday) is ISO 2022-W52
    const d = new Date("2023-01-01T12:00:00Z");
    expect(isoWeekString(d)).toBe("2022-W52");
  });

  it("pads single-digit week to two characters", () => {
    // 2026-01-05 (Monday) → ISO 2026-W02
    const d = new Date("2026-01-05T12:00:00Z");
    expect(isoWeekString(d)).toBe("2026-W02");
  });
});

describe("subtractIsoWeeks", () => {
  it("decrements within the same year", () => {
    expect(subtractIsoWeeks("2026-W23", 1)).toBe("2026-W22");
    expect(subtractIsoWeeks("2026-W23", 4)).toBe("2026-W19");
  });

  it("crosses the year boundary", () => {
    expect(subtractIsoWeeks("2026-W02", 3)).toBe("2025-W51");
  });

  it("is round-trip stable with isoWeekString", () => {
    // 4 weeks before W23 of 2026 should be W19
    const week = "2026-W23";
    const earlier = subtractIsoWeeks(week, 4);
    expect(earlier).toBe("2026-W19");
  });

  it("throws on a malformed input", () => {
    expect(() => subtractIsoWeeks("not-a-week", 1)).toThrow();
  });
});

describe("toUserTimezone", () => {
  it("shifts UTC date to local wall-clock fields (Tokyo)", () => {
    // 2026-06-06 12:00 UTC = 2026-06-06 21:00 in Tokyo (UTC+9)
    const utc = new Date("2026-06-06T12:00:00Z");
    const local = toUserTimezone(utc, "Asia/Tokyo");
    expect(local.getUTCDate()).toBe(6);
    expect(local.getUTCHours()).toBe(21);
  });

  it("shifts UTC date to local wall-clock fields (Zurich, winter)", () => {
    // 2026-01-15 12:00 UTC = 2026-01-15 13:00 in Zurich (UTC+1)
    const utc = new Date("2026-01-15T12:00:00Z");
    const local = toUserTimezone(utc, "Europe/Zurich");
    expect(local.getUTCDate()).toBe(15);
    expect(local.getUTCHours()).toBe(13);
  });

  it("falls back gracefully on an unknown timezone", () => {
    const utc = new Date("2026-06-06T12:00:00Z");
    const local = toUserTimezone(utc, "Not/A_Real_Zone");
    expect(local.getTime()).toBe(utc.getTime());
  });
});

describe("latestSealableWeek", () => {
  // The boundary is Sunday 23:00 local. Before that boundary, the
  // current week's snapshot is not yet eligible.

  it("on Sunday 22:00 local, returns the previous week", () => {
    // We feed it a date whose UTC fields ARE the local wall-clock —
    // mirrors what toUserTimezone() returns.
    // 2026-06-07 is a Sunday.
    const sundayBefore = new Date("2026-06-07T22:00:00Z");
    expect(latestSealableWeek(sundayBefore)).toBe("2026-W22");
  });

  it("on Sunday 23:00 local, seals the current week", () => {
    const sundayAt23 = new Date("2026-06-07T23:00:00Z");
    expect(latestSealableWeek(sundayAt23)).toBe("2026-W23");
  });

  it("on Monday morning, returns the just-completed week", () => {
    // 2026-06-08 is Monday — week W24 starts. Just-completed: W23.
    const monday = new Date("2026-06-08T08:00:00Z");
    expect(latestSealableWeek(monday)).toBe("2026-W23");
  });

  it("on Saturday afternoon, returns last week (current not done)", () => {
    // 2026-06-13 is Saturday of W24. W24 not sealable yet.
    const saturday = new Date("2026-06-13T15:00:00Z");
    expect(latestSealableWeek(saturday)).toBe("2026-W23");
  });
});

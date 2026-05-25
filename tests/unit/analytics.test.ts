import { afterEach, describe, expect, it } from "vitest";
import { _setTrackerSink, track } from "@/lib/analytics/tracker";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import {
  computeActivationScore,
  deriveUserStage,
} from "@/lib/analytics/journey";
import { isAnalyticsOptedOut } from "@/lib/analytics/privacy";

describe("tracker — no-op by default", () => {
  it("does not throw when no sink is registered", async () => {
    await expect(
      track({ name: "dashboard_opened", properties: {} }),
    ).resolves.toBeUndefined();
  });

  it("never crashes the caller even if the sink throws", async () => {
    const teardown = _setTrackerSink(() => {
      throw new Error("boom");
    });
    try {
      await expect(
        track({ name: "dashboard_opened", properties: {} }),
      ).resolves.toBeUndefined();
    } finally {
      teardown();
    }
  });
});

describe("tracker — sink injection (for tests / future provider)", () => {
  afterEach(() => {
    _setTrackerSink(null);
  });

  it("forwards events when a sink is registered", async () => {
    const captured: { event: AnalyticsEvent; userId?: string }[] = [];
    _setTrackerSink((event, ctx) => {
      captured.push({ event, userId: ctx.userId });
    });
    await track(
      {
        name: "onboarding_completed",
        properties: { situation: "tight", mainGoal: "emergency_fund", behaviorTraitCount: 2 },
      },
      { userId: "user-1" },
    );
    expect(captured).toHaveLength(1);
    expect(captured[0].event.name).toBe("onboarding_completed");
    expect(captured[0].userId).toBe("user-1");
  });

  it("respects the optedOut flag even when a sink is registered", async () => {
    let calls = 0;
    _setTrackerSink(() => {
      calls += 1;
    });
    await track(
      { name: "dashboard_opened", properties: {} },
      { userId: "u", optedOut: true },
    );
    expect(calls).toBe(0);
  });

  it("forwards only enum-ish / count-ish data — no PII", async () => {
    let captured: AnalyticsEvent | null = null;
    _setTrackerSink((event) => {
      captured = event;
    });
    await track(
      {
        name: "coach_message_sent",
        properties: { messageLength: 42, useLLM: false },
      },
      { userId: "user-1" },
    );
    // Properties carry no email / name / amount / raw content.
    const blob = JSON.stringify(captured);
    expect(blob).not.toMatch(/@|email|firstName|amount/i);
  });
});

describe("privacy — opt-out helper", () => {
  it("returns false on missing / undefined settings (default: opted in)", () => {
    expect(isAnalyticsOptedOut(null)).toBe(false);
    expect(isAnalyticsOptedOut(undefined)).toBe(false);
  });

  it("returns true only when the user explicitly toggled off", () => {
    expect(isAnalyticsOptedOut({ analytics_opt_out: false })).toBe(false);
    expect(isAnalyticsOptedOut({ analytics_opt_out: true })).toBe(true);
  });
});

describe("journey — user stage", () => {
  const NOW = new Date("2025-05-15T12:00:00Z");
  const ONE_DAY_AGO_MS = new Date("2025-05-14T12:00:00Z").getTime();
  const TWENTY_DAYS_AGO_MS = new Date("2025-04-25T12:00:00Z").getTime();

  it("labels a brand-new account as 'new'", () => {
    expect(
      deriveUserStage({
        onboardingCompleted: false,
        subscriptionStatus: null,
        lastActivityMs: ONE_DAY_AGO_MS,
        now: NOW,
      }),
    ).toBe("new");
  });

  it("labels an onboarded but unpaid account as 'onboarded'", () => {
    expect(
      deriveUserStage({
        onboardingCompleted: true,
        subscriptionStatus: null,
        lastActivityMs: ONE_DAY_AGO_MS,
        now: NOW,
      }),
    ).toBe("onboarded");
  });

  it("labels active subscription as 'active'", () => {
    expect(
      deriveUserStage({
        onboardingCompleted: true,
        subscriptionStatus: "active",
        lastActivityMs: ONE_DAY_AGO_MS,
        now: NOW,
      }),
    ).toBe("active");
  });

  it("labels canceled / past_due / paused as 'lapsed'", () => {
    for (const status of ["canceled", "past_due", "unpaid", "paused", "incomplete_expired"]) {
      expect(
        deriveUserStage({
          onboardingCompleted: true,
          subscriptionStatus: status,
          lastActivityMs: ONE_DAY_AGO_MS,
          now: NOW,
        }),
      ).toBe("lapsed");
    }
  });

  it("overrides every billing stage with 'inactive' after 14+ days idle", () => {
    expect(
      deriveUserStage({
        onboardingCompleted: true,
        subscriptionStatus: "active",
        lastActivityMs: TWENTY_DAYS_AGO_MS,
        now: NOW,
      }),
    ).toBe("inactive");
  });
});

describe("journey — activation score", () => {
  it("scores 0 for a fresh account", () => {
    const snap = computeActivationScore({
      onboardingCompleted: false,
      hasIncome: false,
      hasExpense: false,
      hasGoal: false,
      hasPlan: false,
      hasCoachMessage: false,
    });
    expect(snap.score).toBe(0);
    expect(snap.signals).toHaveLength(0);
  });

  it("scores 100 when all 6 milestones are crossed", () => {
    const snap = computeActivationScore({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpense: true,
      hasGoal: true,
      hasPlan: true,
      hasCoachMessage: true,
    });
    expect(snap.score).toBe(100);
    expect(snap.signals).toHaveLength(6);
  });

  it("scores ~50 at half the milestones", () => {
    const snap = computeActivationScore({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpense: true,
      hasGoal: false,
      hasPlan: false,
      hasCoachMessage: false,
    });
    expect(snap.score).toBe(50);
    expect(snap.signals).toEqual(["onboardingCompleted", "hasIncome", "hasExpense"]);
  });
});

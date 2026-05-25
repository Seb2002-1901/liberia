import { describe, expect, it } from "vitest";
import {
  inferBillingState,
  type SubscriptionView,
} from "@/lib/billing/state";

const NOW = new Date("2025-05-15T12:00:00Z");

function sub(overrides: Partial<SubscriptionView> = {}): SubscriptionView {
  return {
    status: null,
    trial_ends_at: null,
    current_period_end: null,
    cancel_at_period_end: false,
    ...overrides,
  };
}

describe("inferBillingState — never-subscribed user", () => {
  it("returns 'none' when status is null", () => {
    expect(inferBillingState(sub(), NOW)).toEqual({ kind: "none" });
  });
});

describe("inferBillingState — trialing", () => {
  it("returns 'trial' with daysLeft computed from trial_ends_at", () => {
    const result = inferBillingState(
      sub({
        status: "trialing",
        trial_ends_at: "2025-05-20T12:00:00Z", // +5 days
      }),
      NOW,
    );
    expect(result.kind).toBe("trial");
    if (result.kind === "trial") {
      expect(result.daysLeft).toBe(5);
      expect(result.cancelAtPeriodEnd).toBe(false);
    }
  });

  it("clamps daysLeft to 0 when trial_ends_at is in the past", () => {
    const result = inferBillingState(
      sub({
        status: "trialing",
        trial_ends_at: "2025-05-10T12:00:00Z", // -5 days
      }),
      NOW,
    );
    if (result.kind === "trial") {
      expect(result.daysLeft).toBe(0);
    }
  });

  it("returns 'trial' with daysLeft null when trial_ends_at is missing (legacy)", () => {
    const result = inferBillingState(
      sub({ status: "trialing", trial_ends_at: null }),
      NOW,
    );
    expect(result.kind).toBe("trial");
    if (result.kind === "trial") {
      expect(result.daysLeft).toBeNull();
      expect(result.trialEndsAt).toBeNull();
    }
  });

  it("propagates cancel_at_period_end on a trialing subscription", () => {
    const result = inferBillingState(
      sub({
        status: "trialing",
        trial_ends_at: "2025-05-20T12:00:00Z",
        cancel_at_period_end: true,
      }),
      NOW,
    );
    if (result.kind === "trial") {
      expect(result.cancelAtPeriodEnd).toBe(true);
    }
  });
});

describe("inferBillingState — active", () => {
  it("returns 'active' with next renewal and cancellation flag", () => {
    const result = inferBillingState(
      sub({
        status: "active",
        current_period_end: "2025-06-15T12:00:00Z",
        cancel_at_period_end: false,
      }),
      NOW,
    );
    expect(result).toEqual({
      kind: "active",
      currentPeriodEnd: "2025-06-15T12:00:00Z",
      cancelAtPeriodEnd: false,
    });
  });

  it("keeps 'active' even when cancellation is programmed (grace period)", () => {
    const result = inferBillingState(
      sub({
        status: "active",
        current_period_end: "2025-06-15T12:00:00Z",
        cancel_at_period_end: true,
      }),
      NOW,
    );
    expect(result.kind).toBe("active");
    if (result.kind === "active") {
      expect(result.cancelAtPeriodEnd).toBe(true);
    }
  });
});

describe("inferBillingState — payment failure", () => {
  it("returns 'past_due' for status='past_due'", () => {
    const result = inferBillingState(sub({ status: "past_due" }), NOW);
    expect(result.kind).toBe("past_due");
  });

  it("returns 'past_due' for status='unpaid'", () => {
    const result = inferBillingState(sub({ status: "unpaid" }), NOW);
    expect(result.kind).toBe("past_due");
  });
});

describe("inferBillingState — lapsed", () => {
  it("returns 'lapsed' for canceled / paused / incomplete*", () => {
    for (const status of [
      "canceled",
      "paused",
      "incomplete",
      "incomplete_expired",
    ]) {
      const result = inferBillingState(sub({ status }), NOW);
      expect(result.kind).toBe("lapsed");
      if (result.kind === "lapsed") {
        expect(result.status).toBe(status);
      }
    }
  });

  it("returns 'lapsed' for unknown future Stripe statuses (defensive)", () => {
    const result = inferBillingState(sub({ status: "some_new_status" }), NOW);
    expect(result.kind).toBe("lapsed");
  });
});

describe("inferBillingState — never emits NaN / undefined / null in strings", () => {
  it("returns a valid JSON-serializable BillingState in every branch", () => {
    const allInputs: SubscriptionView[] = [
      sub(),
      sub({ status: "trialing", trial_ends_at: "2025-05-20T12:00:00Z" }),
      sub({ status: "active", current_period_end: "2025-06-15T12:00:00Z" }),
      sub({ status: "past_due" }),
      sub({ status: "canceled" }),
      sub({ status: "paused" }),
    ];
    for (const s of allInputs) {
      const blob = JSON.stringify(inferBillingState(s, NOW));
      expect(blob).not.toMatch(/\bNaN\b/);
      expect(blob).not.toMatch(/"undefined"/);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeAccountAgeDays,
  countRecentTransactions,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";
import type { ExtraSignals } from "@/lib/calculations/health/axis-inputs";
import type { FinanceData } from "@/lib/services/finance";
import type {
  HealthScoreResult,
  SealedSnapshot,
} from "@/lib/calculations/health/types";
import { FHS_VERSION } from "@/lib/calculations/health/constants";

/* -------------------------------------------------------------------------- */
/*  Mocks                                                                      */
/* -------------------------------------------------------------------------- */

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  getAdminClient: () => ({}),
}));

vi.mock("@/lib/services/health-snapshots", () => ({
  getLatestSnapshotByUserId: vi.fn(),
  countSnapshotsByUserId: vi.fn(),
  getSnapshotForWeek: vi.fn(),
  listRecentSnapshotsByUserId: vi.fn(),
  writeSnapshot: vi.fn(),
}));

vi.mock("@/lib/services/health-deltas", () => ({
  getDeltaByUserIdAndWeek: vi.fn(),
  writeDelta: vi.fn(),
}));

import {
  countSnapshotsByUserId,
  getLatestSnapshotByUserId,
  getSnapshotForWeek,
  listRecentSnapshotsByUserId,
  writeSnapshot,
} from "@/lib/services/health-snapshots";
import {
  getDeltaByUserIdAndWeek,
  writeDelta,
} from "@/lib/services/health-deltas";

const mockedGetLatest = vi.mocked(getLatestSnapshotByUserId);
const mockedCount = vi.mocked(countSnapshotsByUserId);
const mockedGetForWeek = vi.mocked(getSnapshotForWeek);
const mockedListRecent = vi.mocked(listRecentSnapshotsByUserId);
const mockedWriteSnap = vi.mocked(writeSnapshot);
const mockedGetDelta = vi.mocked(getDeltaByUserIdAndWeek);
const mockedWriteDelta = vi.mocked(writeDelta);

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function buildFinanceData(overrides: Partial<FinanceData> = {}): FinanceData {
  return {
    profile: {
      full_name: "Test",
      email: "t@x.ch",
      avatar_url: null,
      currency: "CHF",
      locale: "fr",
      country: "CH",
      onboarding_completed: true,
    },
    subscription: {
      plan: "premium",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: null,
      trial_ends_at: null,
      trial_used: false,
      price_id: null,
      has_customer: true,
    },
    financialProfile: {
      id: "fp",
      user_id: "u",
      situation: null,
      main_goal: null,
      monthly_income: null,
      monthly_expenses: null,
      current_savings: 9000,
      monthly_debt_payment: null,
      has_emergency_fund: false,
      behavior_traits: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as unknown as FinanceData["financialProfile"],
    incomes: [
      {
        id: "i1", user_id: "u", label: "Salaire", amount: 5000,
        category: "salary", frequency: "monthly", notes: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      } as FinanceData["incomes"][number],
    ],
    expenses: [
      {
        id: "e1", user_id: "u", label: "Loyer", amount: 1500,
        category: "housing", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e2", user_id: "u", label: "Assurance", amount: 280,
        category: "insurance", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e3", user_id: "u", label: "Courses", amount: 400,
        category: "food", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
      {
        id: "e4", user_id: "u", label: "CFF", amount: 220,
        category: "transport", frequency: "monthly", notes: null,
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:00Z",
      } as FinanceData["expenses"][number],
    ],
    goals: [],
    expenseBuckets: {
      fixed: 2400,
      variable: 0,
      total: 2400,
      transactions: 0,
    },
    categoryBudgets: [],
    isDemo: false,
    ...overrides,
  };
}

function defaultExtras(): ExtraSignals {
  return {
    txCount30d: 5,
    coachMsg30d: 0,
    memoryEntries30d: 0,
    accountAgeDays: 90,
    history3mIncomeAvg: null,
    incomeHistoryMonths: 0,
    savingsRatesByMonth: [],
  };
}

function fakeSealedSnapshot(week: string, display: number): SealedSnapshot {
  const result: HealthScoreResult = {
    raw: display,
    smoothed: display,
    display,
    confidence: "HIGH",
    band: display >= 65 ? "or" : display >= 40 ? "ambre" : "rose",
    axes: {
      discipline: { id: "discipline", score: display, confidence: "HIGH", components: {} },
      resilience: { id: "resilience", score: display, confidence: "HIGH", components: {} },
      trajectoire: { id: "trajectoire", score: display, confidence: "HIGH", components: {} },
      couverture: { id: "couverture", score: display, confidence: "HIGH", components: {} },
      objectifs: { id: "objectifs", score: display, confidence: "HIGH", components: {} },
      comportement: { id: "comportement", score: display, confidence: "HIGH", components: {} },
    },
    previousScore: null,
    previousBand: null,
    fhsVersion: FHS_VERSION,
    computedAt: "2026-06-01T00:00:00.000Z",
  };
  return { week, result };
}

// Pick a date that's definitively past Sunday 23:00 of week W23 in
// Europe/Zurich, so the writer will attempt a seal in test scenarios
// that allow it. 2026-06-08 is a Monday — well past the Sunday 23:00
// boundary of W23 (2026-06-07 23:00 local).
const MONDAY_AFTER_SEAL = new Date("2026-06-08T10:00:00Z");

/* -------------------------------------------------------------------------- */
/*  Lifecycle reset                                                            */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults : empty DB.
  mockedGetLatest.mockResolvedValue(null);
  mockedCount.mockResolvedValue(0);
  mockedGetForWeek.mockResolvedValue(null);
  mockedListRecent.mockResolvedValue([]);
  mockedWriteSnap.mockImplementation(async ({ week, result }) => ({
    week,
    result,
  }));
  mockedGetDelta.mockResolvedValue(null);
  mockedWriteDelta.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

/* -------------------------------------------------------------------------- */
/*  Empty account → INSUFFICIENT_DATA, no delta, no momentum                   */
/* -------------------------------------------------------------------------- */

describe("getOrSealDrawerData — brand new account", () => {
  it("computes a live score with INSUFFICIENT_DATA on first ever call", async () => {
    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });
    expect(drawer.score.confidence).toBe("INSUFFICIENT_DATA");
  });

  it("seals the score as the first snapshot of the sealable week", async () => {
    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });
    expect(mockedWriteSnap).toHaveBeenCalledTimes(1);
    const call = mockedWriteSnap.mock.calls[0][0];
    expect(call.userId).toBe("u");
    // 2026-06-08 is Monday of W24 ; the latest sealable week is W23.
    expect(call.week).toBe("2026-W23");
  });

  it("never calls explainDelta when previous is null", async () => {
    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });
    expect(mockedWriteDelta).not.toHaveBeenCalled();
  });

  it("momentum is null on first ever call (no history)", async () => {
    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });
    expect(drawer.momentum).toBeNull();
  });

  it("recommendation is null when score is INSUFFICIENT_DATA", async () => {
    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });
    expect(drawer.recommendation).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/*  Returning user — seal new week + write delta                               */
/* -------------------------------------------------------------------------- */

describe("getOrSealDrawerData — returning user with a previous snapshot", () => {
  it("does not re-seal a week that already has a snapshot", async () => {
    const existing = fakeSealedSnapshot("2026-W23", 70);
    mockedGetLatest.mockResolvedValue(existing);
    mockedCount.mockResolvedValue(1);
    mockedGetForWeek.mockResolvedValue(existing);

    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(mockedWriteSnap).not.toHaveBeenCalled();
  });

  it("seals a NEW week and writes the delta against the previous snapshot", async () => {
    const previous = fakeSealedSnapshot("2026-W22", 68);
    mockedGetLatest.mockResolvedValue(previous);
    mockedCount.mockResolvedValue(1);
    mockedGetForWeek.mockResolvedValue(null); // W23 not sealed yet
    mockedWriteSnap.mockImplementation(async ({ week, result }) => ({
      week,
      result,
    }));

    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(mockedWriteSnap).toHaveBeenCalledTimes(1);
    expect(mockedWriteSnap.mock.calls[0][0].week).toBe("2026-W23");
    expect(mockedWriteDelta).toHaveBeenCalledTimes(1);
    const deltaCall = mockedWriteDelta.mock.calls[0][0];
    expect(deltaCall.explanation.fromWeek).toBe("2026-W22");
    expect(deltaCall.explanation.toWeek).toBe("2026-W23");
  });

  it("does not write a delta when the seal returns null (write failure)", async () => {
    const previous = fakeSealedSnapshot("2026-W22", 68);
    mockedGetLatest.mockResolvedValue(previous);
    mockedCount.mockResolvedValue(1);
    mockedGetForWeek.mockResolvedValue(null);
    mockedWriteSnap.mockResolvedValue(null); // simulate write failure

    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(mockedWriteDelta).not.toHaveBeenCalled();
  });

  it("does not write a delta if the seal returned an EXISTING (idempotent) row", async () => {
    // Idempotent path : getSnapshotForWeek already had the row, no need
    // to seal, no need to write a delta — last week's delta already exists.
    const previous = fakeSealedSnapshot("2026-W22", 68);
    const alreadySealed = fakeSealedSnapshot("2026-W23", 70);
    mockedGetLatest.mockResolvedValue(previous);
    mockedCount.mockResolvedValue(1);
    mockedGetForWeek.mockResolvedValue(alreadySealed);

    await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(mockedWriteSnap).not.toHaveBeenCalled();
    expect(mockedWriteDelta).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/*  Momentum                                                                   */
/* -------------------------------------------------------------------------- */

describe("getOrSealDrawerData — Momentum", () => {
  it("computes momentum from listRecentSnapshotsByUserId output", async () => {
    // Provide a 4-week run of snapshots with rising scores.
    mockedListRecent.mockResolvedValue([
      fakeSealedSnapshot("2026-W23", 75),
      fakeSealedSnapshot("2026-W22", 70),
      fakeSealedSnapshot("2026-W21", 65),
      fakeSealedSnapshot("2026-W20", 60),
    ]);
    mockedGetForWeek.mockResolvedValue(fakeSealedSnapshot("2026-W23", 75));
    mockedGetLatest.mockResolvedValue(fakeSealedSnapshot("2026-W23", 75));
    mockedCount.mockResolvedValue(4);

    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(drawer.momentum).not.toBeNull();
    expect(drawer.momentum?.direction).toBe("UP");
    expect(drawer.momentum?.delta4Weeks).toBe(15);
  });
});

/* -------------------------------------------------------------------------- */
/*  Recommendation                                                             */
/* -------------------------------------------------------------------------- */

describe("getOrSealDrawerData — Recommendation", () => {
  it("emits a recommendation when the score is interpretable", async () => {
    mockedGetLatest.mockResolvedValue(fakeSealedSnapshot("2026-W22", 68));
    mockedCount.mockResolvedValue(2);
    mockedGetForWeek.mockResolvedValue(fakeSealedSnapshot("2026-W23", 70));

    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(drawer.recommendation).not.toBeNull();
    expect(drawer.recommendation?.titleKey).toMatch(/^recommend_/);
  });
});

/* -------------------------------------------------------------------------- */
/*  Drawer score = sealed row (when available)                                 */
/* -------------------------------------------------------------------------- */

describe("getOrSealDrawerData — drawer.score selection", () => {
  it("returns the SEALED snapshot's result, not the live computation", async () => {
    // Seal an existing row with display = 60 ; the live computation
    // would give a HIGHER score because data is rich. The drawer
    // must surface the sealed value (stable for the week).
    const sealed = fakeSealedSnapshot("2026-W23", 60);
    mockedGetLatest.mockResolvedValue(fakeSealedSnapshot("2026-W22", 55));
    mockedCount.mockResolvedValue(2);
    mockedGetForWeek.mockResolvedValue(sealed);

    const drawer = await getOrSealDrawerData({
      userId: "u",
      financeData: buildFinanceData(),
      extras: defaultExtras(),
      timezone: "Europe/Zurich",
      now: MONDAY_AFTER_SEAL,
    });

    expect(drawer.score.display).toBe(60);
  });
});

/* -------------------------------------------------------------------------- */
/*  Pure helpers — countRecentTransactions + computeAccountAgeDays             */
/* -------------------------------------------------------------------------- */

describe("countRecentTransactions", () => {
  it("counts recent one_time expenses within 30 days", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    const recent = new Date("2026-05-25T12:00:00Z").toISOString();
    const old = new Date("2026-04-01T12:00:00Z").toISOString();
    const financeData = buildFinanceData({
      expenses: [
        {
          id: "x1", user_id: "u", label: "Coop", amount: 42,
          category: "food", frequency: "one_time", notes: null,
          created_at: recent, updated_at: recent,
        } as FinanceData["expenses"][number],
        {
          id: "x2", user_id: "u", label: "Migros", amount: 35,
          category: "food", frequency: "one_time", notes: null,
          created_at: recent, updated_at: recent,
        } as FinanceData["expenses"][number],
        {
          id: "x3", user_id: "u", label: "SBB", amount: 12,
          category: "transport", frequency: "one_time", notes: null,
          created_at: recent, updated_at: recent,
        } as FinanceData["expenses"][number],
        // outside the 30-day window
        {
          id: "x4", user_id: "u", label: "Old", amount: 100,
          category: "leisure", frequency: "one_time", notes: null,
          created_at: old, updated_at: old,
        } as FinanceData["expenses"][number],
      ],
    });
    expect(countRecentTransactions(financeData, now)).toBe(3);
  });

  it("ignores expenses below 1 CHF (anti-gaming floor)", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    const recent = new Date("2026-05-25T12:00:00Z").toISOString();
    const financeData = buildFinanceData({
      expenses: [
        {
          id: "y1", user_id: "u", label: "Fake", amount: 0.01,
          category: "food", frequency: "one_time", notes: null,
          created_at: recent, updated_at: recent,
        } as FinanceData["expenses"][number],
      ],
    });
    expect(countRecentTransactions(financeData, now)).toBe(0);
  });

  it("dedupes identical (label, amount, hour) tuples", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    const t = new Date("2026-05-25T12:00:00Z").toISOString();
    const t2 = new Date("2026-05-25T12:30:00Z").toISOString(); // same hour bucket
    const financeData = buildFinanceData({
      expenses: [
        {
          id: "d1", user_id: "u", label: "Café", amount: 5,
          category: "food", frequency: "one_time", notes: null,
          created_at: t, updated_at: t,
        } as FinanceData["expenses"][number],
        {
          id: "d2", user_id: "u", label: "Café", amount: 5,
          category: "food", frequency: "one_time", notes: null,
          created_at: t2, updated_at: t2,
        } as FinanceData["expenses"][number],
      ],
    });
    expect(countRecentTransactions(financeData, now)).toBe(1);
  });

  it("ignores recurring (non-one_time) expenses entirely", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    const recent = new Date("2026-05-25T12:00:00Z").toISOString();
    const financeData = buildFinanceData({
      expenses: [
        {
          id: "r1", user_id: "u", label: "Loyer", amount: 1500,
          category: "housing", frequency: "monthly", notes: null,
          created_at: recent, updated_at: recent,
        } as FinanceData["expenses"][number],
      ],
    });
    expect(countRecentTransactions(financeData, now)).toBe(0);
  });
});

describe("computeAccountAgeDays", () => {
  it("computes days since accountCreatedAt", () => {
    const now = new Date("2026-06-08T00:00:00Z");
    const created = "2026-05-01T00:00:00Z";
    expect(computeAccountAgeDays(created, now)).toBe(38);
  });

  it("returns 0 when accountCreatedAt is null", () => {
    expect(
      computeAccountAgeDays(null, new Date("2026-06-08T00:00:00Z")),
    ).toBe(0);
  });

  it("returns 0 when accountCreatedAt is in the future (clock skew)", () => {
    const now = new Date("2026-06-08T00:00:00Z");
    const created = "2026-07-01T00:00:00Z";
    expect(computeAccountAgeDays(created, now)).toBe(0);
  });

  it("counts whole days only (floors)", () => {
    const now = new Date("2026-06-08T23:59:59Z");
    const created = "2026-06-08T00:00:00Z";
    expect(computeAccountAgeDays(created, now)).toBe(0);
  });
});

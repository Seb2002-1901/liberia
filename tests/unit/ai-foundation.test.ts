import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  estimateTokens,
  truncateMessagesForBudget,
  withRetry,
  withTimeout,
} from "@/lib/ai/budget";
import {
  normalizeCoachReply,
  normalizeInsightBody,
  normalizePlan,
} from "@/lib/ai/normalize";
import { selectAiProvider, isAnthropicProviderActive } from "@/lib/ai/provider";

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
];
const ORIGINAL = Object.fromEntries(
  ENV_KEYS.map((k) => [k, process.env[k]]),
) as Record<string, string | undefined>;

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (ORIGINAL[k] !== undefined) process.env[k] = ORIGINAL[k];
    else delete process.env[k];
  }
}

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

describe("selectAiProvider — fallback by default", () => {
  beforeEach(() => clearEnv());
  afterEach(() => restoreEnv());

  it("returns local when ANTHROPIC_API_KEY is absent", () => {
    const sel = selectAiProvider();
    expect(sel.kind).toBe("local");
    expect(sel.reason.toLowerCase()).toContain("anthropic_api_key");
  });

  it("returns local when admin client is unconfigured (even if Anthropic is set)", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    // SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL still cleared
    const sel = selectAiProvider();
    expect(sel.kind).toBe("local");
    expect(sel.reason.toLowerCase()).toContain("supabase_service_role_key");
  });

  it("returns anthropic when both Anthropic + admin are configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    const sel = selectAiProvider();
    expect(sel.kind).toBe("anthropic");
    expect(isAnthropicProviderActive()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// NORMALIZE
// ─────────────────────────────────────────────────────────────────

describe("normalizeCoachReply", () => {
  it("returns empty string for null/undefined/empty inputs", () => {
    expect(normalizeCoachReply(null)).toBe("");
    expect(normalizeCoachReply(undefined)).toBe("");
    expect(normalizeCoachReply("")).toBe("");
    expect(normalizeCoachReply("   ")).toBe("");
  });

  it("trims and collapses excessive whitespace", () => {
    const out = normalizeCoachReply("  hello\n\n\n\nworld   ");
    expect(out).toBe("hello\n\nworld");
  });

  it("clamps to ~6000 chars on a word boundary", () => {
    const longWord = "mot ";
    const longInput = longWord.repeat(3000); // ~12000 chars
    const out = normalizeCoachReply(longInput);
    expect(out.length).toBeLessThanOrEqual(6001); // 6000 + ellipsis
    expect(out.endsWith("…")).toBe(true);
  });

  it("redacts leaked Anthropic / Stripe / JWT secrets", () => {
    const leaks = [
      "voici ta clé sk-ant-1234567890abcdefghij",
      "le secret est sk_live_1234567890abcdefghij",
      "whsec_1234567890abcdefghij",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dozjgNryP4J3jVmNHl0w5N_XgL0JKgFnXSk0OoT9Wkg",
    ];
    for (const l of leaks) {
      const out = normalizeCoachReply(`Hi! ${l} bye`);
      expect(out).not.toContain("sk-ant-1234");
      expect(out).not.toContain("sk_live_");
      expect(out).not.toContain("whsec_");
      expect(out).toContain("[redacted]");
    }
  });
});

describe("normalizeInsightBody", () => {
  it("compacts newlines into single spaces and clamps to 600 chars", () => {
    const input = "Ligne 1\n\nLigne 2\n   Ligne 3 ".repeat(50);
    const out = normalizeInsightBody(input);
    expect(out).not.toContain("\n");
    expect(out.length).toBeLessThanOrEqual(601);
  });
});

describe("normalizePlan", () => {
  it("returns a valid plan when input is mostly-empty (defensive)", () => {
    const plan = normalizePlan({});
    expect(plan.title).toBe("Mon plan financier");
    expect(plan.summary).toBe("");
    expect(plan.steps).toHaveLength(0);
  });

  it("clamps step week_number into 1..13 and defaults missing fields", () => {
    const plan = normalizePlan({
      title: "x",
      steps: [
        {
          week_number: 0, // out of range → defaults to 1
          title: null,
          description: null,
          focus: null,
          category: null,
          expected_impact_eur: -5,
        },
        {
          week_number: 99,
          title: "Step",
          description: "desc",
          focus: "Focus",
          category: "save",
          expected_impact_eur: 42,
        },
      ],
    });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].week_number).toBe(1);
    expect(plan.steps[0].title).toBe("Étape");
    expect(plan.steps[0].expected_impact_eur).toBeNull();
    expect(plan.steps[1].week_number).toBe(1); // 99 clamped → fallback 1
    expect(plan.steps[1].expected_impact_eur).toBe(42);
  });
});

// ─────────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────────

describe("estimateTokens", () => {
  it("returns 0 for empty / non-string", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it("approximates ~1 token per 4 chars", () => {
    expect(estimateTokens("a".repeat(100))).toBe(25);
    expect(estimateTokens("a".repeat(1000))).toBe(250);
  });
});

describe("truncateMessagesForBudget", () => {
  const msg = (n: number, content: string) => ({
    role: (n % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content,
  });

  it("returns the input unchanged when under budget", () => {
    const input = [msg(0, "short"), msg(1, "answer")];
    const { messages, dropped } = truncateMessagesForBudget(input, 1000);
    expect(messages).toHaveLength(2);
    expect(dropped).toBe(0);
  });

  it("drops oldest messages until inside budget, keeps latest", () => {
    const filler = "x".repeat(4000); // ~1000 tokens each
    const input = [
      msg(0, filler),
      msg(1, filler),
      msg(2, filler),
      msg(3, "tail"),
    ];
    const { messages, dropped } = truncateMessagesForBudget(input, 1500);
    // Latest must always be included.
    expect(messages[messages.length - 1].content).toBe("tail");
    expect(dropped).toBeGreaterThan(0);
  });

  it("always keeps at least the most recent message, even when it busts the budget", () => {
    const giant = "x".repeat(100_000);
    const { messages } = truncateMessagesForBudget([{ role: "user", content: giant }], 100);
    expect(messages).toHaveLength(1);
    expect(messages[0].content.length).toBe(100_000);
  });
});

describe("withTimeout", () => {
  it("resolves when the fn completes before the deadline", async () => {
    const res = await withTimeout(() => Promise.resolve("ok"), 100, "test");
    expect(res).toBe("ok");
  });

  it("rejects when the fn exceeds the deadline", async () => {
    await expect(
      withTimeout(
        () => new Promise<string>((r) => setTimeout(() => r("late"), 200)),
        50,
        "test",
      ),
    ).rejects.toThrow(/timed out/);
  });
});

describe("withRetry", () => {
  it("returns the fn result on first success", async () => {
    let calls = 0;
    const res = await withRetry(async () => {
      calls++;
      return "ok";
    });
    expect(res).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries transient errors (500) up to maxAttempts", async () => {
    let calls = 0;
    const res = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("HTTP 503 service unavailable");
        return "ok";
      },
      { maxAttempts: 3 },
    );
    expect(res).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does NOT retry on aborts", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          const err = new Error("AbortError");
          err.name = "AbortError";
          throw err;
        },
        { maxAttempts: 3 },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });
});

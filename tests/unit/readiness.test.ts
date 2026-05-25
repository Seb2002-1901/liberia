import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReadinessSummary } from "@/lib/readiness";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
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

describe("getReadinessSummary", () => {
  beforeEach(() => clearEnv());
  afterEach(() => restoreEnv());

  it("marks production NOT ready when no env is configured", () => {
    const r = getReadinessSummary();
    expect(r.productionReady).toBe(false);
    expect(r.counts.missingRequired).toBeGreaterThan(0);
  });

  it("flags each integration with a known id + status tier", () => {
    const r = getReadinessSummary();
    const ids = r.checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "app_url",
        "supabase",
        "supabase_admin",
        "stripe",
        "anthropic",
        "resend",
        "cron",
        "upstash",
        "sentry",
      ]),
    );
    for (const c of r.checks) {
      expect(["required", "recommended", "optional"]).toContain(c.status);
    }
  });

  it("marks production ready when all REQUIRED envs are configured (even if optionals are missing)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY = "price_m";
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY = "price_y";
    // Anthropic, Resend, Cron, Upstash, Sentry: still missing.
    const r = getReadinessSummary();
    expect(r.productionReady).toBe(true);
    expect(r.counts.missingRequired).toBe(0);
    expect(r.counts.missingRecommended).toBeGreaterThan(0);
  });

  it("never echoes env VALUES in the output (privacy)", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_SUPER_SECRET_TOKEN_12345";
    process.env.ANTHROPIC_API_KEY = "sk-ant-anthropic-leaked-here";
    process.env.RESEND_API_KEY = "re_resend_leak";
    const r = getReadinessSummary();
    const blob = JSON.stringify(r);
    expect(blob).not.toContain("sk_live_SUPER_SECRET");
    expect(blob).not.toContain("sk-ant-anthropic-leaked");
    expect(blob).not.toContain("re_resend_leak");
  });

  it("accepts either NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN for the sentry check", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://dsn.ingest.sentry.io/x";
    const a = getReadinessSummary();
    expect(a.checks.find((c) => c.id === "sentry")?.ok).toBe(true);

    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.SENTRY_DSN = "https://dsn.ingest.sentry.io/x";
    const b = getReadinessSummary();
    expect(b.checks.find((c) => c.id === "sentry")?.ok).toBe(true);
  });

  it("provides a hint string for every NON-OK check", () => {
    const r = getReadinessSummary();
    for (const c of r.checks) {
      if (!c.ok) {
        expect(typeof c.hint).toBe("string");
        expect(c.hint!.length).toBeGreaterThan(20);
      }
    }
  });
});

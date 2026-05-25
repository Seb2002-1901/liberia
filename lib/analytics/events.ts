/**
 * Typed analytics event registry.
 *
 * Every event LIBERIA fires is declared here as a discriminated union.
 * Callers gain autocomplete + type-checked properties; sinks
 * (PostHog adapter, server logger, in-process test capture) get a
 * stable shape they can serialize without inventing fields.
 *
 * Privacy discipline — applies to ALL `properties` fields:
 *  - never include the user_id (it travels via the second arg of
 *    `track(event, { userId })`, not as event property)
 *  - never include emails, full names, raw messages or amounts
 *  - prefer counts, lengths, booleans, enum-ish strings
 *  - if you need user-scoped data, hash it server-side first
 *
 * Adding a new event:
 *  1. add the variant below
 *  2. fire it from the call site via `track({ name: "...", properties: {...} })`
 *  3. (optional) extend `app/admin/page.tsx` if you want it surfaced
 */

export type AnalyticsEvent =
  // ───── Auth & onboarding
  | { name: "signup_started"; properties: Record<string, never> }
  | { name: "signup_completed"; properties: { method?: "email" } }
  | { name: "login"; properties: Record<string, never> }
  | { name: "onboarding_started"; properties: Record<string, never> }
  | {
      name: "onboarding_completed";
      properties: {
        situation: "struggling" | "tight" | "stable" | "comfortable";
        mainGoal: string;
        behaviorTraitCount: number;
      };
    }

  // ───── Business / billing
  | { name: "trial_started"; properties: { plan: "monthly" | "yearly" } }
  | {
      name: "subscription_checkout_started";
      properties: { plan: "monthly" | "yearly" };
    }
  | {
      name: "subscription_checkout_completed";
      properties: { plan: "monthly" | "yearly" };
    }
  | { name: "subscription_canceled"; properties: { atPeriodEnd: boolean } }
  | { name: "payment_failed"; properties: Record<string, never> }

  // ───── Coach
  | { name: "coach_opened"; properties: Record<string, never> }
  | {
      name: "coach_message_sent";
      properties: { messageLength: number; useLLM: boolean };
    }
  | { name: "quick_prompt_clicked"; properties: { promptIndex: number } }
  | {
      name: "plan_generated";
      properties: { horizonDays: 30 | 60 | 90; stepCount: number };
    }

  // ───── Retention / dashboard
  | { name: "dashboard_opened"; properties: Record<string, never> }
  | { name: "weekly_recap_viewed"; properties: Record<string, never> }
  | { name: "goal_completed"; properties: { goalType: string } }
  | {
      name: "proactive_hint_clicked";
      properties: { kind: string };
    }

  // ───── Settings
  | {
      name: "notification_pref_changed";
      properties: { key: string; enabled: boolean };
    }
  | {
      name: "coaching_tone_changed";
      properties: { tone: "calm" | "direct" | "structured" | "gentle" };
    }
  | { name: "analytics_opt_out_changed"; properties: { optedOut: boolean } };

export type AnalyticsEventName = AnalyticsEvent["name"];

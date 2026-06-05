/**
 * Generated-style types matching schema.sql.
 * Keep in sync with /supabase/schema.sql.
 */

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type PlanTier = "free" | "premium";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  currency: string;
  country: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus | null;
  plan: PlanTier;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_event_at: string | null;
  price_id: string | null;
  trial_used: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialProfile {
  id: string;
  user_id: string;
  situation: "struggling" | "tight" | "stable" | "comfortable";
  monthly_income: number;
  monthly_expenses: number;
  current_savings: number;
  monthly_debt: number;
  has_emergency_fund: boolean;
  main_goal: string | null;
  perceived_stress: number;
  stability_score: number;
  stress_score: number;
  behavior_traits: string[];
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  category: string;
  frequency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  category: string;
  frequency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  type: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: "dark" | "light" | "system";
  email_weekly_summary: boolean;
  notification_alerts: boolean;
  email_unsubscribe_token: string;
  last_weekly_sent_at: string | null;
  email_encouragement: boolean;
  email_trial_reminders: boolean;
  email_goal_milestones: boolean;
  email_inactivity_followup: boolean;
  analytics_opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export type CoachingTone = "calm" | "direct" | "structured" | "gentle";

/**
 * Phase 3.1.2 — per-category monthly budget. One row per
 * (user_id, category). The user sets these from /expenses/analytics;
 * the analytics page + coach context use them to flag overruns.
 */
export interface CategoryBudget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  coaching_tone: CoachingTone | null;
  financial_personality: string | null;
  recurring_challenges: string[];
  preferred_motivation_style: string | null;
  spending_triggers: string[];
  progress_notes: string | null;
  last_coach_summary: string | null;
  created_at: string;
  updated_at: string;
}

export type MemoryEntryKind = "goal" | "preference" | "event" | "blocker";
export type MemoryEntrySource =
  | "user"
  | "coach"
  | "onboarding"
  | "inferred";

export interface UserMemoryEntry {
  id: string;
  user_id: string;
  kind: MemoryEntryKind;
  key: string;
  summary: string;
  detail: string | null;
  importance: number;
  confidence: number;
  source: MemoryEntrySource;
  conversation_id: string | null;
  expires_at: string | null;
  last_referenced_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPlan {
  id: string;
  user_id: string;
  horizon_days: 30 | 60 | 90;
  title: string;
  summary: string | null;
  model: string | null;
  generation_input: unknown | null;
  is_active: boolean;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialPlanStep {
  id: string;
  plan_id: string;
  user_id: string;
  week_number: number;
  focus: string;
  title: string;
  description: string | null;
  expected_impact_eur: number | null;
  category: string | null;
  is_completed: boolean;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

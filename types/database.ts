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
  perceived_stress: number;
  stability_score: number;
  stress_score: number;
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
  created_at: string;
  updated_at: string;
}

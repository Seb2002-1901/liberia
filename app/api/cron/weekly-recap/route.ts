import { NextResponse } from "next/server";
import { isResendConfigured } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { renderWeeklyEmail } from "@/lib/email/templates";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
import {
  calculateNetCashflow,
  calculateSavingsRate,
  calculateStabilityScore,
} from "@/lib/calculations/finance";
import { totalMonthly } from "@/lib/services/finance";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import type { Expense, Income, FinancialPlanStep } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Weekly recap cron job. Triggered by Vercel Cron (vercel.json schedule)
 * every Sunday morning. Header CRON_SECRET protects against unauthorized
 * triggers if the Vercel project URL is guessed.
 *
 * Walks every opted-in user, computes their finance snapshot, sends an
 * email through Resend, then bumps last_weekly_sent_at. Idempotent if
 * re-run within ~6 days (skips users sent recently).
 */
export async function GET(request: Request) {
  // Fail closed — never run this loop without explicit auth. If the
  // operator forgets to set CRON_SECRET in env, the endpoint stays
  // locked instead of becoming a public spam-trigger that walks every
  // opted-in user. Vercel Cron sets CRON_SECRET automatically for
  // scheduled jobs (it's a Vercel-managed env var).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 503 },
    );
  }
  // Authentication via header only. We deliberately do NOT accept the
  // secret as a URL query parameter — secrets in query strings end up
  // in Vercel access logs, browser history, referer headers and proxy
  // caches (CWE-598). Vercel Cron always uses Authorization: Bearer.
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json({ skipped: "resend-not-configured" });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ skipped: "admin-not-configured" });
  }

  const admin = getAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const recentCutoff = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch opted-in users who weren't sent recently.
  const { data: settings, error: settingsErr } = await admin
    .from("user_settings")
    .select("user_id, email_unsubscribe_token, last_weekly_sent_at")
    .eq("email_weekly_summary", true)
    .or(`last_weekly_sent_at.is.null,last_weekly_sent_at.lt.${recentCutoff}`)
    .limit(1000);
  if (settingsErr) {
    return NextResponse.json({ error: settingsErr.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const setting of settings ?? []) {
    try {
      const result = await sendOneRecap(
        admin,
        baseUrl,
        setting.user_id,
        setting.email_unsubscribe_token,
      );
      if (result === "sent") sent++;
      else skipped++;
    } catch (err) {
      errors.push(
        `${setting.user_id}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    errors: errors.slice(0, 10),
  });
}

async function sendOneRecap(
  admin: ReturnType<typeof getAdminClient>,
  baseUrl: string,
  userId: string,
  unsubscribeToken: string | null,
): Promise<"sent" | "skipped"> {
  // Pull the user's auth email via the admin auth API — never trust
  // `profiles.email` for outbound mail. RLS allows the user to self-update
  // their `profiles.email`, so otherwise we'd be a free spam relay
  // (attacker sets profiles.email → victim@example.com → Vercel cron
  // sends them a "LIBERIA récap" each Sunday).
  const { data: authData, error: authErr } =
    await admin.auth.admin.getUserById(userId);
  const trustedEmail = authData?.user?.email;
  if (authErr || !trustedEmail) return "skipped";

  // Pull the user's data with the admin client (cron has no user session).
  const [{ data: profile }, { data: incomes }, { data: expenses }, { data: fp }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("incomes")
        .select("amount, frequency, category")
        .eq("user_id", userId),
      admin
        .from("expenses")
        .select("amount, frequency, category")
        .eq("user_id", userId),
      admin
        .from("financial_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const monthlyIncome =
    totalMonthly((incomes ?? []) as Income[]) || fp?.monthly_income || 0;
  const monthlyExpenses =
    totalMonthly((expenses ?? []) as Expense[]) || fp?.monthly_expenses || 0;
  // unused for now — kept for parity with dashboard math if future fields needed
  void aggregateMonthlyByCategory((expenses ?? []) as Expense[]);
  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const stabilityScore = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings: fp?.current_savings ?? 0,
    hasEmergencyFund: fp?.has_emergency_fund ?? false,
    debtToIncomeRatio:
      monthlyIncome > 0 ? ((fp?.monthly_debt ?? 0) / monthlyIncome) * 100 : 0,
  });

  // Plan stats: steps completed this past week + remaining.
  const { data: activePlan } = await admin
    .from("financial_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let planStepsDoneThisWeek = 0;
  let planStepsRemaining = 0;
  if (activePlan?.id) {
    const { data: steps } = await admin
      .from("financial_plan_steps")
      .select("is_completed, completed_at")
      .eq("plan_id", activePlan.id);
    const all = (steps ?? []) as Pick<
      FinancialPlanStep,
      "is_completed" | "completed_at"
    >[];
    planStepsRemaining = all.filter((s) => !s.is_completed).length;
    const weekAgo = Date.now() - SEVEN_DAYS_MS;
    planStepsDoneThisWeek = all.filter(
      (s) =>
        s.is_completed &&
        s.completed_at &&
        new Date(s.completed_at).getTime() >= weekAgo,
    ).length;
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "toi";
  const unsubscribeUrl = unsubscribeToken
    ? `${baseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : `${baseUrl}/settings`;

  const email = renderWeeklyEmail({
    firstName,
    monthlyIncome,
    monthlyExpenses,
    cashflow,
    savingsRate,
    stabilityScore,
    planStepsDoneThisWeek,
    planStepsRemaining,
    unsubscribeUrl,
    appUrl: baseUrl,
  });

  const sent = await sendEmail({ to: trustedEmail, render: email });
  if (!sent.ok) throw new Error(sent.error);
  // If Resend isn't configured we no-op silently but still bump the
  // timestamp so the cron doesn't keep re-selecting the same users.
  // (The outer route already short-circuits on `!isResendConfigured`,
  // so we only reach this line when send was actually attempted.)

  await admin
    .from("user_settings")
    .update({ last_weekly_sent_at: new Date().toISOString() })
    .eq("user_id", userId);

  return "sent";
}

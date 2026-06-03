import { describe, expect, it } from "vitest";
import {
  renderEncouragementEmail,
  renderGoalMilestoneEmail,
  renderInactivityEmail,
  renderPaymentFailedEmail,
  renderTrialEndingEmail,
  renderWeeklyEmail,
  renderWelcomeEmail,
} from "@/lib/email/templates";

const APP = "https://liberia-wine.vercel.app";
const UNSUB = `${APP}/unsubscribe?token=opaque`;
const LOCALE = "fr"; // tests below assert French wording

function shapeOK(r: { subject: string; html: string; text: string }) {
  expect(r.subject).toBeTruthy();
  expect(r.html).toContain("LIBERIA");
  expect(r.text.length).toBeGreaterThan(0);
  // Critical: no raw debugging tokens leaked.
  expect(r.html).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
  expect(r.text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
}

describe("email templates — shape stability", () => {
  it("renders welcome email", async () => {
    const r = await renderWelcomeEmail({
      firstName: "Sébastien",
      appUrl: APP,
      locale: LOCALE,
    });
    shapeOK(r);
    expect(r.subject.toLowerCase()).toContain("bienvenue");
  });

  it("renders weekly recap", async () => {
    const r = await renderWeeklyEmail({
      firstName: "Sam",
      monthlyIncome: 2400,
      monthlyExpenses: 2000,
      cashflow: 400,
      savingsRate: 0.16,
      stabilityScore: 62,
      planStepsDoneThisWeek: 1,
      planStepsRemaining: 11,
      unsubscribeUrl: UNSUB,
      appUrl: APP,
      locale: LOCALE,
    });
    shapeOK(r);
    expect(r.subject).toContain("62");
  });

  it("renders encouragement with optional metric", async () => {
    const r = await renderEncouragementEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      headline: "Ton runway a atteint 2 mois.",
      metric: { label: "Runway", value: 2400, currency: "CHF" },
      locale: LOCALE,
    });
    shapeOK(r);
    expect(r.html).toContain("Runway");
  });

  it("renders trial-ending J-3 vs J-1 with distinct copy", async () => {
    const a = await renderTrialEndingEmail({
      firstName: "Sam",
      appUrl: APP,
      daysLeft: 3,
      trialEndsAt: "2025-12-01T10:00:00Z",
      monthlyAmount: 14.99,
      currency: "CHF",
      locale: LOCALE,
    });
    const b = await renderTrialEndingEmail({
      firstName: "Sam",
      appUrl: APP,
      daysLeft: 1,
      trialEndsAt: "2025-12-01T10:00:00Z",
      monthlyAmount: 14.99,
      currency: "CHF",
      locale: LOCALE,
    });
    shapeOK(a);
    shapeOK(b);
    expect(a.subject).not.toBe(b.subject);
    expect(a.subject).toContain("3 jours");
    expect(b.subject.toLowerCase()).toContain("demain");
  });

  it("renders payment-failed without alarming language", async () => {
    const r = await renderPaymentFailedEmail({
      firstName: "Sam",
      appUrl: APP,
      portalUrl: "https://billing.stripe.com/session/test",
      locale: LOCALE,
    });
    shapeOK(r);
    expect(r.html.toLowerCase()).toContain("paiement");
    expect(r.text.toLowerCase()).not.toMatch(/danger|urgent|critique|immédiatement/);
  });

  it("renders goal-milestone for each threshold with right wording", async () => {
    const r50 = await renderGoalMilestoneEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      goalTitle: "Fonds d'urgence",
      milestonePct: 50,
      currentAmount: 500,
      targetAmount: 1000,
      currency: "CHF",
      locale: LOCALE,
    });
    const r80 = await renderGoalMilestoneEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      goalTitle: "Fonds d'urgence",
      milestonePct: 80,
      currentAmount: 800,
      targetAmount: 1000,
      currency: "CHF",
      locale: LOCALE,
    });
    const r100 = await renderGoalMilestoneEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      goalTitle: "Fonds d'urgence",
      milestonePct: 100,
      currentAmount: 1000,
      targetAmount: 1000,
      currency: "CHF",
      locale: LOCALE,
    });
    shapeOK(r50);
    shapeOK(r80);
    shapeOK(r100);
    expect(r50.subject).toContain("50%");
    expect(r80.subject).toContain("20%");
    expect(r100.subject.toLowerCase()).toContain("atteint");
  });

  it("renders inactivity with soft tone (no FOMO, no pressure)", async () => {
    const r = await renderInactivityEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      daysSinceLast: 14,
      locale: LOCALE,
    });
    shapeOK(r);
    expect(r.text.toLowerCase()).not.toMatch(/last chance|trop tard|tu rates|fomo|action immédiate/);
  });

  it("renders welcome email in EN when locale is en", async () => {
    const r = await renderWelcomeEmail({
      firstName: "Alex",
      appUrl: APP,
      locale: "en",
    });
    shapeOK(r);
    expect(r.subject.toLowerCase()).toContain("welcome");
  });
});

describe("email templates — XSS hardening", () => {
  it("escapes user-provided strings (firstName)", async () => {
    const r = await renderWelcomeEmail({
      firstName: '<script>alert("x")</script>',
      appUrl: APP,
      locale: LOCALE,
    });
    expect(r.html).not.toContain("<script>alert");
    expect(r.html).toContain("&lt;script&gt;");
  });

  it("escapes goal titles", async () => {
    const r = await renderGoalMilestoneEmail({
      firstName: "Sam",
      appUrl: APP,
      unsubscribeUrl: UNSUB,
      goalTitle: '<img onerror="x"/>',
      milestonePct: 80,
      currentAmount: 800,
      targetAmount: 1000,
      currency: "CHF",
      locale: LOCALE,
    });
    expect(r.html).not.toContain('<img onerror');
    expect(r.html).toContain("&lt;img");
  });
});

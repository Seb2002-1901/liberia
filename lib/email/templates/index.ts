/**
 * Barrel for LIBERIA email templates. Centralizes the registry so
 * future template additions stay drop-in (one new file + one export).
 *
 * Each renderer returns the same shape: { subject, html, text }.
 * Callers should treat it as opaque and feed the result straight into
 * `sendEmail()` from `lib/email/send.ts`.
 */
export { renderWeeklyEmail, type WeeklyEmailInput } from "./weekly-recap";
export { renderWelcomeEmail, type WelcomeEmailInput } from "./welcome";
export {
  renderEncouragementEmail,
  type EncouragementEmailInput,
} from "./encouragement";
export {
  renderTrialEndingEmail,
  type TrialEndingEmailInput,
} from "./trial-ending";
export {
  renderPaymentFailedEmail,
  type PaymentFailedEmailInput,
} from "./payment-failed";
export {
  renderGoalMilestoneEmail,
  type GoalMilestoneEmailInput,
} from "./goal-milestone";
export {
  renderInactivityEmail,
  type InactivityEmailInput,
} from "./inactivity";

export type { EmailRender } from "@/lib/email/layout";

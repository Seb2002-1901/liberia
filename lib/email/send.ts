import "server-only";
import { EMAIL_FROM, getResend, isResendConfigured } from "@/lib/email/resend";
import type { EmailRender } from "@/lib/email/layout";

export type SendEmailInput = {
  to: string;
  render: EmailRender;
  /**
   * Optional `replyTo` for transactional emails (billing failures, etc.)
   * where the user might want to write back. Defaults to absent.
   */
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; skipped?: false; id: string | null }
  | { ok: true; skipped: true; reason: "not-configured" }
  | { ok: false; error: string };

/**
 * Send wrapper that fails closed and silent when Resend isn't wired
 * up. Returns `{ ok: true, skipped: true }` so callers (cron jobs,
 * webhook handlers, server actions) can keep flowing without
 * exception-handling boilerplate.
 *
 * Real send happens only when `RESEND_API_KEY` is configured AND the
 * input email is non-empty. Otherwise we no-op silently — never throw
 * a user-visible error from a background job because the operator
 * hasn't finished plugging in Resend.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    return { ok: true, skipped: true, reason: "not-configured" };
  }
  if (!input.to || !input.to.includes("@")) {
    return { ok: false, error: "Adresse email invalide." };
  }
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.render.subject,
      html: input.render.html,
      text: input.render.text,
      replyTo: input.replyTo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'envoi";
    return { ok: false, error: message };
  }
}

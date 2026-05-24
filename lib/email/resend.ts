import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY manquante. Configure-la pour activer les emails.",
    );
  }
  cached = new Resend(key);
  return cached;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "LIBERIA <coach@liberia.app>";

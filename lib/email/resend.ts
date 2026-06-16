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

/**
 * Sprint S3 — validation env Resend non-bloquante.
 *
 * Reporte les manques sans throw pour ne pas casser le build/runtime.
 * Appelé au démarrage par lib/diagnostics ou affiché en dev seul. La
 * source de vérité opérationnelle reste les ENV au moment du déploiement
 * Vercel — ce check ne tente pas de valider DKIM/SPF/DMARC en runtime
 * (ce sont des lookups DNS qu'on ne fait PAS à chaque cold start).
 *
 * Retourne un tableau de warnings — vide si tout est OK.
 */
export type ResendReadinessWarning = {
  code: "missing_api_key" | "missing_from_email" | "from_uses_default_domain";
  message: string;
};

export function getResendReadinessWarnings(): ResendReadinessWarning[] {
  const warnings: ResendReadinessWarning[] = [];
  if (!process.env.RESEND_API_KEY) {
    warnings.push({
      code: "missing_api_key",
      message:
        "RESEND_API_KEY absente — les emails (reset password, weekly recap) ne partiront pas.",
    });
  }
  if (!process.env.RESEND_FROM_EMAIL) {
    warnings.push({
      code: "missing_from_email",
      message:
        "RESEND_FROM_EMAIL absente — fallback vers coach@liberia.app. Vérifier que ce domaine est bien vérifié dans Resend (DKIM/SPF).",
    });
  } else if (process.env.RESEND_FROM_EMAIL.includes("@liberia.app")) {
    warnings.push({
      code: "from_uses_default_domain",
      message:
        "RESEND_FROM_EMAIL pointe sur liberia.app — confirmer que le domaine est vérifié + DMARC en p=quarantine ou p=reject.",
    });
  }
  return warnings;
}

/**
 * Normalized public base URL.
 *
 * Operators frequently configure `NEXT_PUBLIC_APP_URL` with a trailing
 * slash (Vercel copy-paste, custom domain defaults, "https://liberia.app/"
 * in env editors). Without normalization, every templated URL becomes
 * `https://liberia.app//settings/subscription` — Stripe may reject it,
 * sitemaps look broken, and email links double-slash.
 *
 * This helper is the single source of truth: trailing slash trimmed,
 * always callable, never throws. Use it instead of reading
 * `process.env.NEXT_PUBLIC_APP_URL` directly when concatenating paths.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.endsWith("/") ? raw.replace(/\/+$/, "") : raw;
}

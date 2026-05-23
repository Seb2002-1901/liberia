/**
 * Returns a safe relative redirect path or a fallback.
 * Prevents open-redirect via the `?next=` query param by rejecting
 * absolute URLs, protocol-relative URLs and anything that doesn't
 * start with a single forward slash.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (typeof next !== "string") return fallback;

  // Must start with a single "/" — reject "//evil.com", "/\\evil.com", protocols, etc.
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;
  if (/^\/+[a-z][a-z0-9+\-.]*:/i.test(next)) return fallback;

  return next;
}

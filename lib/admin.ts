import "server-only";

/**
 * Lightweight admin allowlist gated by env. No new DB column, no
 * `is_admin` flag to lock down — just a comma-separated list of
 * Supabase user IDs in `ADMIN_USER_IDS`.
 *
 * In production: set `ADMIN_USER_IDS=uuid1,uuid2` on Vercel.
 * In dev: unset → no one is admin, `/admin` returns 404.
 *
 * Why env + 404 (not 403): we don't want the admin surface to leak
 * its existence to non-admins. A 404 reads as "no such route".
 */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const raw = process.env.ADMIN_USER_IDS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (allow.length === 0) return false;
  return allow.includes(userId);
}

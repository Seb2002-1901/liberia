import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client.
 *
 * BYPASSES RLS. Use only:
 *  - inside server-side route handlers / actions
 *  - for system-level writes the webhook is allowed to make
 *    (subscriptions updates, stripe_events idempotence ledger, etc.)
 *
 * Never reach for this when you could use the cookie-bound client.
 * Never log the key. Never return rows from this client without an
 * explicit user_id filter — the goal is to bypass RLS for system
 * writes, not to cross-read user data.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  cached = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

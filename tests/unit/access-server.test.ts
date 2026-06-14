import { describe, it, expect, vi } from "vitest";
import { getAccessState } from "@/lib/services/access-server";

/**
 * Sprint S2-BIS — paywall server-side.
 *
 * getAccessState() est le point de décision UNIQUE pour le rendu
 * conditionnel des pages premium (opportunités, analytics détaillé).
 * Un faux positif "premium" laisse passer un lapsed → fuite de valeur.
 * Un faux négatif bloque un user payant → perte de NPS.
 *
 * On teste toutes les transitions Stripe possibles :
 *   - trialing / active → "premium"
 *   - canceled / paused / unpaid / past_due / incomplete*  → "lapsed"
 *   - aucune ligne subscriptions → "none"
 */

type MaybeStatus = string | null;

function mockSupabase(status: MaybeStatus, throws = false) {
  return {
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (throws) throw new Error("network");
            if (status === null) return { data: null, error: null };
            return { data: { status }, error: null };
          },
        }),
      }),
    }),
  } as unknown as Parameters<typeof getAccessState>[0];
}

describe("getAccessState (paywall surface)", () => {
  it.each([
    ["active", "premium" as const],
    ["trialing", "premium" as const],
  ])("status=%s → premium", async (status, expected) => {
    const result = await getAccessState(mockSupabase(status), "u1");
    expect(result).toBe(expected);
  });

  it.each([
    ["canceled", "lapsed" as const],
    ["paused", "lapsed" as const],
    ["unpaid", "lapsed" as const],
    ["past_due", "lapsed" as const],
    ["incomplete", "lapsed" as const],
    ["incomplete_expired", "lapsed" as const],
  ])("status=%s → lapsed", async (status, expected) => {
    const result = await getAccessState(mockSupabase(status), "u1");
    expect(result).toBe(expected);
  });

  it("no subscription row → none", async () => {
    const result = await getAccessState(mockSupabase(null), "u1");
    expect(result).toBe("none");
  });

  it("propagates DB throw (caller decides graceful degradation)", async () => {
    await expect(
      getAccessState(mockSupabase("active", true), "u1"),
    ).rejects.toThrow(/network/);
  });

  it("queries by user_id (cross-user isolation)", async () => {
    const eqSpy = vi.fn(() => ({
      maybeSingle: async () => ({ data: { status: "active" }, error: null }),
    }));
    const supabase = {
      from: () => ({ select: () => ({ eq: eqSpy }) }),
    } as unknown as Parameters<typeof getAccessState>[0];
    await getAccessState(supabase, "user-A");
    expect(eqSpy).toHaveBeenCalledWith("user_id", "user-A");
  });
});

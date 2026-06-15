import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Sprint S3 — tests RGPD/LPD pour deleteAccount.
 *
 * On valide les invariants critiques :
 *   1. Refuse si admin client pas configuré (sans service role,
 *      l'action ne peut pas supprimer un auth user → fail closed)
 *   2. Refuse si pas de session utilisateur (jamais "supprimer un
 *      user anonyme" = potentiel CSRF DoS contre n'importe qui)
 *   3. Stripe cancel est best-effort (la suppression LPD ne peut pas
 *      dépendre de la disponibilité Stripe — droit légal)
 *   4. signOut est appelé avant deleteUser (sinon cookie JWT reste
 *      valide jusqu'à expiration sur le client)
 *   5. Redirect /?account_deleted=1 en fin de chaîne (UX)
 */

const state = {
  adminConfigured: true,
  supabaseConfigured: true,
  stripeConfigured: true,
  userId: "user-abc" as string | null,
  subscriptionId: "sub_test_123" as string | null,
  stripeCancelThrows: false,
  signOutThrows: false,
  events: [] as string[],
};

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => state.supabaseConfigured,
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.userId ? { id: state.userId } : null },
      }),
      signOut: async () => {
        state.events.push("signOut");
        if (state.signOutThrows) throw new Error("cookie clear failed");
        return { error: null };
      },
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => state.adminConfigured,
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.subscriptionId
              ? { stripe_subscription_id: state.subscriptionId }
              : null,
          }),
        }),
      }),
      update: () => ({
        eq: async () => {
          state.events.push("subUpdate");
          return { error: null };
        },
      }),
    }),
    auth: {
      admin: {
        deleteUser: async () => {
          state.events.push("deleteUser");
          return { data: null, error: null };
        },
      },
    },
  }),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    subscriptions: {
      cancel: async () => {
        state.events.push("stripeCancel");
        if (state.stripeCancelThrows) throw new Error("stripe down");
        return { id: "sub", status: "canceled" };
      },
    },
  }),
}));

vi.mock("@/lib/stripe/config", () => ({
  isStripeConfigured: () => state.stripeConfigured,
}));

vi.mock("@/lib/i18n/action-errors", () => ({
  getActionErrors: async () => (k: string) => `T(${k})`,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    state.events.push(`redirect:${path}`);
    throw new Error("__NEXT_REDIRECT__");
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

beforeEach(() => {
  state.adminConfigured = true;
  state.supabaseConfigured = true;
  state.stripeConfigured = true;
  state.userId = "user-abc";
  state.subscriptionId = "sub_test_123";
  state.stripeCancelThrows = false;
  state.signOutThrows = false;
  state.events = [];
});

describe("deleteAccount (RGPD/LPD)", () => {
  it("refuse si admin Supabase pas configuré", async () => {
    state.adminConfigured = false;
    const { deleteAccount } = await import("@/app/actions/settings");
    const result = await deleteAccount();
    expect(result).toEqual({
      ok: false,
      error: "T(accountDeletionUnavailable)",
    });
    expect(state.events).not.toContain("deleteUser");
  });

  it("refuse si pas de session utilisateur", async () => {
    state.userId = null;
    const { deleteAccount } = await import("@/app/actions/settings");
    const result = await deleteAccount();
    expect(result).toEqual({ ok: false, error: "T(authRequired)" });
    expect(state.events).not.toContain("deleteUser");
  });

  it("annule Stripe puis supprime le compte (golden path)", async () => {
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(state.events).toContain("stripeCancel");
    expect(state.events).toContain("deleteUser");
    expect(state.events).toContain("redirect:/?account_deleted=1");
  });

  it("Stripe cancel best-effort : continue si Stripe down", async () => {
    state.stripeCancelThrows = true;
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(state.events).toContain("stripeCancel");
    expect(state.events).toContain("deleteUser");
  });

  it("signOut cookie session AVANT deleteUser", async () => {
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    const signOutIdx = state.events.indexOf("signOut");
    const deleteIdx = state.events.indexOf("deleteUser");
    expect(signOutIdx).toBeGreaterThanOrEqual(0);
    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(signOutIdx).toBeLessThan(deleteIdx);
  });

  it("signOut best-effort : continue si le clear cookie throw", async () => {
    state.signOutThrows = true;
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(state.events).toContain("deleteUser");
  });

  it("skip Stripe si pas de stripe_subscription_id", async () => {
    state.subscriptionId = null;
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(state.events).not.toContain("stripeCancel");
    expect(state.events).toContain("deleteUser");
  });

  it("skip Stripe si pas configuré (dev/preview)", async () => {
    state.stripeConfigured = false;
    const { deleteAccount } = await import("@/app/actions/settings");
    await expect(deleteAccount()).rejects.toThrow("__NEXT_REDIRECT__");
    expect(state.events).not.toContain("stripeCancel");
    expect(state.events).toContain("deleteUser");
  });
});

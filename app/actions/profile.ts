"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const localeSchema = z.object({
  country: z.enum(["CH", "FR", "BE", "DE", "IT", "GB", "US"]),
  currency: z.enum(["CHF", "EUR", "USD", "GBP"]),
  locale: z.enum(["fr-CH", "fr-FR", "en-US", "en-GB", "de-DE", "it-IT"]),
});

export async function updateProfileLocale(input: {
  country: string;
  currency: string;
  locale: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Authentification requise." };
  }
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Combinaison pays / devise / langue non supportée pour le moment.",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Authentification requise." };

  const { error } = await supabase
    .from("profiles")
    .update({
      country: parsed.data.country,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Currency drives every personal amount across the app — invalidate
  // the surfaces that render finance data so the new symbol appears
  // immediately instead of waiting for a hard refresh.
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/incomes");
  revalidatePath("/expenses");
  revalidatePath("/goals");
  revalidatePath("/plan");
  return { ok: true };
}

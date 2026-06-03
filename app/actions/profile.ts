"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { COUNTRIES } from "@/lib/locale/countries";
import { CURRENCIES } from "@/lib/locale/currencies";
import { LANGUAGES } from "@/lib/locale/languages";

type ActionResult = { ok: true } | { ok: false; error: string };

// Zod whitelists mirror the DB CHECK constraints in
// supabase/migrations/20240603_profiles_expand_locale.sql so a user
// can never POST a tuple the database would reject (saves a roundtrip
// and a confusing error message).
const COUNTRY_IDS = COUNTRIES.map((c) => c.id) as [string, ...string[]];
const CURRENCY_IDS = CURRENCIES.map((c) => c.id) as [string, ...string[]];
const LANGUAGE_IDS = LANGUAGES.map((l) => l.id) as [string, ...string[]];

const localeSchema = z.object({
  country: z.enum(COUNTRY_IDS),
  currency: z.enum(CURRENCY_IDS),
  locale: z.enum(LANGUAGE_IDS),
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

  // Currency / locale drive every personal amount across the app —
  // invalidate the surfaces that render finance data so the new
  // symbol / formatting appears immediately instead of waiting for
  // a hard refresh.
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/incomes");
  revalidatePath("/expenses");
  revalidatePath("/goals");
  revalidatePath("/plan");
  return { ok: true };
}

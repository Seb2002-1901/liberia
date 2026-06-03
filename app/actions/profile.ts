"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveAppLocale } from "@/i18n/config";
import { getActionErrors } from "@/lib/i18n/action-errors";
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
  const tErr = await getActionErrors();
  if (!isSupabaseConfigured()) {
    return { ok: false, error: tErr("authRequired") };
  }
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: tErr("regionUnsupported") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: tErr("authRequired") };

  const { error } = await supabase
    .from("profiles")
    .update({
      country: parsed.data.country,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  // Sync NEXT_LOCALE so next-intl picks up the new language on the
  // very next render. Without this the user keeps seeing the previous
  // language until the middleware-side cookie expires.
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", resolveAppLocale(parsed.data.locale), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

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

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAppLocale } from "@/i18n/config";

// NB: /reset-password is intentionally NOT here — the password-recovery
// flow lands authenticated and would otherwise be bounced to /dashboard.
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/budget",
  "/incomes",
  "/expenses",
  "/goals",
  "/coach",
  "/plan",
  "/profile",
  "/settings",
  "/onboarding",
];

/**
 * Mapping route prod → route V3 cible.
 *
 * Critique : ces redirections sont effectuées par le middleware AVANT
 * que les layouts Next.js ne se montent. Sans ça, /dashboard rend
 * d'abord (app)/layout.tsx (AppShell ancien visuel) puis exécute le
 * redirect du page.tsx → flash visible ~500 ms après le login.
 *
 * Avec ce mapping côté middleware, l'utilisateur passe directement
 * de /login à /design-match/dashboard-v3 sans jamais matérialiser
 * un rendu intermédiaire avec AppShell. Zéro flash.
 *
 * Les sous-routes prod (ex: /coach/[id], /settings/subscription,
 * /expenses/analytics, /settings/memory) ne sont PAS mappées ici car
 * elles vivent hors du groupe (app)/ (donc pas d'AppShell) et restent
 * accessibles directement.
 */
const PROD_TO_V3_REDIRECTS: Record<string, string> = {
  "/dashboard": "/design-match/dashboard-v3",
  "/coach": "/design-match/coach-v3",
  "/mon-analyse": "/design-match/mon-analyse-v3",
  "/plan": "/design-match/plan-v3",
  "/incomes": "/design-match/revenus-v3",
  "/expenses": "/design-match/depenses-v3",
  "/budget": "/design-match/budget-v3",
  "/goals": "/design-match/objectifs-v3",
  "/savings": "/design-match/epargne-v3",
  "/investments": "/design-match/investissements-v3",
  "/opportunities": "/design-match/opportunites-v3",
  "/profile": "/design-match/profil-v3",
  "/settings": "/design-match/parametres-v3",
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured (build/dev/demo), Supabase auth checks
  // are skipped — but on est encore tenu d'appliquer la redirection
  // prod → V3 sur les stubs (app)/ sinon /dashboard rend l'AppShell
  // ancien (flash). Ce redirect est une pure réécriture d'URL et ne
  // dépend pas de l'auth.
  if (!url || !key) {
    if (PROD_TO_V3_REDIRECTS[request.nextUrl.pathname]) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = PROD_TO_V3_REDIRECTS[request.nextUrl.pathname];
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT with the Supabase auth server. A transient
  // network failure shouldn't 500 every page on the site — degrade gracefully
  // by treating the user as anonymous (protected routes then redirect to /login).
  let user: { id: string } | null = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;
  // Segment-boundary match so /dashboard never accidentally captures
  // a future /dashboard-public or /onboardingfoo route.
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (!user && isProtected) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    // Pour le `next` : on enregistre la cible V3 finale si pathname
    // est une route prod stub. Évite que post-login l'utilisateur
    // atterrisse sur /dashboard (avec flash AppShell) avant de
    // re-rebondir sur /design-match/dashboard-v3.
    const nextTarget = PROD_TO_V3_REDIRECTS[pathname] ?? pathname;
    redirect.searchParams.set("next", nextTarget);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthRoute) {
    const redirect = request.nextUrl.clone();
    // Redirection directe vers le dashboard V3 pour éviter le flash
    // AppShell entre /dashboard stub et /design-match/dashboard-v3.
    redirect.pathname = "/design-match/dashboard-v3";
    redirect.searchParams.delete("next");
    return NextResponse.redirect(redirect);
  }

  // Mapping prod → V3 côté middleware pour les routes stub (app)/.
  // Critique : sans ce redirect early, le layout (app)/layout.tsx
  // se monte (AppShell ancien visuel) avant que le redirect de la
  // page.tsx ne s'exécute. Résultat : flash de l'ancien shell ~500 ms.
  // Avec ce redirect au niveau middleware, l'utilisateur ne voit
  // jamais l'AppShell pour ces routes.
  if (user && PROD_TO_V3_REDIRECTS[pathname]) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = PROD_TO_V3_REDIRECTS[pathname];
    return NextResponse.redirect(redirect);
  }

  // Cheap locale-cookie sync: only when the user is authenticated AND
  // no NEXT_LOCALE cookie is set yet. We hit profiles for a single
  // column once (after login or cookie expiry) — every subsequent
  // request reads the cookie next-intl already trusts. The locale
  // form on /profile also writes the cookie directly so a change is
  // visible without waiting for this branch.
  if (user && !request.cookies.get(LOCALE_COOKIE)) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", user.id)
        .maybeSingle();
      const resolved = resolveAppLocale(profile?.locale ?? null);
      response.cookies.set(LOCALE_COOKIE, resolved, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    } catch {
      // Schema drift / network blip — let next-intl fall back to
      // Accept-Language for this request. Cookie stays unset so we
      // retry on the next navigation.
    }
  }

  return response;
}

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// NB: /reset-password is intentionally NOT here — the password-recovery
// flow lands authenticated and would otherwise be bounced to /dashboard.
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];
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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured, fall through (build/dev still works; routes
  // that need data will show empty / demo-only states).
  if (!url || !key) return response;

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
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthRoute) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.searchParams.delete("next");
    return NextResponse.redirect(redirect);
  }

  return response;
}

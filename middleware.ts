import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request EXCEPT:
     *  - _next/static, _next/image, _next/data (build assets)
     *  - api/ (handled per-route; Stripe webhook must not see middleware)
     *  - auth/ (callback handles its own session exchange)
     *  - favicon.ico, robots.txt, sitemap.xml (public static endpoints)
     *  - any file with a static extension (images, fonts)
     */
    "/((?!_next/static|_next/image|_next/data|api/|auth/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};

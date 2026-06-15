import { NextResponse } from "next/server";

/**
 * Sprint S3 — endpoint de collecte CSP violation reports.
 *
 * Le navigateur POST ici à chaque violation Content-Security-Policy
 * (script-src bloqué, frame-ancestors violé, etc.). On les loge en
 * console serveur — sur Vercel, ils remontent dans les Functions logs
 * + Sentry si SENTRY_DSN est configuré.
 *
 * Format payload (CSP Level 3) :
 *   {
 *     "csp-report": {
 *       "document-uri": "https://liberia.app/dashboard",
 *       "violated-directive": "script-src",
 *       "blocked-uri": "https://evil.com/x.js",
 *       "source-file": "...",
 *       "line-number": 42,
 *       ...
 *     }
 *   }
 *
 * On retourne TOUJOURS 204 — le browser ne doit rien faire de la
 * réponse, et un 4xx/5xx ici déclencherait un bruit inutile en console
 * client. Pas d'auth : ces reports sont posts cross-origin signés par
 * le browser, pas par notre user. Le rate-limit Upstash (s'il est
 * configuré) protège contre le flood.
 *
 * Pas de PII traité — le payload contient des URLs + directives CSP,
 * jamais de session/cookie/user_id. Conforme RGPD/LPD.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ct = request.headers.get("content-type") ?? "";
    let payload: unknown;
    // Le navigateur envoie soit `application/csp-report` (legacy CSP2),
    // soit `application/reports+json` (Reporting API moderne). On
    // parse les deux comme JSON.
    if (
      ct.includes("application/csp-report") ||
      ct.includes("application/reports+json") ||
      ct.includes("application/json")
    ) {
      payload = await request.json();
    } else {
      payload = await request.text();
    }

    // Log structuré pour Vercel Functions / Sentry breadcrumbs.
    console.warn("[csp-violation]", JSON.stringify(payload).slice(0, 2000));
  } catch (err) {
    // Le browser ne sait pas signaler les erreurs de parsing — on log
    // sans faire échouer.
    console.warn("[csp-violation] parse failed", err);
  }

  // 204 No Content : standard pour les endpoints de reporting.
  return new NextResponse(null, { status: 204 });
}

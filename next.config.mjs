import createNextIntlPlugin from "next-intl/plugin";

// Tell next-intl where to find the request-scoped i18n config (locale
// detection + messages loading). Without this the server hooks
// (getTranslations / getLocale) error out at runtime.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Production security headers (Sprint S2-BIS — durcissement).
 *
 * Politique CSP "réaliste" plutôt que nonce-strict :
 *
 * - Next.js 14/15 App Router en mode RSC injecte des `<script>` inline
 *   (hydration, flight payload) qu'il faudrait nonce-tagger un par un
 *   via un middleware — incompatible avec le caching edge + framer-motion
 *   + Sentry inline-init. On accepte `unsafe-inline` sur `script-src` et
 *   on durcit le reste (sources d'origine + isolation iframe + HSTS).
 *
 * - Stripe : `js.stripe.com` (checkout.js, Elements), `api.stripe.com`
 *   (fetch côté client si jamais), `m.stripe.network` (fingerprint
 *   anti-fraude). Ces 3 hôtes DOIVENT être whitelistés sinon checkout
 *   plante.
 *
 * - Supabase : URL projet en `connect-src` (auth + Postgres REST).
 *   `*.supabase.co` couvre tous les sous-domaines storage / functions.
 *
 * - Sentry : `*.sentry.io` ingest + `*.ingest.sentry.io` envelope.
 *   `connect-src` uniquement (le SDK n'exécute pas de remote scripts).
 *
 * - Anthropic : appels server-side seuls → pas d'impact CSP.
 *
 * - Vercel : `vitals.vercel-insights.com` + `vercel.live` (preview
 *   comments) si Speed Insights activé.
 *
 * - `frame-ancestors 'none'` cumulé avec `X-Frame-Options: DENY` →
 *   ceinture + bretelles anti-clickjacking.
 *
 * Limites assumées (non-strict, à durcir si on accepte le surcoût) :
 *   1. `script-src 'unsafe-inline' 'unsafe-eval'` : exige une migration
 *      nonce + désactivation framer-motion JIT pour passer en strict.
 *   2. Pas de `report-uri` configuré : on n'a pas d'endpoint de collecte.
 *      Sentry peut servir, à brancher si besoin de monitoring CSP.
 *   3. `style-src 'unsafe-inline'` est requis par Recharts (génération
 *      SVG inline-styled) — durcir = forker Recharts.
 */
const SUPABASE_HOST = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    return raw ? new URL(raw).host : "*.supabase.co";
  } catch {
    return "*.supabase.co";
  }
})();

const csp = [
  "default-src 'self'",
  // Hydratation Next + framer-motion + Sentry init + Stripe.js.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.vercel-insights.com https://vercel.live",
  // Recharts injecte des inline-styles. fonts.googleapis.com pour
  // Inter + Outfit (next/font passe par CSS variables + @font-face).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // OG images + avatars éventuels Supabase Storage.
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.supabase.co`,
  // Auth Supabase + Stripe + Sentry + Anthropic (server-only mais inutile
  // de bloquer si on veut un wrapper client futur).
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.network https://*.ingest.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://vercel.live`,
  // Stripe Elements + Checkout overlay s'iframent.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  // Anti-clickjacking : nul ne peut iframer LIBERIA.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
  // Workers Sentry replay éventuels.
  "worker-src 'self' blob:",
  // En prod, force HTTPS sur toute la chaîne.
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=(self \"https://checkout.stripe.com\")",
  },
  // Cross-Origin-Opener-Policy isole le contexte de navigation : un
  // popup OAuth (Google / Apple) ouvert depuis LIBERIA ne pourra plus
  // accéder à window.opener. Indispensable pour les social logins S2-E.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Content-Security-Policy", value: csp },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        // CSP appliqué à TOUT sauf à l'API webhook Stripe : un POST
        // signé ne dépend pas d'un browser et la duplication des
        // headers Network n'apporte rien (Stripe ignore CSP, c'est un
        // serveur-à-serveur).
        source: "/((?!api/stripe/webhook).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);

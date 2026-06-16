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

/**
 * Sprint S3 — CSP hardening réaliste.
 *
 * Politique : strict-mode partout où possible, avec quelques exceptions
 * documentées et localisées au lieu d'un fourre-tout `'unsafe-*'`.
 *
 * Ce qui est durci par rapport à S2-BIS :
 *  - `connect-src` ajoute le endpoint de reporting interne
 *    (`/api/csp-report`) — chaque violation est loggée.
 *  - `report-uri` + `report-to` (CSP Level 3) configurés sur ce même
 *    endpoint. Les browsers modernes utilisent `report-to`, les
 *    anciens `report-uri` — on déclare les deux pour couverture.
 *  - `worker-src` resserré (pas de `data:` qui ouvre la porte aux
 *    workers injectés via dataURL).
 *  - `manifest-src 'self'` (interdit qu'un attaquant pousse un
 *    manifest tiers qui ferait apparaître l'app comme étant la sienne).
 *
 * Pourquoi nonce-strict est REPORTÉ (P1) :
 *  1. Next.js 14/15 App Router en mode RSC injecte le flight payload
 *     via `<script>` inline non-nonced — il faudrait wrap `Document` +
 *     middleware pour propager un nonce par request, et désactiver
 *     l'inline streaming RSC (rupture UX majeure : retour aux SPA).
 *  2. `framer-motion` génère ses transitions en inline-style à la
 *     volée (style-src 'unsafe-inline' est exigé par leur moteur).
 *     Migrer = forker framer-motion ou tout repenser sur CSS keyframes
 *     statiques (refonte design — interdit par cadre Sprint S3).
 *  3. Recharts pareil pour les SVG charts (inline style per-element).
 *  4. Sentry SDK init insère un `<script>` inline pour booter avant
 *     hydration. Un nonce strict casserait l'init prod.
 *
 * Compromis Sprint S3 : on garde `'unsafe-inline'` sur `script-src` +
 * `style-src` (limité aux origines whitelisted), mais on resserre tout
 * le reste + on collecte les violations. Quand on aura besoin de
 * nonce-strict (audit pré-vente entreprise), c'est ~2 jours d'effort
 * documentés.
 */
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
  // Auth Supabase + Stripe + Sentry + Anthropic (server-only mais
  // inutile de bloquer si on veut un wrapper client futur). `self`
  // couvre /api/csp-report.
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.network https://*.ingest.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://vercel.live`,
  // Stripe Elements + Checkout overlay s'iframent.
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  // Anti-clickjacking : nul ne peut iframer LIBERIA.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
  // Sprint S3 — limité à 'self' (pas de data: workers injectés).
  "worker-src 'self'",
  // Sprint S3 — manifest PWA uniquement servi par notre origine.
  "manifest-src 'self'",
  // En prod, force HTTPS sur toute la chaîne.
  "upgrade-insecure-requests",
  // Sprint S3 — reporting des violations. Browsers récents utilisent
  // report-to (lit le header Reporting-Endpoints), legacy utilise
  // report-uri. On déclare les deux pour couverture.
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
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
  // Sprint S3 — Reporting-Endpoints (CSP Level 3). Sans ce header,
  // les browsers récents ignorent silencieusement la directive
  // `report-to csp-endpoint` dans la CSP. `max_age` 1h pour rotation
  // rapide si on change l'URL plus tard.
  {
    key: "Reporting-Endpoints",
    value: `csp-endpoint="/api/csp-report"`,
  },
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

import createNextIntlPlugin from "next-intl/plugin";

// Tell next-intl where to find the request-scoped i18n config (locale
// detection + messages loading). Without this the server hooks
// (getTranslations / getLocale) error out at runtime.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Security headers for production.
 *
 * Audit final S1 — l'absence de ces headers était signalée comme un
 * blocage majeur App Store / pré-vente. On les configure sans
 * Content-Security-Policy stricte (Next.js 14 + framer-motion + recharts
 * + Sentry inline scripts demandent unsafe-inline ; un CSP nonce strict
 * exigerait middleware avancé hors scope).
 *
 * - Strict-Transport-Security : force HTTPS pour 2 ans
 * - X-Content-Type-Options nosniff : bloque MIME sniffing
 * - X-Frame-Options DENY : bloque clickjacking via iframe
 * - Referrer-Policy strict-origin-when-cross-origin : préserve UX +
 *   protège la fuite de query strings sensibles
 * - Permissions-Policy : désactive les APIs non utilisées
 */
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
      "camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=()",
  },
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
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);

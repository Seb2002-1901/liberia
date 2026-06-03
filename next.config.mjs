import createNextIntlPlugin from "next-intl/plugin";

// Tell next-intl where to find the request-scoped i18n config (locale
// detection + messages loading). Without this the server hooks
// (getTranslations / getLocale) error out at runtime.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default withNextIntl(nextConfig);

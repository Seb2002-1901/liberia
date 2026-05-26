import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/url";

const baseUrl = getAppBaseUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/budget",
          "/incomes",
          "/expenses",
          "/goals",
          "/profile",
          "/settings",
          "/onboarding",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

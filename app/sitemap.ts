import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/url";

const baseUrl = getAppBaseUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/pricing",
    "/security",
    "/ai-policy",
    "/privacy",
    "/terms",
    "/legal",
    "/demo",
  ];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}

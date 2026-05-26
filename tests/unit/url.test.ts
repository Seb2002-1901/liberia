import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAppBaseUrl } from "@/lib/url";

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (ORIGINAL !== undefined) process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
  else delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("getAppBaseUrl — trailing slash defense", () => {
  it("returns the dev fallback when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });

  it("returns the value as-is when no trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://liberia.app";
    expect(getAppBaseUrl()).toBe("https://liberia.app");
  });

  it("strips a single trailing slash (common operator typo)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://liberia.app/";
    expect(getAppBaseUrl()).toBe("https://liberia.app");
  });

  it("strips multiple trailing slashes (paste artifacts)", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://liberia.app///";
    expect(getAppBaseUrl()).toBe("https://liberia.app");
  });

  it("leaves internal slashes intact", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://liberia.app/preview/";
    expect(getAppBaseUrl()).toBe("https://liberia.app/preview");
  });

  it("produces a URL that concatenates cleanly with /path", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://liberia.app/";
    const url = `${getAppBaseUrl()}/settings/subscription`;
    expect(url).toBe("https://liberia.app/settings/subscription");
    expect(url).not.toMatch(/\/\/settings/);
  });
});

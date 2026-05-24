import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/utils/redirect";

describe("safeRedirectPath", () => {
  it("returns valid relative paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/coach/abc-123")).toBe("/coach/abc-123");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.com")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("///evil.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects URL-scheme injection", () => {
    expect(safeRedirectPath("/javascript:alert(1)")).toBe("/dashboard");
  });

  it("returns fallback for empty / null / undefined", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
  });

  it("accepts query strings on relative paths", () => {
    expect(safeRedirectPath("/dashboard?foo=bar")).toBe("/dashboard?foo=bar");
  });
});

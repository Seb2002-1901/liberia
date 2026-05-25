import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sendEmail } from "@/lib/email/send";

const ORIGINAL = process.env.RESEND_API_KEY;

describe("sendEmail — graceful fallback", () => {
  beforeEach(() => {
    // Ensure Resend is not configured for these tests.
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL) process.env.RESEND_API_KEY = ORIGINAL;
    else delete process.env.RESEND_API_KEY;
  });

  it("no-ops silently when RESEND_API_KEY is absent", async () => {
    const res = await sendEmail({
      to: "test@example.com",
      render: {
        subject: "Test",
        html: "<p>hi</p>",
        text: "hi",
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.skipped).toBe(true);
    }
  });

  it("never throws — caller can keep flowing", async () => {
    await expect(
      sendEmail({
        to: "",
        render: { subject: "x", html: "x", text: "x" },
      }),
    ).resolves.toBeDefined();
  });
});

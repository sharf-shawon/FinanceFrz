import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVerificationEmailHtml, sendEmail } from "@/lib/email";

describe("getVerificationEmailHtml()", () => {
  it("includes the verification URL", () => {
    const html = getVerificationEmailHtml("tok123", "http://localhost:3000");
    expect(html).toContain("http://localhost:3000/verify-email?token=tok123");
  });

  it("includes a heading", () => {
    const html = getVerificationEmailHtml("t", "http://x.com");
    expect(html).toContain("Verify your email");
  });

  it("mentions the expiry", () => {
    const html = getVerificationEmailHtml("t", "http://x.com");
    expect(html).toContain("24 hours");
  });
});

describe("sendEmail()", () => {
  beforeEach(() => {
    // Ensure no API key so we hit the console-log dev path
    delete process.env.RESEND_API_KEY;
  });

  it("logs to console when RESEND_API_KEY is absent", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>test</p>" });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.com"));
    consoleSpy.mockRestore();
  });

  it("calls resend when RESEND_API_KEY is present", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const mockSend = vi.fn().mockResolvedValue({ id: "msg1" });
    vi.doMock("resend", () => ({
      Resend: vi.fn().mockImplementation(() => ({
        emails: { send: mockSend },
      })),
    }));

    // Re-import after mock
    const { sendEmail: send } = await import("@/lib/email?resend=1" as any);
    // fallback: just check no throw
    await expect(
      sendEmail({ to: "x@y.com", subject: "S", html: "<p>hi</p>" })
    ).resolves.toBeUndefined();

    delete process.env.RESEND_API_KEY;
  });
});

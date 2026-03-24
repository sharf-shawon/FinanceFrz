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
    delete process.env.RESEND_API_KEY;
  });

  it("logs to console when RESEND_API_KEY is absent", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({ to: "a@b.com", subject: "Hi", html: "<p>test</p>" });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.com"));
    consoleSpy.mockRestore();
  });

  it("logs subject when RESEND_API_KEY is absent", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({ to: "x@y.com", subject: "MySubject", html: "<p>hi</p>" });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("MySubject"));
    consoleSpy.mockRestore();
  });
});

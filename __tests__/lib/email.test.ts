import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVerificationEmailHtml, sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Mock the resend module so tests that set RESEND_API_KEY don't make real calls
// ---------------------------------------------------------------------------
const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockEmailSend };
  },
}));

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
    delete process.env.EMAIL_FROM;
    vi.clearAllMocks();
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

  it("calls Resend.emails.send when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "test-key-123";
    await sendEmail({ to: "b@c.com", subject: "Test", html: "<p>hello</p>" });
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "b@c.com",
        subject: "Test",
        html: "<p>hello</p>",
      })
    );
  });

  it("uses default from address when EMAIL_FROM is not set", async () => {
    process.env.RESEND_API_KEY = "test-key-456";
    await sendEmail({ to: "c@d.com", subject: "Test2", html: "<p>hi</p>" });
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@financefrz.com" })
    );
  });

  it("uses EMAIL_FROM env var when set", async () => {
    process.env.RESEND_API_KEY = "test-key-789";
    process.env.EMAIL_FROM = "custom@example.com";
    await sendEmail({ to: "d@e.com", subject: "Test3", html: "<p>yo</p>" });
    expect(mockEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "custom@example.com" })
    );
  });
});

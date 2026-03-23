import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq } from "../helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockTokenCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    verificationToken: { create: mockTokenCreate },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed_password"),
    compare: vi.fn(),
  },
  hash: vi.fn(async () => "hashed_password"),
  compare: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  generateToken: vi.fn(() => "verify-token-abc"),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => {}),
  getVerificationEmailHtml: vi.fn(() => "<p>verify</p>"),
}));

import { POST } from "@/app/api/auth/register/route";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  it("returns 400 when email is invalid", async () => {
    const res = await POST(
      makeReq("/api/auth/register", "POST", { email: "not-an-email", password: "password123" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short (< 8 chars)", async () => {
    const res = await POST(
      makeReq("/api/auth/register", "POST", { email: "a@b.com", password: "short" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/8/);
  });

  it("returns 400 when email is already in use", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeReq("/api/auth/register", "POST", { email: "taken@b.com", password: "password123" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("already in use");
  });

  it("creates user and sends verification email on valid input", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "new-user", email: "new@b.com", name: null });
    mockTokenCreate.mockResolvedValue({});

    const { sendEmail } = await import("@/lib/email");
    const res = await POST(
      makeReq("/api/auth/register", "POST", { email: "new@b.com", password: "password123" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("email");
    expect(sendEmail).toHaveBeenCalledOnce();
    expect((sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0].to).toBe("new@b.com");
  });

  it("creates user with optional name field", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "u2", email: "x@y.com", name: "Bob" });
    mockTokenCreate.mockResolvedValue({});

    await POST(
      makeReq("/api/auth/register", "POST", {
        email: "x@y.com",
        password: "password123",
        name: "Bob",
      })
    );
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Bob" }),
      })
    );
  });

  it("hashes the password before saving", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: "u3", email: "z@z.com" });
    mockTokenCreate.mockResolvedValue({});

    await POST(
      makeReq("/api/auth/register", "POST", { email: "z@z.com", password: "password123" })
    );
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed_password" }),
      })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB crash"));
    const res = await POST(
      makeReq("/api/auth/register", "POST", { email: "a@b.com", password: "password123" })
    );
    expect(res.status).toBe(500);
  });
});

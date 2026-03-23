import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeReq } from "../helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUserFindUnique = vi.fn();
const mockSessionCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    userSession: { create: mockSessionCreate },
  },
}));

// bcryptjs compare
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

const { default: bcrypt } = await import("bcryptjs");
const bcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>;

// generateToken
vi.mock("@/lib/auth", () => ({
  generateToken: vi.fn(() => "test-session-token"),
}));

import { POST } from "@/app/api/auth/login/route";

const BASE_USER = {
  id: "u1",
  email: "a@b.com",
  passwordHash: "$2b$12$hashed",
  name: "Alice",
  emailVerifiedAt: new Date("2024-01-01"),
  locale: "en",
  themePreference: "system",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(makeReq("/api/auth/login", "POST", { password: "pass" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeReq("/api/auth/login", "POST", { email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "nope@x.com", password: "pw" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when password is incorrect", async () => {
    mockUserFindUnique.mockResolvedValue(BASE_USER);
    bcryptCompare.mockResolvedValue(false);
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "a@b.com", password: "wrong" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when email is not verified", async () => {
    mockUserFindUnique.mockResolvedValue({ ...BASE_USER, emailVerifiedAt: null });
    bcryptCompare.mockResolvedValue(true);
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "a@b.com", password: "correct" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with user data and sets session cookie on success", async () => {
    mockUserFindUnique.mockResolvedValue(BASE_USER);
    bcryptCompare.mockResolvedValue(true);
    mockSessionCreate.mockResolvedValue({});
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "a@b.com", password: "correct" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.email).toBe("a@b.com");
    // Should set a session_token cookie
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("session_token=test-session-token");
    expect(cookie).toContain("HttpOnly");
  });

  it("session cookie is HttpOnly", async () => {
    mockUserFindUnique.mockResolvedValue(BASE_USER);
    bcryptCompare.mockResolvedValue(true);
    mockSessionCreate.mockResolvedValue({});
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "a@b.com", password: "correct" })
    );
    const cookie = res.headers.get("set-cookie");
    expect(cookie?.toLowerCase()).toContain("httponly");
  });

  it("returns 429 after rate-limit exceeded (11 rapid requests from same IP)", async () => {
    // Use a unique IP to avoid interference from other test runs
    const ip = "1.2.3.99";
    mockUserFindUnique.mockResolvedValue(null); // all fail with 401

    let last!: Response;
    for (let i = 0; i <= 10; i++) {
      const req = new (await import("next/server.js")).NextRequest(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({ email: "a@b.com", password: "pw" }),
        }
      );
      last = await POST(req);
    }
    expect(last.status).toBe(429);
  });

  it("returns 500 on unexpected errors", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB crash"));
    const res = await POST(
      makeReq("/api/auth/login", "POST", { email: "a@b.com", password: "pw" })
    );
    expect(res.status).toBe(500);
  });
});

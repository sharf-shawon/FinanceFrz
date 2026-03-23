import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq } from "../helpers";

const {
  mockFindUnique,
  mockUserUpdate,
  mockTokenDelete,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockTokenDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findUnique: mockFindUnique,
      delete: mockTokenDelete,
    },
    user: { update: mockUserUpdate },
  },
}));

import { POST } from "@/app/api/auth/verify/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/verify", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(makeReq("/api/auth/verify", "POST", {}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Token");
  });

  it("returns 400 when token is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq("/api/auth/verify", "POST", { token: "bad-token" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid");
  });

  it("returns 400 when token is expired", async () => {
    mockFindUnique.mockResolvedValue({
      token: "tok",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(makeReq("/api/auth/verify", "POST", { token: "tok" }));
    expect(res.status).toBe(400);
  });

  it("verifies email and returns 200 on valid token", async () => {
    mockFindUnique.mockResolvedValue({
      token: "valid-tok",
      userId: "u1",
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    mockUserUpdate.mockResolvedValue({});
    mockTokenDelete.mockResolvedValue({});
    const res = await POST(makeReq("/api/auth/verify", "POST", { token: "valid-tok" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("verified");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
      })
    );
    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { token: "valid-tok" } });
  });

  it("returns 500 on unexpected errors", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB crash"));
    const res = await POST(makeReq("/api/auth/verify", "POST", { token: "t" }));
    expect(res.status).toBe(500);
  });
});

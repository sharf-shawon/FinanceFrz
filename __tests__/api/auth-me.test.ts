import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server.js";

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

import { GET } from "@/app/api/auth/me/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns null when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    const user = {
      id: "u1",
      email: "a@b.com",
      name: "Alice",
      locale: "en",
      themePreference: "system",
      emailVerifiedAt: new Date("2024-01-01"),
    };
    mockGetCurrentUser.mockResolvedValue(user);
    const req = new NextRequest("http://localhost:3000/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("a@b.com");
    expect(json.id).toBe("u1");
  });
});

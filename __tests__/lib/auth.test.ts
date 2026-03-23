import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock factories so they are available when vi.mock() factories run
// ---------------------------------------------------------------------------
const { mockFindUnique, mockCookiesGet } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCookiesGet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSession: { findUnique: mockFindUnique },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookiesGet })),
}));

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------
import {
  getSession,
  getCurrentUser,
  requireAuth,
  requireVerifiedAuth,
  generateToken,
} from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeSession = (overrides: Partial<{
  token: string;
  expiresAt: Date;
  user: Record<string, unknown>;
}> = {}) => ({
  token: overrides.token ?? "valid-token",
  expiresAt: overrides.expiresAt ?? new Date(Date.now() + 1_000_000),
  user: overrides.user ?? {
    id: "u1",
    email: "test@example.com",
    name: "Test",
    emailVerifiedAt: new Date(),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// generateToken()
// ---------------------------------------------------------------------------
describe("generateToken()", () => {
  it("returns a 64-char hex string", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// getSession()
// ---------------------------------------------------------------------------
describe("getSession()", () => {
  it("returns null when no cookie is present", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns null when session is not found in DB", async () => {
    mockCookiesGet.mockReturnValue({ value: "some-token" });
    mockFindUnique.mockResolvedValue(null);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns null when session is expired", async () => {
    mockCookiesGet.mockReturnValue({ value: "expired-token" });
    mockFindUnique.mockResolvedValue(
      makeSession({ expiresAt: new Date(Date.now() - 1000) })
    );
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns session when valid", async () => {
    const session = makeSession();
    mockCookiesGet.mockReturnValue({ value: session.token });
    mockFindUnique.mockResolvedValue(session);
    const result = await getSession();
    expect(result).toEqual(session);
  });
});

// ---------------------------------------------------------------------------
// getCurrentUser()
// ---------------------------------------------------------------------------
describe("getCurrentUser()", () => {
  it("returns null when no session exists", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns the user from the session", async () => {
    const session = makeSession();
    mockCookiesGet.mockReturnValue({ value: session.token });
    mockFindUnique.mockResolvedValue(session);
    const user = await getCurrentUser();
    expect(user).toEqual(session.user);
  });
});

// ---------------------------------------------------------------------------
// requireAuth()
// ---------------------------------------------------------------------------
describe("requireAuth()", () => {
  it("throws Unauthorized when no user", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });

  it("returns user when authenticated", async () => {
    const session = makeSession();
    mockCookiesGet.mockReturnValue({ value: session.token });
    mockFindUnique.mockResolvedValue(session);
    const user = await requireAuth();
    expect(user).toEqual(session.user);
  });
});

// ---------------------------------------------------------------------------
// requireVerifiedAuth()
// ---------------------------------------------------------------------------
describe("requireVerifiedAuth()", () => {
  it("throws Unauthorized when no session", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    await expect(requireVerifiedAuth()).rejects.toThrow("Unauthorized");
  });

  it("throws Email not verified when emailVerifiedAt is null", async () => {
    const session = makeSession({
      user: { id: "u1", email: "x@y.com", emailVerifiedAt: null },
    });
    mockCookiesGet.mockReturnValue({ value: session.token });
    mockFindUnique.mockResolvedValue(session);
    await expect(requireVerifiedAuth()).rejects.toThrow("Email not verified");
  });

  it("returns user when verified", async () => {
    const session = makeSession();
    mockCookiesGet.mockReturnValue({ value: session.token });
    mockFindUnique.mockResolvedValue(session);
    const user = await requireVerifiedAuth();
    expect(user).toEqual(session.user);
  });
});

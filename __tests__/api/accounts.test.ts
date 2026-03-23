import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Hoist mock factories so they are available at vi.mock() call time
// ---------------------------------------------------------------------------
const { mockRequireVerifiedAuth, mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockRequireVerifiedAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

import { GET, POST } from "@/app/api/accounts/route";

const user = makeVerifiedUser();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/accounts
// ---------------------------------------------------------------------------
describe("GET /api/accounts", () => {
  it("returns 401 when not authenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when email not verified", async () => {
    mockUnauthed(mockRequireVerifiedAuth, "Email not verified");
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Email not verified");
  });

  it("returns empty array when user has no accounts", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns accounts for the authenticated user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const accounts = [
      { id: "a1", name: "Checking", type: "bank", currency: "USD", userId: user.id },
    ];
    mockFindMany.mockResolvedValue(accounts);
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(accounts);
  });

  it("queries with the correct userId filter", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    await GET(makeReq("/api/accounts", "GET"));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: user.id } })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue(new Error("DB failure"));
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/accounts
// ---------------------------------------------------------------------------
describe("POST /api/accounts", () => {
  it("returns 401 when not authenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await POST(
      makeReq("/api/accounts", "POST", { name: "Cash", type: "cash" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(makeReq("/api/accounts", "POST", { type: "cash" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/accounts", "POST", { name: "X", type: "bitcoin" })
    );
    expect(res.status).toBe(400);
  });

  it("creates account and returns 201", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const created = { id: "a2", name: "Savings", type: "savings", currency: "USD", userId: user.id };
    mockCreate.mockResolvedValue(created);
    const res = await POST(
      makeReq("/api/accounts", "POST", { name: "Savings", type: "savings" })
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it("passes userId from auth to prisma.create", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockResolvedValue({ id: "a3" });
    await POST(makeReq("/api/accounts", "POST", { name: "Inv", type: "investment" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: user.id }) })
    );
  });

  it("uses default currency USD when not provided", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockResolvedValue({ id: "a4", currency: "USD" });
    await POST(makeReq("/api/accounts", "POST", { name: "N", type: "cash" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currency: "USD" }) })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockRejectedValue(new Error("DB failure"));
    const res = await POST(
      makeReq("/api/accounts", "POST", { name: "X", type: "cash" })
    );
    expect(res.status).toBe(500);
  });
});

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

  it("returns accounts with computed balance field", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const accounts = [
      {
        id: "a1",
        name: "Checking",
        type: "bank",
        currency: "BDT",
        userId: user.id,
        transactions: [
          { type: "income", amount: 1000 },
          { type: "expense", amount: 200 },
        ],
      },
    ];
    mockFindMany.mockResolvedValue(accounts);
    const res = await GET(makeReq("/api/accounts", "GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].balance).toBe(800);
    // transactions array should not be in response
    expect(json[0]).not.toHaveProperty("transactions");
  });

  it("computes zero balance for account with no transactions", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([
      { id: "a2", name: "Empty", type: "cash", currency: "BDT", userId: user.id, transactions: [] },
    ]);
    const res = await GET(makeReq("/api/accounts", "GET"));
    const json = await res.json();
    expect(json[0].balance).toBe(0);
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

  it("returns 500 when a non-Error is thrown in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue("plain string");
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

  it("creates account and returns 201 with balance: 0", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const created = { id: "a2", name: "Savings", type: "savings", currency: "BDT", userId: user.id };
    mockCreate.mockResolvedValue(created);
    const res = await POST(
      makeReq("/api/accounts", "POST", { name: "Savings", type: "savings" })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("a2");
    expect(json.balance).toBe(0);
  });

  it("passes userId from auth to prisma.create", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockResolvedValue({ id: "a3" });
    await POST(makeReq("/api/accounts", "POST", { name: "Inv", type: "investment" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: user.id }) })
    );
  });

  it("uses default currency BDT when not provided", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockResolvedValue({ id: "a4", currency: "BDT" });
    await POST(makeReq("/api/accounts", "POST", { name: "N", type: "cash" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currency: "BDT" }) })
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

  it("returns 500 when a non-Error is thrown in POST", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockRejectedValue("string error");
    const res = await POST(makeReq("/api/accounts", "POST", { name: "Y", type: "cash" }));
    expect(res.status).toBe(500);
  });
});

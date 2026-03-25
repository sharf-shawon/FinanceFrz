import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Hoist mock factories
// ---------------------------------------------------------------------------
const { mockRequireVerifiedAuth, mockFindMany, mockCount, mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockRequireVerifiedAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
    },
    account: { findFirst: mockFindFirst },
    category: { findFirst: mockFindFirst },
  },
}));

import { GET, POST } from "@/app/api/transactions/route";

const user = makeVerifiedUser();
const account = { id: "acc1", name: "Checking", currency: "BDT", userId: user.id };
const category = { id: "cat1", name: "Food", color: "#ef4444", type: "expense", userId: user.id };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/transactions
// ---------------------------------------------------------------------------
describe("GET /api/transactions", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await GET(makeReq("/api/transactions", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns paginated result with defaults (page=1, limit=20)", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const res = await GET(makeReq("/api/transactions", "GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ transactions: [], total: 0, page: 1, limit: 20 });
  });

  it("respects page and limit query params", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(5);
    const res = await GET(
      makeReq("/api/transactions", "GET", undefined, { page: "2", limit: "5" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ page: 2, limit: 5 });
  });

  it("filters by type query param", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await GET(makeReq("/api/transactions", "GET", undefined, { type: "expense" }));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "expense" }),
      })
    );
  });

  it("filters by accountId and categoryId", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await GET(
      makeReq("/api/transactions", "GET", undefined, {
        accountId: "acc1",
        categoryId: "cat1",
      })
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: "acc1", categoryId: "cat1" }),
      })
    );
  });

  it("filters by dateFrom and dateTo", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await GET(
      makeReq("/api/transactions", "GET", undefined, {
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
      })
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeReq("/api/transactions", "GET"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when a non-Error is thrown in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue("plain error");
    const res = await GET(makeReq("/api/transactions", "GET"));
    expect(res.status).toBe(500);
  });

  it("returns 401 when email not verified in GET", async () => {
    mockUnauthed(mockRequireVerifiedAuth, "Email not verified");
    const res = await GET(makeReq("/api/transactions", "GET"));
    expect(res.status).toBe(401);
  });

  it("filters with only dateFrom (no dateTo) in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await GET(makeReq("/api/transactions", "GET", undefined, { dateFrom: "2024-01-01" }));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it("filters with only dateTo (no dateFrom) in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await GET(makeReq("/api/transactions", "GET", undefined, { dateTo: "2024-12-31" }));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/transactions
// ---------------------------------------------------------------------------
describe("POST /api/transactions", () => {
  const validBody = {
    accountId: "acc1",
    categoryId: "cat1",
    type: "expense",
    amount: 50.0,
    date: "2024-06-01T12:00:00Z",
    description: "Lunch",
  };

  const uncategorizedBody = {
    accountId: "acc1",
    type: "expense",
    amount: 50.0,
    date: "2024-06-01T12:00:00Z",
    description: "Uncategorized expense",
  };

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(makeReq("/api/transactions", "POST", { type: "expense" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is not positive", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/transactions", "POST", { ...validBody, amount: -10 })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when account does not belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValueOnce(null); // account → not found
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Account");
  });

  it("returns 400 when category is provided but does not belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst
      .mockResolvedValueOnce(account) // account → found
      .mockResolvedValueOnce(null); // category → not found
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Category");
  });

  it("creates transaction with category and returns 201", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce(category);
    const created = {
      id: "t1",
      ...validBody,
      account,
      category,
      userId: user.id,
    };
    mockCreate.mockResolvedValue(created);
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("t1");
  });

  it("creates uncategorized transaction (null categoryId) and returns 201", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValueOnce(account); // only account lookup
    const created = {
      id: "t2",
      ...uncategorizedBody,
      categoryId: null,
      category: null,
      account,
      userId: user.id,
    };
    mockCreate.mockResolvedValue(created);
    const res = await POST(makeReq("/api/transactions", "POST", uncategorizedBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("t2");
    expect(json.category).toBeNull();
  });

  it("creates transaction with explicit null categoryId and returns 201", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValueOnce(account);
    const created = {
      id: "t3",
      ...uncategorizedBody,
      categoryId: null,
      category: null,
      account,
      userId: user.id,
    };
    mockCreate.mockResolvedValue(created);
    const res = await POST(
      makeReq("/api/transactions", "POST", { ...uncategorizedBody, categoryId: null })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.categoryId).toBeNull();
  });

  it("passes null categoryId to prisma.create when uncategorized", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValueOnce(account);
    mockCreate.mockResolvedValue({ id: "t4", categoryId: null, category: null, account });
    await POST(makeReq("/api/transactions", "POST", uncategorizedBody));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: null }),
      })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue(new Error("crash"));
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(500);
  });

  it("returns 500 when a non-Error is thrown in POST", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue("plain error");
    const res = await POST(makeReq("/api/transactions", "POST", validBody));
    expect(res.status).toBe(500);
  });
});

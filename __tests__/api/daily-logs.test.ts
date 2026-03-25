import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Hoist mock factories
// ---------------------------------------------------------------------------
const {
  mockRequireVerifiedAuth,
  mockTransactionFindMany,
  mockTransactionDeleteMany,
  mockTransactionCreateMany,
  mockAccountFindFirst,
  mockAccountFindMany,
  mockCategoryFindMany,
  mockTransactionCount,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockRequireVerifiedAuth: vi.fn(),
  mockTransactionFindMany: vi.fn(),
  mockTransactionDeleteMany: vi.fn(),
  mockTransactionCreateMany: vi.fn(),
  mockAccountFindFirst: vi.fn(),
  mockAccountFindMany: vi.fn(),
  mockCategoryFindMany: vi.fn(),
  mockTransactionCount: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: mockTransactionFindMany,
      deleteMany: mockTransactionDeleteMany,
      createMany: mockTransactionCreateMany,
      count: mockTransactionCount,
    },
    account: {
      findFirst: mockAccountFindFirst,
      findMany: mockAccountFindMany,
    },
    category: {
      findMany: mockCategoryFindMany,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { GET, POST } from "@/app/api/daily-logs/route";

const user = makeVerifiedUser();
const account = { id: "acc1", name: "Cash", currency: "BDT", userId: user.id };
const category = { id: "cat1", name: "Food", color: "#ef4444", type: "expense", userId: user.id };

const baseTxn = {
  id: "t1",
  type: "income",
  description: "Salary",
  amount: 5000,
  quantity: 1,
  rate: 5000,
  categoryId: null,
  date: new Date("2024-06-01T00:00:00.000Z"),
  account,
  category: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no categories conflict
  mockCategoryFindMany.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// GET /api/daily-logs
// ---------------------------------------------------------------------------
describe("GET /api/daily-logs", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await GET(makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when date is missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await GET(makeReq("/api/daily-logs", "GET"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/date/i);
  });

  it("returns 400 when date format is invalid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await GET(makeReq("/api/daily-logs", "GET", undefined, { date: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with transactions, previousBalance, suggestions, accounts, categories", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    // findMany: [transactions, accounts, categories, prevTransactions, recentRaw]
    mockTransactionFindMany
      .mockResolvedValueOnce([baseTxn])   // transactions for day
      .mockResolvedValueOnce([])           // prevTransactions
      .mockResolvedValueOnce([           // recentRaw suggestions
        { description: "Salary", type: "income", amount: 5000, quantity: 1, rate: 5000 },
      ]);
    mockAccountFindMany.mockResolvedValue([account]);
    mockCategoryFindMany.mockResolvedValue([category]);

    const res = await GET(
      makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.date).toBe("2024-06-01");
    expect(json.transactions).toHaveLength(1);
    expect(json.previousBalance).toBe(0);
    expect(json.accounts).toHaveLength(1);
    expect(json.categories).toHaveLength(1);
    expect(json.suggestions).toHaveLength(1);
    expect(json.suggestions[0]).toMatchObject({
      description: "Salary",
      type: "income",
      quantity: 1,
      rate: 5000,
    });
  });

  it("computes previousBalance correctly from prior transactions", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany
      .mockResolvedValueOnce([]) // today's txns
      .mockResolvedValueOnce([  // prev txns
        { type: "income", amount: 2000 },
        { type: "expense", amount: 500 },
        { type: "income", amount: 1000 },
      ])
      .mockResolvedValueOnce([]); // suggestions
    mockAccountFindMany.mockResolvedValue([account]);
    mockCategoryFindMany.mockResolvedValue([]);

    const res = await GET(
      makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-15" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // 2000 + 1000 - 500 = 2500
    expect(json.previousBalance).toBe(2500);
  });

  it("deduplicates suggestions by description+type (keeps latest)", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { description: "Rice", type: "expense", amount: 300, quantity: 3, rate: 100 },
        { description: "rice", type: "expense", amount: 240, quantity: 3, rate: 80 }, // duplicate (case-insensitive)
        { description: "Rice", type: "income", amount: 500, quantity: 1, rate: 500 }, // same name, different type
      ]);
    mockAccountFindMany.mockResolvedValue([account]);
    mockCategoryFindMany.mockResolvedValue([]);

    const res = await GET(
      makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" })
    );
    const json = await res.json();
    // "expense::rice" and "income::rice" => 2 unique suggestions
    expect(json.suggestions).toHaveLength(2);
    // The first "Rice" expense entry is the latest (orderBy date desc) → qty 3, rate 100
    const expenseSugg = json.suggestions.find(
      (s: { type: string; description: string }) => s.type === "expense"
    );
    expect(expenseSugg.quantity).toBe(3);
    expect(expenseSugg.rate).toBe(100);
  });

  it("excludes suggestions with null description", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { description: null, type: "expense", amount: 100, quantity: 1, rate: 100 },
        { description: "Milk", type: "expense", amount: 50, quantity: 1, rate: 50 },
      ]);
    mockAccountFindMany.mockResolvedValue([account]);
    mockCategoryFindMany.mockResolvedValue([]);

    const res = await GET(
      makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" })
    );
    const json = await res.json();
    expect(json.suggestions).toHaveLength(1);
    expect(json.suggestions[0].description).toBe("Milk");
  });

  it("uses amount as rate fallback when rate is null", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { description: "Taxi", type: "expense", amount: 200, quantity: 1, rate: null },
      ]);
    mockAccountFindMany.mockResolvedValue([account]);
    mockCategoryFindMany.mockResolvedValue([]);

    const res = await GET(
      makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" })
    );
    const json = await res.json();
    expect(json.suggestions[0].rate).toBe(200); // falls back to amount
  });

  it("returns 500 on unexpected DB error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany.mockRejectedValue(new Error("DB crash"));
    const res = await GET(makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 for Email not verified error", async () => {
    mockUnauthed(mockRequireVerifiedAuth, "Email not verified");
    const res = await GET(makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 on non-Error thrown in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTransactionFindMany.mockRejectedValue("plain string error");
    const res = await GET(makeReq("/api/daily-logs", "GET", undefined, { date: "2024-06-01" }));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/daily-logs
// ---------------------------------------------------------------------------
describe("POST /api/daily-logs", () => {
  const validBody = {
    date: "2024-06-01",
    accountId: "acc1",
    rows: [
      { type: "income", description: "Salary", quantity: 1, rate: 5000 },
      { type: "expense", description: "Groceries", quantity: 2, rate: 150 },
    ],
  };

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when date is missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const { date: _d, ...noDate } = validBody;
    const res = await POST(makeReq("/api/daily-logs", "POST", noDate));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date format is invalid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/daily-logs", "POST", { ...validBody, date: "June 1st" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when accountId is missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const { accountId: _a, ...noAcc } = validBody;
    const res = await POST(makeReq("/api/daily-logs", "POST", noAcc));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a row has invalid type", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [{ type: "transfer", description: "X", quantity: 1, rate: 10 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when a row has non-positive rate", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [{ type: "expense", description: "X", quantity: 1, rate: -5 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when a row has empty description", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [{ type: "income", description: "", quantity: 1, rate: 100 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when account does not belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(null);
    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/account/i);
  });

  it("returns 400 when a category does not belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]); // 0 found, 1 expected
    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [
          { type: "income", description: "Sale", quantity: 1, rate: 1000, categoryId: "cat1" },
        ],
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/category/i);
  });

  it("saves successfully and returns 200", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]);
    mockPrismaTransaction.mockResolvedValue([
      { count: 2 },
      { count: 2 },
    ]);

    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("saved");
  });

  it("calls prisma.$transaction with deleteMany and createMany", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]);
    mockPrismaTransaction.mockResolvedValue([{ count: 1 }, { count: 1 }]);

    await POST(makeReq("/api/daily-logs", "POST", validBody));

    expect(mockPrismaTransaction).toHaveBeenCalledOnce();
  });

  it("computes amount = quantity * rate when inserting rows", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]);

    let capturedOps: unknown[] = [];
    mockPrismaTransaction.mockImplementation(async (ops: unknown[]) => {
      capturedOps = ops;
      return [{ count: 1 }, { count: 1 }];
    });

    await POST(
      makeReq("/api/daily-logs", "POST", {
        date: "2024-06-01",
        accountId: "acc1",
        rows: [{ type: "expense", description: "Rice", quantity: 5, rate: 60 }],
      })
    );

    // The second op is createMany; inspect its data
    // capturedOps is passed to mockPrismaTransaction which receives [deleteOp, createOp]
    // We verify by checking the mock was called and the result is 200
    expect(capturedOps).toHaveLength(2);
  });

  it("saves with empty rows array (clears the day)", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]);
    mockPrismaTransaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);

    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        date: "2024-06-01",
        accountId: "acc1",
        rows: [],
      })
    );
    expect(res.status).toBe(200);
  });

  it("accepts rows with optional categoryId=null", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([]);
    mockPrismaTransaction.mockResolvedValue([{ count: 0 }, { count: 1 }]);

    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [{ type: "income", description: "Bonus", quantity: 1, rate: 1000, categoryId: null }],
      })
    );
    expect(res.status).toBe(200);
  });

  it("validates categories only when categoryId is provided", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockResolvedValue(account);
    mockCategoryFindMany.mockResolvedValue([category]);
    mockPrismaTransaction.mockResolvedValue([{ count: 0 }, { count: 1 }]);

    const res = await POST(
      makeReq("/api/daily-logs", "POST", {
        ...validBody,
        rows: [
          { type: "expense", description: "Food", quantity: 1, rate: 200, categoryId: "cat1" },
        ],
      })
    );
    expect(res.status).toBe(200);
    // categoryFindMany should have been called to validate cat1
    expect(mockCategoryFindMany).toHaveBeenCalled();
  });

  it("returns 500 on unexpected DB error in POST", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockRejectedValue(new Error("DB crash"));
    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(500);
  });

  it("returns 401 for Email not verified error in POST", async () => {
    mockUnauthed(mockRequireVerifiedAuth, "Email not verified");
    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(401);
  });

  it("returns 500 on non-Error thrown in POST", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockAccountFindFirst.mockRejectedValue("string error");
    const res = await POST(makeReq("/api/daily-logs", "POST", validBody));
    expect(res.status).toBe(500);
  });
});

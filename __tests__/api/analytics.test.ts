import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRequireVerifiedAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireVerifiedAuth: mockRequireVerifiedAuth,
}));

const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: { findMany: mockFindMany },
  },
}));

import { GET } from "@/app/api/analytics/route";

const user = makeVerifiedUser();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTxn(
  type: "income" | "expense",
  amount: number,
  date: string,
  categoryId = "cat1",
  categoryName = "Food",
  categoryColor = "#ef4444"
) {
  return {
    id: `t-${Math.random()}`,
    type,
    amount,
    date: new Date(date),
    categoryId,
    category: { id: categoryId, name: categoryName, color: categoryColor },
    account: { id: "acc1", name: "Checking", currency: "USD" },
  };
}

// ---------------------------------------------------------------------------
// GET /api/analytics
// ---------------------------------------------------------------------------
describe("GET /api/analytics", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await GET(makeReq("/api/analytics", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns zeros for an empty transaction set", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    const res = await GET(makeReq("/api/analytics", "GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toEqual({ totalIncome: 0, totalExpense: 0, net: 0 });
    expect(json.categoryBreakdown).toEqual([]);
    expect(json.timeSeries).toEqual([]);
  });

  it("computes correct totals for mixed transactions", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([
      makeTxn("income", 1000, "2024-01-10"),
      makeTxn("expense", 300, "2024-01-11"),
      makeTxn("expense", 200, "2024-01-12"),
    ]);
    const res = await GET(makeReq("/api/analytics", "GET"));
    const { summary } = await res.json();
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpense).toBe(500);
    expect(summary.net).toBe(500);
  });

  it("groups expenses by category in categoryBreakdown", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([
      makeTxn("expense", 100, "2024-01-01", "cat1", "Food"),
      makeTxn("expense", 50, "2024-01-02", "cat1", "Food"),
      makeTxn("expense", 200, "2024-01-03", "cat2", "Transport"),
    ]);
    const res = await GET(makeReq("/api/analytics", "GET"));
    const { categoryBreakdown } = await res.json();
    // sorted descending by total
    expect(categoryBreakdown[0].id).toBe("cat2");
    expect(categoryBreakdown[0].total).toBe(200);
    expect(categoryBreakdown[1].id).toBe("cat1");
    expect(categoryBreakdown[1].total).toBe(150);
  });

  it("does not include income transactions in categoryBreakdown", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([
      makeTxn("income", 500, "2024-01-01", "cat-income", "Salary"),
      makeTxn("expense", 100, "2024-01-02", "cat-exp", "Food"),
    ]);
    const res = await GET(makeReq("/api/analytics", "GET"));
    const { categoryBreakdown } = await res.json();
    expect(categoryBreakdown).toHaveLength(1);
    expect(categoryBreakdown[0].id).toBe("cat-exp");
  });

  it("builds timeSeries grouped by date", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([
      makeTxn("income", 100, "2024-01-05"),
      makeTxn("expense", 40, "2024-01-05"),
      makeTxn("income", 200, "2024-01-10"),
    ]);
    const res = await GET(makeReq("/api/analytics", "GET"));
    const { timeSeries } = await res.json();
    expect(timeSeries).toHaveLength(2);
    const jan5 = timeSeries.find((t: { date: string }) => t.date === "2024-01-05");
    expect(jan5).toBeDefined();
    expect(jan5.income).toBe(100);
    expect(jan5.expense).toBe(40);
  });

  it("filters by dateFrom and dateTo", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    await GET(
      makeReq("/api/analytics", "GET", undefined, {
        dateFrom: "2024-01-01",
        dateTo: "2024-06-30",
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

  it("filters by accountId when provided", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    await GET(
      makeReq("/api/analytics", "GET", undefined, { accountId: "acc1" })
    );
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountId: "acc1" }),
      })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue(new Error("DB down"));
    const res = await GET(makeReq("/api/analytics", "GET"));
    expect(res.status).toBe(500);
  });
});

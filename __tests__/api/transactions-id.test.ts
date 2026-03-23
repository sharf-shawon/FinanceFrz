import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRequireVerifiedAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireVerifiedAuth: mockRequireVerifiedAuth,
}));

const mockTxFindFirst = vi.fn();
const mockAccFindFirst = vi.fn();
const mockCatFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findFirst: mockTxFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
    account: { findFirst: mockAccFindFirst },
    category: { findFirst: mockCatFindFirst },
  },
}));

import { PUT, DELETE } from "@/app/api/transactions/[id]/route";

const user = makeVerifiedUser();
const account = { id: "acc1", name: "Checking", currency: "USD", userId: user.id };
const category = { id: "cat1", name: "Food", color: "#ef4444", type: "expense", userId: user.id };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PUT /api/transactions/[id]
// ---------------------------------------------------------------------------
describe("PUT /api/transactions/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { amount: 25 }),
      makeParams("t1")
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when transaction not found", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue(null);
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { amount: 25 }),
      makeParams("t1")
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when amount is negative", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { amount: -5 }),
      makeParams("t1")
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when new accountId doesn't belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    mockAccFindFirst.mockResolvedValue(null);
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { accountId: "other-acc" }),
      makeParams("t1")
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Account");
  });

  it("returns 400 when new categoryId doesn't belong to user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    mockAccFindFirst.mockResolvedValue(account);
    mockCatFindFirst.mockResolvedValue(null);
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { accountId: "acc1", categoryId: "other-cat" }),
      makeParams("t1")
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Category");
  });

  it("updates transaction when valid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    const updated = { id: "t1", amount: 75, account, category };
    mockUpdate.mockResolvedValue(updated);
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { amount: 75 }),
      makeParams("t1")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it("converts date string to Date object when updating date", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    mockUpdate.mockResolvedValue({ id: "t1" });
    await PUT(
      makeReq("/api/transactions/t1", "PUT", { date: "2024-05-01T00:00:00Z" }),
      makeParams("t1")
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ date: expect.any(Date) }),
      })
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockRejectedValue(new Error("crash"));
    const res = await PUT(
      makeReq("/api/transactions/t1", "PUT", { amount: 10 }),
      makeParams("t1")
    );
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/transactions/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/transactions/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await DELETE(makeReq("/api/transactions/t1", "DELETE"), makeParams("t1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when transaction not found", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeReq("/api/transactions/t1", "DELETE"), makeParams("t1"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns success message", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockResolvedValue({ id: "t1", userId: user.id });
    mockDelete.mockResolvedValue({ id: "t1" });
    const res = await DELETE(makeReq("/api/transactions/t1", "DELETE"), makeParams("t1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockTxFindFirst.mockRejectedValue(new Error("crash"));
    const res = await DELETE(makeReq("/api/transactions/t1", "DELETE"), makeParams("t1"));
    expect(res.status).toBe(500);
  });
});

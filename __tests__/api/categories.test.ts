import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Hoist mock factories
// ---------------------------------------------------------------------------
const { mockRequireVerifiedAuth, mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockRequireVerifiedAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}));

import { GET, POST } from "@/app/api/categories/route";

const user = makeVerifiedUser();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/categories
// ---------------------------------------------------------------------------
describe("GET /api/categories", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await GET(makeReq("/api/categories", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns empty array when no categories exist", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockResolvedValue([]);
    const res = await GET(makeReq("/api/categories", "GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns user's categories sorted by name", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const cats = [
      { id: "c1", name: "Food", type: "expense", color: "#ef4444", userId: user.id },
    ];
    mockFindMany.mockResolvedValue(cats);
    const res = await GET(makeReq("/api/categories", "GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(cats);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue(new Error("DB error"));
    const res = await GET(makeReq("/api/categories", "GET"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when a non-Error is thrown in GET", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindMany.mockRejectedValue("plain error");
    const res = await GET(makeReq("/api/categories", "GET"));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/categories
// ---------------------------------------------------------------------------
describe("POST /api/categories", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await POST(
      makeReq("/api/categories", "POST", { name: "Food", type: "expense" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(makeReq("/api/categories", "POST", { type: "expense" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/categories", "POST", { name: "X", type: "transfer" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when color format is invalid", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const res = await POST(
      makeReq("/api/categories", "POST", { name: "X", type: "income", color: "red" })
    );
    expect(res.status).toBe(400);
  });

  it("creates category and returns 201", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    const created = {
      id: "c2",
      name: "Salary",
      type: "income",
      color: "#22c55e",
      userId: user.id,
    };
    mockCreate.mockResolvedValue(created);
    const res = await POST(
      makeReq("/api/categories", "POST", { name: "Salary", type: "income", color: "#22c55e" })
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it("uses default color when not supplied", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockResolvedValue({ id: "c3", color: "#6366f1" });
    await POST(makeReq("/api/categories", "POST", { name: "Bills", type: "expense" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ color: "#6366f1" }),
      })
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockRejectedValue(new Error("DB error"));
    const res = await POST(
      makeReq("/api/categories", "POST", { name: "X", type: "expense" })
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 when a non-Error is thrown in POST", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockCreate.mockRejectedValue("string error");
    const res = await POST(makeReq("/api/categories", "POST", { name: "X", type: "expense" }));
    expect(res.status).toBe(500);
  });
});

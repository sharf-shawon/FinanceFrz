import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeReq, makeVerifiedUser, mockAuthed, mockUnauthed } from "../helpers";

// ---------------------------------------------------------------------------
// Hoist mock factories
// ---------------------------------------------------------------------------
const { mockRequireVerifiedAuth, mockFindFirst, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockRequireVerifiedAuth: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireVerifiedAuth: mockRequireVerifiedAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

import { PUT, DELETE } from "@/app/api/categories/[id]/route";

const user = makeVerifiedUser();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PUT /api/categories/[id]
// ---------------------------------------------------------------------------
describe("PUT /api/categories/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await PUT(makeReq("/api/categories/c1", "PUT", { name: "New" }), makeParams("c1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when category not found", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue(null);
    const res = await PUT(makeReq("/api/categories/c1", "PUT", { name: "New" }), makeParams("c1"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when color is malformed", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "c1", userId: user.id });
    const res = await PUT(
      makeReq("/api/categories/c1", "PUT", { color: "notahex" }),
      makeParams("c1")
    );
    expect(res.status).toBe(400);
  });

  it("updates and returns category", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "c1", userId: user.id });
    const updated = { id: "c1", name: "Updated", type: "income", color: "#6366f1" };
    mockUpdate.mockResolvedValue(updated);
    const res = await PUT(
      makeReq("/api/categories/c1", "PUT", { name: "Updated" }),
      makeParams("c1")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue(new Error("crash"));
    const res = await PUT(makeReq("/api/categories/c1", "PUT", {}), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/categories/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/categories/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await DELETE(makeReq("/api/categories/c1", "DELETE"), makeParams("c1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when category not found", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeReq("/api/categories/c1", "DELETE"), makeParams("c1"));
    expect(res.status).toBe(404);
  });

  it("deletes category and returns success message", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "c1", userId: user.id });
    mockDelete.mockResolvedValue({ id: "c1" });
    const res = await DELETE(makeReq("/api/categories/c1", "DELETE"), makeParams("c1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue(new Error("crash"));
    const res = await DELETE(makeReq("/api/categories/c1", "DELETE"), makeParams("c1"));
    expect(res.status).toBe(500);
  });
});

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
    account: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

import { PUT, DELETE } from "@/app/api/accounts/[id]/route";

const user = makeVerifiedUser();

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// PUT /api/accounts/[id]
// ---------------------------------------------------------------------------
describe("PUT /api/accounts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await PUT(makeReq("/api/accounts/a1", "PUT", { name: "New" }), makeParams("a1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found or belongs to another user", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue(null);
    const res = await PUT(makeReq("/api/accounts/a1", "PUT", { name: "New" }), makeParams("a1"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when body is invalid (bad type)", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "a1", userId: user.id });
    const res = await PUT(
      makeReq("/api/accounts/a1", "PUT", { type: "spaceship" }),
      makeParams("a1")
    );
    expect(res.status).toBe(400);
  });

  it("updates and returns account on valid request", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "a1", userId: user.id });
    const updated = { id: "a1", name: "Renamed", type: "bank", currency: "USD" };
    mockUpdate.mockResolvedValue(updated);
    const res = await PUT(
      makeReq("/api/accounts/a1", "PUT", { name: "Renamed" }),
      makeParams("a1")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue(new Error("crash"));
    const res = await PUT(makeReq("/api/accounts/a1", "PUT", { name: "X" }), makeParams("a1"));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/accounts/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/accounts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockUnauthed(mockRequireVerifiedAuth);
    const res = await DELETE(makeReq("/api/accounts/a1", "DELETE"), makeParams("a1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue(null);
    const res = await DELETE(makeReq("/api/accounts/a1", "DELETE"), makeParams("a1"));
    expect(res.status).toBe(404);
  });

  it("deletes and returns success message", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockResolvedValue({ id: "a1", userId: user.id });
    mockDelete.mockResolvedValue({ id: "a1" });
    const res = await DELETE(makeReq("/api/accounts/a1", "DELETE"), makeParams("a1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBeDefined();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthed(mockRequireVerifiedAuth, user);
    mockFindFirst.mockRejectedValue(new Error("crash"));
    const res = await DELETE(makeReq("/api/accounts/a1", "DELETE"), makeParams("a1"));
    expect(res.status).toBe(500);
  });
});

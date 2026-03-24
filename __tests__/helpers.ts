/**
 * Shared test helpers & factory functions
 */
import { vi } from "vitest";
import { NextRequest } from "next/server.js";

// ---- User / session factories -----------------------------------------------

export function makeVerifiedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "user@test.com",
    name: "Test User",
    emailVerifiedAt: new Date("2024-01-01"),
    locale: "en",
    themePreference: "system",
    ...overrides,
  };
}

// ---- Request builder --------------------------------------------------------

export function makeReq(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): NextRequest {
  let fullUrl = `http://localhost:3000${url}`;
  if (searchParams) {
    const sp = new URLSearchParams(searchParams);
    fullUrl += `?${sp.toString()}`;
  }
  const opts: { method: string; headers?: Record<string, string>; body?: string } = { method };
  if (body) {
    opts.headers = { "content-type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  return new NextRequest(fullUrl, opts);
}

// ---- Auth mock setup --------------------------------------------------------

export function mockAuthed(mockFn: ReturnType<typeof vi.fn>, user: ReturnType<typeof makeVerifiedUser>) {
  mockFn.mockResolvedValue(user);
}

export function mockUnauthed(mockFn: ReturnType<typeof vi.fn>, msg = "Unauthorized") {
  mockFn.mockRejectedValue(new Error(msg));
}

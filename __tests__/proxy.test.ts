import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server.js";
import { proxy } from "@/proxy";

function makeRequest(path: string, hasCookie = false) {
  const url = `http://localhost:3000${path}`;
  const headers: HeadersInit = {};
  const cookieHeader = hasCookie ? "session_token=abc123" : "";
  if (cookieHeader) headers["cookie"] = cookieHeader;
  return new NextRequest(url, { headers });
}

describe("proxy middleware", () => {
  it("allows unauthenticated access to /login", () => {
    const req = makeRequest("/login");
    const res = proxy(req);
    expect(res.status).toBe(200); // NextResponse.next() → 200
  });

  it("allows unauthenticated access to /register", () => {
    const req = makeRequest("/register");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated access to /verify-email", () => {
    const req = makeRequest("/verify-email");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows unauthenticated access to /api/auth/login", () => {
    const req = makeRequest("/api/auth/login");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("redirects to /login when accessing /dashboard without a session cookie", () => {
    const req = makeRequest("/dashboard");
    const res = proxy(req);
    // Redirect response has status 307/308; NextResponse.redirect uses 307
    expect([307, 308, 302, 303].includes(res.status)).toBe(true);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows authenticated access to /dashboard", () => {
    const req = makeRequest("/dashboard", true);
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("does NOT redirect unauthenticated requests to /api/* (non-auth)", () => {
    // API routes handle their own auth; middleware lets them through
    const req = makeRequest("/api/accounts");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows access to /_next paths without cookie", () => {
    const req = makeRequest("/_next/static/chunk.js");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });
});

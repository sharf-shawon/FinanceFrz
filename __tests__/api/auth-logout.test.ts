import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server.js";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns 200 with logged-out message", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/logout", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBeTruthy();
  });

  it("clears the session_token cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/logout", { method: "POST" });
    const res = await POST(req);
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("session_token=");
    // The cookie should expire in the past (clearing it)
    expect(cookie?.toLowerCase()).toContain("expires=");
  });
});

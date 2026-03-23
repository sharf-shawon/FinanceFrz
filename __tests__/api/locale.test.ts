import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server.js";
import { POST } from "@/app/api/locale/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/locale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/locale", () => {
  it("sets locale cookie for a valid locale (en)", async () => {
    const req = makeRequest({ locale: "en" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("locale=en");
  });

  it("sets locale cookie for a valid locale (es)", async () => {
    const req = makeRequest({ locale: "es" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("locale=es");
  });

  it("returns 400 for an unsupported locale", async () => {
    const req = makeRequest({ locale: "fr" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid locale");
  });

  it("returns 400 for missing locale field", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

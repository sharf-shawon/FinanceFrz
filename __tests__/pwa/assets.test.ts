import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PUBLIC_DIR = resolve(__dirname, "../../public");

// ---------------------------------------------------------------------------
// Web App Manifest
// ---------------------------------------------------------------------------
describe("public/manifest.json", () => {
  const raw = readFileSync(resolve(PUBLIC_DIR, "manifest.json"), "utf-8");
  const manifest = JSON.parse(raw);

  it("is valid JSON", () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe("object");
  });

  it("has required PWA name fields", () => {
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe("string");
  });

  it("has standalone display mode", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("has start_url", () => {
    expect(manifest.start_url).toBe("/");
  });

  it("has at least two icons (192 and 512)", () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("has theme_color and background_color", () => {
    expect(typeof manifest.theme_color).toBe("string");
    expect(typeof manifest.background_color).toBe("string");
  });

  it("all icons have src, sizes, and type", () => {
    for (const icon of manifest.icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBe("image/png");
    }
  });
});

// ---------------------------------------------------------------------------
// Service Worker
// ---------------------------------------------------------------------------
describe("public/sw.js", () => {
  const sw = readFileSync(resolve(PUBLIC_DIR, "sw.js"), "utf-8");

  it("exists and is non-empty", () => {
    expect(sw.length).toBeGreaterThan(0);
  });

  it("listens to install event", () => {
    expect(sw).toContain("install");
  });

  it("listens to activate event", () => {
    expect(sw).toContain("activate");
  });

  it("listens to fetch event", () => {
    expect(sw).toContain("fetch");
  });

  it("calls skipWaiting", () => {
    expect(sw).toContain("skipWaiting");
  });

  it("calls clients.claim", () => {
    expect(sw).toContain("clients.claim");
  });
});

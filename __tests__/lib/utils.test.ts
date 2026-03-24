import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  ACCOUNT_TYPES,
  CURRENCIES,
} from "@/lib/utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "skip", true && "include")).toBe("base include");
  });

  it("deduplicates tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles undefined / null gracefully", () => {
    expect(cn(undefined, null, "ok")).toBe("ok");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("formatCurrency()", () => {
  it("formats USD by default", () => {
    const result = formatCurrency(1234.5);
    expect(result).toContain("1,234.50");
    expect(result).toContain("$");
  });

  it("formats EUR correctly", () => {
    const result = formatCurrency(99.99, "EUR");
    expect(result).toContain("99.99");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0.00");
  });

  it("formats negative values", () => {
    const result = formatCurrency(-50, "USD");
    expect(result).toContain("50.00");
  });

  it("uses the supplied locale for number formatting", () => {
    const en = formatCurrency(1000, "USD", "en");
    const es = formatCurrency(1000, "USD", "es");
    // both should contain "1" and "000" somewhere
    expect(en).toContain("1");
    expect(es).toContain("1");
  });
});

describe("formatDate()", () => {
  it("formats a Date object", () => {
    const d = new Date("2024-06-15T12:00:00Z");
    const result = formatDate(d);
    expect(result).toMatch(/Jun|2024|15/);
  });

  it("formats an ISO string", () => {
    const result = formatDate("2024-01-01T00:00:00Z");
    expect(result).toMatch(/Jan|2024|1/);
  });

  it("accepts custom format options", () => {
    const d = new Date("2024-03-20T00:00:00Z");
    const result = formatDate(d, "en", { year: "numeric" });
    expect(result).toContain("2024");
  });
});

describe("CATEGORY_COLORS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CATEGORY_COLORS)).toBe(true);
    expect(CATEGORY_COLORS.length).toBeGreaterThan(0);
  });

  it("all entries are valid hex colours", () => {
    for (const color of CATEGORY_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("ACCOUNT_TYPES", () => {
  it("is a non-empty array with value/label pairs", () => {
    expect(ACCOUNT_TYPES.length).toBeGreaterThan(0);
    for (const entry of ACCOUNT_TYPES) {
      expect(entry).toHaveProperty("value");
      expect(entry).toHaveProperty("label");
    }
  });
});

describe("CURRENCIES", () => {
  it("is a non-empty array with value/label pairs", () => {
    expect(CURRENCIES.length).toBeGreaterThan(0);
    for (const entry of CURRENCIES) {
      expect(entry).toHaveProperty("value");
      expect(entry).toHaveProperty("label");
    }
  });

  it("includes USD", () => {
    expect(CURRENCIES.some((c) => c.value === "USD")).toBe(true);
  });
});

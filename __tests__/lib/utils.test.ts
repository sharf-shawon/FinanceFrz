import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  CATEGORY_COLORS,
  getRandomCategoryColor,
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
  it("formats BDT by default", () => {
    const result = formatCurrency(1234.5);
    // BDT uses ৳ symbol and formats numbers
    expect(result).toContain("1,234.50");
  });

  it("formats USD correctly when specified", () => {
    const result = formatCurrency(1234.5, "USD");
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
  it("is a non-empty array with at least 50 entries", () => {
    expect(Array.isArray(CATEGORY_COLORS)).toBe(true);
    expect(CATEGORY_COLORS.length).toBeGreaterThanOrEqual(50);
  });

  it("all entries are valid hex colours", () => {
    for (const color of CATEGORY_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("contains no duplicate colors", () => {
    const unique = new Set(CATEGORY_COLORS);
    expect(unique.size).toBe(CATEGORY_COLORS.length);
  });
});

describe("getRandomCategoryColor()", () => {
  it("returns a valid hex color from CATEGORY_COLORS", () => {
    const color = getRandomCategoryColor();
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(CATEGORY_COLORS).toContain(color);
  });

  it("returns different colors on repeated calls (probabilistic)", () => {
    // With 50+ colors, the probability that 20 calls all return the same color is ~(1/50)^19 ≈ 0
    const colors = new Set(Array.from({ length: 20 }, () => getRandomCategoryColor()));
    expect(colors.size).toBeGreaterThan(1);
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

  it("includes BDT as the first/default currency", () => {
    expect(CURRENCIES[0].value).toBe("BDT");
  });

  it("includes USD", () => {
    expect(CURRENCIES.some((c) => c.value === "USD")).toBe(true);
  });
});

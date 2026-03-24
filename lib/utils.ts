import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "BDT",
  locale: string = "en"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  date: Date | string,
  locale: string = "en",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(d);
}

export const CATEGORY_COLORS = [
  // Indigo / Violet
  "#6366f1", "#4f46e5", "#7c3aed", "#8b5cf6", "#a78bfa",
  // Pink / Rose / Fuchsia
  "#ec4899", "#f43f5e", "#e11d48", "#d946ef", "#c026d3",
  // Red / Orange
  "#ef4444", "#dc2626", "#f97316", "#ea580c", "#f59e0b",
  // Yellow / Lime / Green
  "#eab308", "#ca8a04", "#84cc16", "#22c55e", "#16a34a",
  // Teal / Cyan / Sky
  "#14b8a6", "#0d9488", "#06b6d4", "#0284c7", "#0ea5e9",
  // Blue
  "#3b82f6", "#2563eb", "#1d4ed8", "#60a5fa", "#93c5fd",
  // Slate / Gray
  "#6b7280", "#475569", "#334155", "#94a3b8", "#64748b",
  // Warm accents
  "#fb923c", "#fbbf24", "#34d399", "#2dd4bf", "#818cf8",
  // Deep / Bold
  "#9333ea", "#db2777", "#059669", "#0891b2", "#be185d",
  // Soft pastel-ish
  "#f472b6", "#a3e635", "#67e8f9", "#fde68a", "#bbf7d0",
];

export function getRandomCategoryColor(): string {
  return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
}

export const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Account" },
  { value: "mfs", label: "MFS (Bkash, Nagad, etc.)" },
  { value: "credit_card", label: "Credit Card" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
];

export const CURRENCIES = [
  { value: "BDT", label: "BDT - Bangladeshi Taka" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

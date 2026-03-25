import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const { searchParams } = new URL(req.url);

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const accountId = searchParams.get("accountId");

    const where: {
      userId: string;
      accountId?: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId: user.id };
    if (accountId) where.accountId = accountId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { date: "asc" },
    });

    // Summary
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum: number, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum: number, t) => sum + t.amount, 0);
    const net = totalIncome - totalExpense;

    // Category breakdown (expenses)
    const categoryMap = new Map<string, { name: string; color: string; total: number }>();
    for (const t of transactions) {
      if (t.type === "expense" && t.categoryId && t.category) {
        const existing = categoryMap.get(t.categoryId);
        if (existing) {
          existing.total += t.amount;
        } else {
          categoryMap.set(t.categoryId, {
            name: t.category.name,
            color: t.category.color,
            total: t.amount,
          });
        }
      }
    }
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    // Income breakdown by category
    const incomeCategoryMap = new Map<string, { name: string; color: string; total: number }>();
    for (const t of transactions) {
      if (t.type === "income" && t.categoryId && t.category) {
        const existing = incomeCategoryMap.get(t.categoryId);
        if (existing) {
          existing.total += t.amount;
        } else {
          incomeCategoryMap.set(t.categoryId, {
            name: t.category.name,
            color: t.category.color,
            total: t.amount,
          });
        }
      }
    }
    const incomeBreakdown = Array.from(incomeCategoryMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);

    // Top expenses
    const topExpenses = transactions
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        amount: t.amount,
        date: t.date.toISOString().slice(0, 10),
        description: t.description ?? null,
        categoryName: t.category?.name ?? null,
        categoryColor: t.category?.color ?? null,
        accountName: t.account.name,
      }));

    // Time series - group by date
    const dateMap = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const key = t.date.toISOString().slice(0, 10);
      const existing = dateMap.get(key) ?? { income: 0, expense: 0 };
      if (t.type === "income") existing.income += t.amount;
      else existing.expense += t.amount;
      dateMap.set(key, existing);
    }
    const timeSeries = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: { totalIncome, totalExpense, net },
      categoryBreakdown,
      incomeBreakdown,
      topExpenses,
      timeSeries,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

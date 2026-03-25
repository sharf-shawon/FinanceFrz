import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rowSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number().positive(),
  categoryId: z.string().nullable().optional(),
});

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().min(1),
  rows: z.array(rowSchema),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid or missing date" }, { status: 400 });
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Fetch all data in parallel
    const [transactions, accounts, categories, prevTransactions, recentRaw] =
      await Promise.all([
        // Transactions for the selected day
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: { gte: dayStart, lte: dayEnd },
          },
          include: {
            account: { select: { id: true, name: true, currency: true } },
            category: { select: { id: true, name: true, color: true, type: true } },
          },
          orderBy: { createdAt: "asc" },
        }),

        // Accounts for the account selector
        prisma.account.findMany({
          where: { userId: user.id },
          orderBy: { name: "asc" },
        }),

        // Categories for optional row categorisation
        prisma.category.findMany({
          where: { userId: user.id },
          orderBy: { name: "asc" },
        }),

        // All transactions strictly before the day for previous-balance calculation
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            date: { lt: dayStart },
          },
          select: { type: true, amount: true },
        }),

        // Recent transactions for autocomplete suggestions (last 500)
        prisma.transaction.findMany({
          where: {
            userId: user.id,
            description: { not: null },
          },
          select: {
            description: true,
            type: true,
            amount: true,
            quantity: true,
            rate: true,
          },
          orderBy: { date: "desc" },
          take: 500,
        }),
      ]);

    // Compute previous balance across all accounts
    const previousBalance = prevTransactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);

    // Build autocomplete suggestions: keep only the most-recent entry per description+type
    const suggestionMap = new Map<
      string,
      { description: string; type: string; quantity: number; rate: number; amount: number }
    >();
    for (const t of recentRaw) {
      if (!t.description) continue;
      const key = `${t.type}::${t.description.toLowerCase()}`;
      if (!suggestionMap.has(key)) {
        suggestionMap.set(key, {
          description: t.description,
          type: t.type,
          quantity: t.quantity ?? 1,
          rate: t.rate ?? t.amount,
          amount: t.amount,
        });
      }
    }
    const suggestions = Array.from(suggestionMap.values());

    return NextResponse.json({
      date,
      transactions,
      previousBalance,
      suggestions,
      accounts,
      categories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { date, accountId, rows } = parsed.data;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }

    // Verify any provided category IDs belong to user
    const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter(Boolean) as string[])];
    if (categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds }, userId: user.id },
        select: { id: true },
      });
      if (categories.length !== categoryIds.length) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Atomic: delete existing transactions for the day+account, then insert new rows
    const [, saved] = await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: {
          userId: user.id,
          accountId,
          date: { gte: dayStart, lte: dayEnd },
        },
      }),
      prisma.transaction.createMany({
        data: rows.map((r) => ({
          userId: user.id,
          accountId,
          categoryId: r.categoryId ?? null,
          type: r.type,
          description: r.description,
          quantity: r.quantity,
          rate: r.rate,
          amount: r.quantity * r.rate,
          date: dayStart,
        })),
      }),
    ]);

    return NextResponse.json({ saved }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

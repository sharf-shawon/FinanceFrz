import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  accountId: z.string(),
  categoryId: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  date: z.string(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy") ?? "date";
    const sortDir = searchParams.get("sortDir") ?? "desc";

    const where: any = { userId: user.id };
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true, color: true, type: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, limit });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Email not verified") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Verify account and category belong to user
    const [account, category] = await Promise.all([
      prisma.account.findFirst({ where: { id: parsed.data.accountId, userId: user.id } }),
      prisma.category.findFirst({ where: { id: parsed.data.categoryId, userId: user.id } }),
    ]);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

    const transaction = await prisma.transaction.create({
      data: {
        ...parsed.data,
        userId: user.id,
        date: new Date(parsed.data.date),
      },
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, color: true, type: true } },
      },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (err: any) {
    if (err.message === "Unauthorized" || err.message === "Email not verified") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

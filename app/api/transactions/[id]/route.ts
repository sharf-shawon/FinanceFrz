import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireVerifiedAuth();
    const { id } = await params;
    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data: {
      accountId?: string;
      categoryId?: string;
      type?: "income" | "expense";
      amount?: number;
      date?: string | Date;
      description?: string;
    } = { ...parsed.data };
    if (data.date) data.date = new Date(data.date as string);

    if (data.accountId) {
      const account = await prisma.account.findFirst({ where: { id: data.accountId, userId: user.id } });
      if (!account) return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }
    if (data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: data.categoryId, userId: user.id } });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, color: true, type: true } },
      },
    });
    return NextResponse.json(transaction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireVerifiedAuth();
    const { id } = await params;
    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

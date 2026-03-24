import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "mfs", "credit_card", "savings", "investment"]),
  currency: z.string().default("BDT"),
});

export async function GET(_req: NextRequest) {
  try {
    const user = await requireVerifiedAuth();
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        transactions: { select: { type: true, amount: true } },
      },
    });

    const accountsWithBalance = accounts.map((account) => {
      const balance = account.transactions.reduce((sum, t) => {
        return sum + (t.type === "income" ? t.amount : -t.amount);
      }, 0);
      const { transactions: _transactions, ...rest } = account;
      return { ...rest, balance };
    });

    return NextResponse.json(accountsWithBalance);
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const account = await prisma.account.create({
      data: { ...parsed.data, userId: user.id },
    });
    return NextResponse.json({ ...account, balance: 0 }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

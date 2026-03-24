import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["cash", "bank", "mfs", "credit_card", "savings", "investment"]).optional(),
  currency: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireVerifiedAuth();
    const { id } = await params;
    const existing = await prisma.account.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const account = await prisma.account.update({ where: { id }, data: parsed.data });
    return NextResponse.json(account);
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
    const existing = await prisma.account.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Unauthorized" || message === "Email not verified") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

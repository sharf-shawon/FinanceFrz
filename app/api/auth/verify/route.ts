import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const verificationToken = await prisma.verificationToken.findUnique({ where: { token } });
    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerifiedAt: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("[VERIFY]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

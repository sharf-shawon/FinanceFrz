import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null);
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    themePreference: user.themePreference,
    emailVerifiedAt: user.emailVerifiedAt,
  });
}

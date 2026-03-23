import { NextRequest, NextResponse } from "next/server";
import { locales } from "@/i18n";

export async function POST(request: NextRequest) {
  const { locale } = await request.json();
  if (!(locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false, // Intentionally not httpOnly: locale is non-sensitive and needs to be readable client-side for UI state
  });
  return response;
}

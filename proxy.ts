import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/verify-email", "/api/auth"];
const STATIC_PATHS = ["/manifest.json", "/sw.js", "/icons/"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isStatic = STATIC_PATHS.some((p) => pathname.startsWith(p));
  const token = request.cookies.get("session_token")?.value;

  if (!isPublic && !isStatic && !token && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)"],
};

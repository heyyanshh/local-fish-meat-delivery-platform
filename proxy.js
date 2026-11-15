import { NextResponse } from "next/server";

// Optimistic navigation guard only. Protected pages and every mutation also
// verify roles and object ownership on the server.
export function proxy(request) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin") && !path.startsWith("/store") && !path.startsWith("/rider")) return NextResponse.next();
  if (!process.env.DATABASE_URL) return NextResponse.next();
  const hasSession = request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) return NextResponse.redirect(new URL("/sign-in?returnTo=" + encodeURIComponent(path), request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/store/:path*", "/rider/:path*"] };

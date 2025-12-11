// middleware.ts
import { NextResponse } from "next/server";

export function middleware(request: { cookies: { get: (arg0: string) => any; }; nextUrl: { pathname: string; }; url: string | URL | undefined; }) {
  const authToken = request.cookies.get("auth_token");
  if (!authToken && request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
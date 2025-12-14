import {
  isInternalProtectedPath,
  isInternalPublicPath,
  isStaticOrSystemPath,
} from "@/lib/auth/route-guards";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPublicPath(pathname) || isStaticOrSystemPath(pathname)) {
    return NextResponse.next();
  }

  if (isInternalProtectedPath(pathname)) {
    const sessionCookie =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

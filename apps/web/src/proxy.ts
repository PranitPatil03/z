import {
  isInternalProtectedPath,
  isInternalPublicPath,
  isStaticOrSystemPath,
} from "@/lib/auth/route-guards";
import { type NextRequest, NextResponse } from "next/server";

function isCrossOriginApiRequest(request: NextRequest) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return false;
  }

  try {
    return new URL(apiBaseUrl).origin !== request.nextUrl.origin;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalPublicPath(pathname) || isStaticOrSystemPath(pathname)) {
    return NextResponse.next();
  }

  if (isInternalProtectedPath(pathname) && !isCrossOriginApiRequest(request)) {
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

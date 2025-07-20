import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  if (["/signup", "/signin"].includes(pathname)) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/recordings", request.url));
    }
    return NextResponse.next();
  }

  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// TODO
export const config = {
  matcher: ["/signup", "/signin", "/account/:path*", "/dashboard/:path*", "/recordings/:path*"],
};

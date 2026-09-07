import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAMES } from "@/app/api/utils/authCookies";

/**
 * Gates the admin area on the presence of an auth cookie.
 *
 * Presence only — the signature is never checked here. Middleware runs on the edge
 * without the signing key, and a forged cookie buys nothing: every admin call is
 * authorised by the C# API against the real token. This exists to send signed-out
 * users to the login page rather than an empty dashboard.
 */
const ADMIN_PATH_PREFIX = "/admin";
const LOGIN_PATH = "/aanmeld";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith(ADMIN_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const hasAccessToken =
    req.cookies.has(AUTH_COOKIE_NAMES.accessToken) ||
    req.cookies.has(`${AUTH_COOKIE_NAMES.accessToken}.0`) ||
    req.cookies.has(AUTH_COOKIE_NAMES.refreshToken) ||
    req.cookies.has(`${AUTH_COOKIE_NAMES.refreshToken}.0`);

  if (hasAccessToken) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.searchParams.set("keerTerugNa", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};

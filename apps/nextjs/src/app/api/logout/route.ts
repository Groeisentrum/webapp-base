import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/app/api/utils/authCookies";
import { getRefreshToken } from "@/app/api/utils/authV2";
import { getSkaaphondBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Ends the session.
 *
 * Cookies are cleared even when notifying SkaapHond fails — a user who asked to sign
 * out must end up signed out locally regardless of what the upstream does.
 */
export async function POST(req: NextRequest) {
  const refreshToken = getRefreshToken(req);

  if (refreshToken) {
    try {
      await fetch(`${getSkaaphondBaseUrl()}/auth/v2/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Deliberately ignored; local sign-out proceeds below.
    }
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });
  clearAuthCookies(res);

  return res;
}

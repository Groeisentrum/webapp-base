import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getFriendlyName, setAuthCookies } from "@/app/api/utils/authCookies";
import { AuthTokens, getAccessToken, getRefreshToken, refreshTokens } from "@/app/api/utils/authV2";
import {
  decodeJwtPayload,
  extractEmail,
  extractRoles,
  extractUserId,
  firstNonEmptyString,
  isExpired,
} from "@/app/api/utils/jwtClaims";

/**
 * Returns the signed-in user for client-side hydration, rotating the token pair when
 * the access token has expired so a reload does not sign the user out mid-session.
 */
export async function GET(req: NextRequest) {
  let token = getAccessToken(req);
  let refreshToken = getRefreshToken(req);
  let refreshedTokens: AuthTokens | null = null;

  const tryRefresh = async (): Promise<boolean> => {
    if (!refreshToken) return false;

    const rotated = await refreshTokens(refreshToken);
    if (!rotated) return false;

    refreshedTokens = rotated;
    token = rotated.accessToken;
    refreshToken = rotated.refreshToken;
    return true;
  };

  if (!token) {
    const refreshed = await tryRefresh();
    if (!refreshed || !token) {
      return unauthenticated();
    }
  }

  try {
    let payload = decodeJwtPayload(token);

    if (isExpired(payload)) {
      const refreshed = await tryRefresh();
      if (!refreshed || !token) {
        return unauthenticated();
      }

      payload = decodeJwtPayload(token);
    }

    const id = extractUserId(payload);
    const email = extractEmail(payload);
    const roles = extractRoles(payload);

    // A token carrying no role grants nothing here, so treat it as unauthenticated
    // rather than presenting a signed-in user who can reach nothing.
    if (id === null || email === null || roles.length === 0) {
      return unauthenticated();
    }

    const res = NextResponse.json(
      {
        authenticated: true,
        user: {
          id,
          email,
          name: getFriendlyName(req),
          roles,
          entityId: firstNonEmptyString(payload.entityId, payload.EntityId),
          dataHolderId: firstNonEmptyString(payload.dataHolderId, payload.DataHolderId),
        },
        exp: typeof payload.exp === "number" ? payload.exp : null,
      },
      { status: 200 },
    );

    if (refreshedTokens) {
      setAuthCookies(res, refreshedTokens);
    }

    return res;
  } catch {
    return unauthenticated();
  }
}

function unauthenticated(): NextResponse {
  const res = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  clearAuthCookies(res);

  return res;
}

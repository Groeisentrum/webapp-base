import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setAuthCookies, setFriendlyNameCookie } from "@/app/api/utils/authCookies";
import { getSkaaphondBaseUrl } from "@/app/api/utils/serviceUrls";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Exchanges credentials for tokens and stores them in httpOnly cookies.
 *
 * The response body deliberately carries no token: the browser never holds one, so
 * script running on the page cannot read or exfiltrate it.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ongeldige versoek." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Verskaf asseblief 'n gebruikersnaam en wagwoord." },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${getSkaaphondBaseUrl()}/auth/v2/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, message: "Kon nie aanmeld nie. Kontroleer jou besonderhede." },
      { status: upstream.status },
    );
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Kon nie aanmeld nie. Probeer asseblief weer." },
      { status: 502 },
    );
  }

  const tokens = data as { token?: string; refreshToken?: string; friendlyName?: string } | null;

  if (!tokens?.token || !tokens.refreshToken) {
    return NextResponse.json(
      { ok: false, message: "Kon nie aanmeld nie. Probeer asseblief weer." },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ ok: true, statusCode: 200, statusText: "OK" }, { status: 200 });

  setAuthCookies(res, { accessToken: tokens.token, refreshToken: tokens.refreshToken });

  if (tokens.friendlyName) {
    setFriendlyNameCookie(res, tokens.friendlyName);
  }

  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Forwards anonymous reads to the local API's public surface.
 *
 * No token is attached and only GET is exposed, so this cannot become a side door to
 * the authenticated API. The upstream path is hard-prefixed with `api/public`, so a
 * crafted path such as `../content` cannot escape that surface.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  if (path.some((segment) => segment === ".." || segment === ".")) {
    return NextResponse.json({ message: "Ongeldige versoek." }, { status: 400 });
  }

  const search = req.nextUrl.search ?? "";
  const targetUrl = `${getLocalApiBaseUrl()}/api/public/${path.join("/")}${search}`;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "manual",
  });

  const body = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new NextResponse(body, { status: response.status, headers });
}

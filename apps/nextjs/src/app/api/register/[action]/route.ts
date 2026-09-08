import { NextRequest, NextResponse } from "next/server";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Forwards the registration steps to the local API, which owns account creation,
 * email verification and the consent record.
 *
 * Separate from the general public proxy because that one is GET-only by design. The
 * action is checked against a fixed set rather than passed through, so this cannot be
 * used to reach any other endpoint. The caller's address is forwarded, since the API
 * otherwise sees only nginx and could neither rate-limit meaningfully nor record where
 * consent came from.
 */
const ALLOWED_ACTIONS = new Set(["start", "complete", "resend"]);

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { action } = await context.params;

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ title: "Ongeldige versoek." }, { status: 404 });
  }

  const body = await req.text();

  const response = await fetch(`${getLocalApiBaseUrl()}/api/public/registration/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Forwarded-For": resolveClientAddress(req),
      "User-Agent": req.headers.get("user-agent") ?? "",
    },
    body,
    redirect: "manual",
  });

  const responseBody = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new NextResponse(responseBody, { status: response.status, headers });
}

function resolveClientAddress(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") ?? "";
}

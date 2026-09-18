import { NextRequest, NextResponse } from "next/server";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Forwards one Oom Paul chat turn to the local API.
 *
 * Separate from the general public proxy because that one is GET-only by design.
 * Anonymous, like the chat endpoint itself — visitors arrive without signing in.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const response = await fetch(
    `${getLocalApiBaseUrl()}/api/public/oompaul/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      redirect: "manual",
    },
  );

  const responseBody = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new NextResponse(responseBody, { status: response.status, headers });
}

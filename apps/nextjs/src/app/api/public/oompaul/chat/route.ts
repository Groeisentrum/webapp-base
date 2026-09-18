import { NextRequest, NextResponse } from "next/server";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Forwards an anonymous chat turn to the local API, which owns the conversation.
 *
 * Separate from the general public proxy because that one is GET-only by design, and
 * more specific than it, so it wins the match without widening what that route allows.
 * No token is attached: the assistant answers visitors, signed in or not.
 *
 * One route serves both shapes. `Accept: text/event-stream` targets the upstream
 * `/stream` endpoint and the body is piped through untouched — buffering it here would
 * hold every token back until the answer was complete, which is the whole point of
 * streaming. Anything else takes the buffered JSON endpoint.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const wantsStream = req.headers.get("accept")?.includes("text/event-stream") ?? false;
  const body = await req.text();

  const response = await fetch(
    `${getLocalApiBaseUrl()}/api/public/oompaul/chat${wantsStream ? "/stream" : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: wantsStream ? "text/event-stream" : "application/json",
        // Without this the API sees only the webhost container's single address, so its
        // 20-per-5-minutes cap becomes one bucket shared by every visitor to the site.
        "X-Forwarded-For": resolveClientAddress(req),
        "User-Agent": req.headers.get("user-agent") ?? "",
      },
      body,
      redirect: "manual",
    },
  );

  // A refusal on the stream path arrives as ProblemDetails rather than as frames, so it
  // falls through to the buffered branch — the caller needs to read the `code` off it.
  if (wantsStream && response.ok && response.body) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const responseBody = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  // The upstream status is passed through as itself: a 429 or a 503 reported as a 500
  // would leave the caller unable to tell "wait a minute" from "switched off".
  return new NextResponse(responseBody, { status: response.status, headers });
}

// ponytail: copied from the registration proxy, which keeps its own private copy.
// Lift both into `api/utils` the moment a third anonymous proxy needs it.
function resolveClientAddress(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") ?? "";
}

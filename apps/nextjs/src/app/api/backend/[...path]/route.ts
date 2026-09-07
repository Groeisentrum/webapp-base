import { NextRequest } from "next/server";
import { proxyRequest, unwrapWolkpoortEnvelope } from "@/app/api/utils/proxy";
import { getWolkpoortBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Proxies to WolkPoort for data owned by other GroeiSentrum services.
 *
 * Included but unused by the template itself — this app's own content, categories and
 * settings live in the local C# API. Reach for this only when a deployment genuinely
 * needs a downstream service such as Spilpunt, and never as a route to this app's data.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(req, {
    baseUrl: getWolkpoortBaseUrl(),
    path: path.join("/"),
    transform: unwrapWolkpoortEnvelope,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

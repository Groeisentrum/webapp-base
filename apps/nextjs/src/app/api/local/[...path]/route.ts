import { NextRequest } from "next/server";
import { proxyRequest } from "@/app/api/utils/proxy";
import { getLocalApiBaseUrl } from "@/app/api/utils/serviceUrls";

/**
 * Proxies to this deployment's own C# API.
 *
 * Responses pass through untouched: the local API returns plain JSON. The
 * double-encoded envelope belongs to WolkPoort alone and must not be applied here.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(req, {
    baseUrl: getLocalApiBaseUrl(),
    path: path.join("/"),
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/app/api/utils/authCookies";
import { AuthTokens, getAccessToken, getRefreshToken, refreshTokens } from "@/app/api/utils/authV2";
import { decodeJwtPayload, extractEmail, extractUserId, firstNonEmptyString } from "@/app/api/utils/jwtClaims";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export type ProxyOptions = {
  /** Absolute base URL of the upstream service. */
  baseUrl: string;
  /** Path beneath the base URL, already joined and without a leading slash. */
  path: string;
  /** Rewrites the upstream body, e.g. to unwrap WolkPoort's envelope. */
  transform?: (rawBody: string) => TransformedResponse;
};

export type TransformedResponse = {
  body: string;
  /** Set when the payload carried a status the transport did not reflect. */
  status?: number;
};

/**
 * Forwards a request to an upstream service with the caller's token attached.
 *
 * On a 401 the token pair is rotated once and the request replayed. There is no
 * further retry: ecosystem convention is to fail fast rather than mask an outage.
 */
export async function proxyRequest(req: NextRequest, options: ProxyOptions): Promise<NextResponse> {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ message: "Nie gemagtig nie." }, { status: 401 });
  }

  const targetUrl = buildTargetUrl(req, options);
  const body = await readBody(req);

  let response = await forward(req, targetUrl, accessToken, body);
  let rotatedTokens: AuthTokens | null = null;

  if (response.status === 401) {
    const refreshToken = getRefreshToken(req);
    rotatedTokens = refreshToken ? await refreshTokens(refreshToken) : null;

    if (rotatedTokens) {
      response = await forward(req, targetUrl, rotatedTokens.accessToken, body);
    }
  }

  const rawBody = await response.text();
  const transformed = options.transform ? options.transform(rawBody) : { body: rawBody };

  const nextResponse = new NextResponse(transformed.body, {
    status: transformed.status ?? response.status,
    headers: buildResponseHeaders(response),
  });

  if (rotatedTokens) {
    setAuthCookies(nextResponse, rotatedTokens);
  }

  return nextResponse;
}

/**
 * Unwraps WolkPoort's double-encoded envelope and surfaces the status embedded in it.
 *
 * WolkPoort answers 200 even when the inner call failed, so without lifting that
 * status a caller checking `res.ok` would treat a downstream 500 as success.
 */
export function unwrapWolkpoortEnvelope(rawBody: string): TransformedResponse {
  const outer = safeJsonParse(rawBody);
  if (!outer || typeof outer !== "object") {
    return { body: rawBody };
  }

  const data = (outer as Record<string, unknown>).data;
  if (typeof data !== "string") {
    return { body: rawBody };
  }

  const inner = safeJsonParse(data);
  if (!inner || typeof inner !== "object") {
    return { body: data };
  }

  const innerRecord = inner as Record<string, unknown>;
  const statusCode = innerRecord.statusCode;
  const responseBody = innerRecord.responseBody;

  const body =
    typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody ?? innerRecord);

  return {
    body,
    status: typeof statusCode === "number" ? statusCode : undefined,
  };
}

function buildTargetUrl(req: NextRequest, options: ProxyOptions): string {
  const search = req.nextUrl.search ?? "";

  return `${options.baseUrl}/${options.path}${search}`;
}

async function readBody(req: NextRequest): Promise<string | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const text = await req.text();

  return text.length > 0 ? text : undefined;
}

async function forward(
  req: NextRequest,
  targetUrl: string,
  accessToken: string,
  body: string | undefined,
): Promise<Response> {
  return fetch(targetUrl, {
    method: req.method,
    headers: buildForwardHeaders(req, accessToken),
    body,
    // Upstreams are internal services; following a redirect could leak the token elsewhere.
    redirect: "manual",
  });
}

function buildForwardHeaders(req: NextRequest, accessToken: string): Headers {
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });

  headers.set("Authorization", `Bearer ${accessToken}`);
  applyActorHeaders(headers, accessToken);

  return headers;
}

/**
 * Adds actor headers for audit attribution. These are decoded from the same token the
 * upstream verifies, so they cannot widen access — the upstream authorises off the
 * signature, not off these values.
 */
function applyActorHeaders(headers: Headers, accessToken: string): void {
  try {
    const payload = decodeJwtPayload(accessToken);
    const userId = extractUserId(payload);
    const email = extractEmail(payload);
    const name = firstNonEmptyString(payload.name);

    if (userId) headers.set("X-Actor-User-Id", userId);
    if (email) headers.set("X-Actor-Email", email);
    if (name) headers.set("X-Actor-Name", name);
  } catch {
    // An undecodable token still gets forwarded; the upstream will reject it.
  }
}

function buildResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  const contentType = response.headers.get("content-type");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return headers;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

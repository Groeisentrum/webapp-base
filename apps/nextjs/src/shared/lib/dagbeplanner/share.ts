import { z } from "zod";
import type { PlanPayload } from "@/shared/lib/dagbeplanner/types";

const destinationSchema = z.object({
  kind: z.literal("destination"),
  entryId: z.string().min(1),
  attractionId: z
    .enum([
      "cenotaph-hall",
      "marble-frieze",
      "fort-schanskop",
      "pioneer-farmyard",
      "heritage-centre",
      "monument-restaurant",
    ])
    .nullable(),
  name: z.string().min(1),
  dwellMinutes: z.number().int().positive(),
  isCustom: z.boolean(),
});

const planPayloadSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  timeBudgetMinutes: z.number().int().positive(),
  speed: z.enum(["fast", "medium", "slow", "wheelchair"]),
  destinations: z.array(destinationSchema),
});

/** Reused wherever untrusted input claims to be a plan — a shared link and a raw localStorage read alike. */
export function parsePlanPayload(raw: unknown): PlanPayload | null {
  const result = planPayloadSchema.safeParse(raw);

  return result.success ? result.data : null;
}

const QUERY_PARAM = "dagplan";

/**
 * Base64url-encodes the plan for a shareable link. Not encryption or a real QR payload
 * standard — just a compact, URL-safe transport for a "load this on another device"
 * link, matching the brief's "simulated" import/export.
 */
function utf8ToBase64(json: string): string {
  if (typeof window === "undefined")
    return Buffer.from(json, "utf-8").toString("base64");

  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return window.btoa(binary);
}

function base64ToUtf8(base64: string): string {
  if (typeof window === "undefined")
    return Buffer.from(base64, "base64").toString("utf-8");

  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodePlanForUrl(payload: PlanPayload): string {
  const base64 = utf8ToBase64(JSON.stringify(payload));

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Untrusted input (a URL query string) — validated with zod rather than trusted as-is. */
export function decodePlanFromUrl(encoded: string): PlanPayload | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = base64ToUtf8(padded);

    const parsed: unknown = JSON.parse(json);

    return parsePlanPayload(parsed);
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: PlanPayload): string {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(QUERY_PARAM, encodePlanForUrl(payload));

  return url.toString();
}

/** Reads and strips the `?dagplan=` param, so a resolved import never re-triggers on refresh or back. */
export function consumeSharedPlanFromLocation(): PlanPayload | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(QUERY_PARAM);
  if (!encoded) return null;

  url.searchParams.delete(QUERY_PARAM);
  window.history.replaceState(null, "", url.toString());

  return decodePlanFromUrl(encoded);
}

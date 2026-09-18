import "server-only";
import { notFound } from "next/navigation";
import type { VisitorEvent } from "./eventModel";

/** Explicit, development-only example data. Never a fallback for a failed API. */
export async function getEventPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { default: fixture } =
    await import("../../../fixtures/vtm-events-preview.json");
  return { ...fixture, events: fixture.events as VisitorEvent[] };
}

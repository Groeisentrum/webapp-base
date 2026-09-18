import {
  AssetType,
  RecurrenceFrequency,
  type PublicContent,
} from "@/shared/interfaces/Domain";

/** Feature-local view data, not a proposed API or inventory contract. */
export type VisitorEvent = {
  weekdays?: number[];
  groupSize?: { min: number; max: number };
  durationMinutes?: number;
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  image: string | null;
  start: string | null;
  end: string | null;
  recurring: boolean;
  schedule: string;
  venue: string;
  priceLabel: string;
  facts: { label: string; value: string }[];
  bookingUrl: string | null;
  sourceUrl?: string;
  tickets?: {
    id: string;
    label: string;
    note: string;
    cents: number;
    maxQuantity?: number;
  }[];
  demoSlots?: { value: string; label: string }[];
};

export function safeWebUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function toVisitorEvent(
  content: PublicContent,
  category: string,
): VisitorEvent {
  const recurring = content.recurrence.frequency !== RecurrenceFrequency.None;
  return {
    id: String(content.id),
    title: content.title,
    description: content.description ?? "Ontdek meer oor hierdie geleentheid.",
    body: content.body ?? "",
    category,
    image:
      content.assetType === AssetType.Image
        ? safeWebUrl(content.assetReference)
        : null,
    start: content.eventStart,
    end: content.eventEnd,
    recurring,
    weekdays:
      content.recurrence.frequency === RecurrenceFrequency.Weekly &&
      content.recurrence.dayOfWeek !== null
        ? [content.recurrence.dayOfWeek]
        : undefined,
    schedule: recurring
      ? content.recurrence.frequency === RecurrenceFrequency.Weekly
        ? "Weekliks"
        : "Maandeliks"
      : "",
    venue: content.locations
      .map((location) => location.label ?? location.addressLine)
      .filter(Boolean)
      .join(" · "),
    priceLabel: "Prys op navraag",
    facts: [],
    bookingUrl:
      content.assetType === AssetType.ExternalLink
        ? safeWebUrl(content.assetReference)
        : null,
  };
}

export function upcomingEvents(
  events: VisitorEvent[],
  now: Date,
): VisitorEvent[] {
  return events
    .filter((event) => {
      if (event.recurring) return true;
      const end = event.end ?? event.start;
      return end !== null && new Date(end).getTime() >= now.getTime();
    })
    .sort((a, b) => {
      if (a.recurring !== b.recurring) return a.recurring ? 1 : -1;
      return (
        (a.start ? Date.parse(a.start) : Infinity) -
          (b.start ? Date.parse(b.start) : Infinity) ||
        a.title.localeCompare(b.title, "af")
      );
    });
}

export function eventDate(event: VisitorEvent): string {
  if (event.recurring) return event.schedule || "Herhalende ervaring";
  if (!event.start) return "Datum word bevestig";
  const format = (value: string) =>
    new Intl.DateTimeFormat("af-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Johannesburg",
    }).format(new Date(value));
  const start = format(event.start);
  return event.end && format(event.end) !== start
    ? `${start} – ${format(event.end)}`
    : start;
}

export function money(cents: number): string {
  return new Intl.NumberFormat("af-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
    minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}

export function ticketTotal(
  tickets: NonNullable<VisitorEvent["tickets"]>,
  quantities: Record<string, number>,
): number {
  return tickets.reduce((total, ticket) => {
    const count = quantities[ticket.id] ?? 0;
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      count > (ticket.maxQuantity ?? 10) ||
      !Number.isSafeInteger(ticket.cents) ||
      ticket.cents < 0
    )
      throw new Error("Invalid ticket selection");
    return total + ticket.cents * count;
  }, 0);
}

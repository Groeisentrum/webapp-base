import type { VisitorEvent } from "./eventModel";

export type VisitPreferences = {
  from: string;
  to: string;
  tags: string[];
  people: number;
  search: string;
};
export const emptyPreferences: VisitPreferences = {
  from: "",
  to: "",
  tags: [],
  people: 0,
  search: "",
};
export const validDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const localDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

export function readPreferences(
  query: Record<string, string | undefined>,
): VisitPreferences {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(query.belang ?? "[]");
    if (Array.isArray(parsed))
      tags = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    /* Invalid optional preferences reset to all categories. */
  }
  const from = validDay(query.van ?? "") ? query.van! : "";
  const to =
    from && validDay(query.tot ?? "") && query.tot! >= from ? query.tot! : from;
  const people = Number(query.mense);
  return {
    from,
    to,
    tags: tags.length ? tags : query.tipe ? [query.tipe] : [],
    people: Number.isSafeInteger(people) && people > 0 ? people : 0,
    search: query.soek ?? "",
  };
}

export function preferencesQuery(value: VisitPreferences): URLSearchParams {
  const query = new URLSearchParams();
  if (value.from) {
    query.set("van", value.from);
    query.set("tot", value.to || value.from);
  }
  if (value.tags.length) query.set("belang", JSON.stringify(value.tags));
  if (value.people) query.set("mense", String(value.people));
  if (value.search) query.set("soek", value.search);
  return query;
}

export function matchesVisit(
  event: VisitorEvent,
  preferences: VisitPreferences,
): boolean {
  if (preferences.tags.length && !preferences.tags.includes(event.category))
    return false;
  if (
    preferences.search &&
    !`${event.title} ${event.description} ${event.venue}`
      .toLocaleLowerCase("af")
      .includes(preferences.search.trim().toLocaleLowerCase("af"))
  )
    return false;
  if (
    preferences.people &&
    event.groupSize &&
    (preferences.people < event.groupSize.min ||
      preferences.people > event.groupSize.max)
  )
    return false;
  if (!preferences.from) return true;
  const last = preferences.to || preferences.from;
  if (!event.recurring) {
    const firstDay = event.start ?? event.end;
    const lastDay = event.end ?? event.start;
    return Boolean(
      firstDay &&
      lastDay &&
      localDay(firstDay) <= last &&
      localDay(lastDay) >= preferences.from,
    );
  }
  // A schedule is not inventory. Unknown/by-arrangement schedules remain visible.
  if (!event.weekdays?.length) return true;
  const start = new Date(`${preferences.from}T12:00:00Z`);
  const end = Date.parse(`${last}T12:00:00Z`);
  for (
    let count = 0;
    count < 7 && start.getTime() <= end;
    count++, start.setUTCDate(start.getUTCDate() + 1)
  ) {
    if (event.weekdays.includes(start.getUTCDay())) return true;
  }
  return false;
}

import type { VisitorEvent } from "./eventModel";

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const timestamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/** A personal itinerary entry, never proof of admission. No contact data is exported. */
export function visitCalendar(
  event: VisitorEvent,
  session: string | null,
  reference: string,
  issuedAt: Date,
): string | null {
  const start = session ?? event.start;
  if (!start || !Number.isFinite(Date.parse(start))) return null;
  const end = session
    ? event.durationMinutes
      ? new Date(
          Date.parse(start) + event.durationMinutes * 60000,
        ).toISOString()
      : null
    : event.end;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Visitor Events//Visit Plan//AF",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeText(reference)}@visit-plan`,
    `DTSTAMP:${timestamp(issuedAt.toISOString())}`,
    `DTSTART:${timestamp(start)}`,
    ...(end && Date.parse(end) > Date.parse(start)
      ? [`DTEND:${timestamp(end)}`]
      : []),
    `SUMMARY:${escapeText(`Besoekplan: ${event.title}`)}`,
    `LOCATION:${escapeText(event.venue)}`,
    `DESCRIPTION:${escapeText(`Planverwysing: ${reference}\nNie ’n bevestigde bespreking of toegangskaartjie nie. Bevestig beskikbaarheid en besoekreëlings voor vertrek.`)}`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Fold at 75 UTF-8 octets without splitting a Unicode character.
  return (
    lines
      .map((line) => {
        let result = "",
          length = 0;
        for (const character of line) {
          const bytes = new TextEncoder().encode(character).length;
          if (length + bytes > 75) {
            result += "\r\n ";
            length = 1;
          }
          result += character;
          length += bytes;
        }
        return result;
      })
      .join("\r\n") + "\r\n"
  );
}

/**
 * Converts between the API's ISO timestamps and the value shape a
 * `datetime-local` input expects, which is local time with no zone suffix.
 */
export function toDateTimeLocal(isoValue: string | null): string {
  if (!isoValue) return "";

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromDateTimeLocal(localValue: string): string | null {
  if (!localValue) return null;

  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export function formatDateTime(isoValue: string | null): string {
  if (!isoValue) return "—";

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("af-ZA");
}

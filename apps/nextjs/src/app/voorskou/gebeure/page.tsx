import { getEventPreview } from "@/features/events/previewData";
import { upcomingEvents } from "@/features/events/eventModel";
import { EventExplorer } from "@/features/events/EventExplorer";
import { readPreferences } from "@/features/events/visitPreferences";
export default async function PreviewEvents({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [data, query] = await Promise.all([getEventPreview(), searchParams]);
  return (
    <EventExplorer
      events={upcomingEvents(data.events, new Date(data.asOf))}
      language="af"
      basePath="/voorskou/gebeure"
      initialSearch={query.soek}
      initialCategory={query.tipe}
      initialPreferences={readPreferences(query)}
      contactEmail={data.contactEmail}
    />
  );
}

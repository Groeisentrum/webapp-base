import { notFound } from "next/navigation";
import { getEventPreview } from "@/features/events/previewData";
import { EventDetail } from "@/features/events/EventDetail";
export default async function PreviewEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ terug?: string }>;
}) {
  const [data, { id }, query] = await Promise.all([
    getEventPreview(),
    params,
    searchParams,
  ]);
  const event = data.events.find((item) => item.id === id);
  if (!event) notFound();
  return (
    <EventDetail
      event={event}
      language="af"
      basePath="/voorskou/gebeure"
      preview
      contactEmail={data.contactEmail}
      returnQuery={query.terug}
    />
  );
}

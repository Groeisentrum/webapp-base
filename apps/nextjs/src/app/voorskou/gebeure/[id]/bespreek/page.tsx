import { notFound } from "next/navigation";
import { getEventPreview } from "@/features/events/previewData";
import { BookingFlow } from "@/features/events/BookingFlow";
export default async function PreviewBooking({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessie?: string }>;
}) {
  const [data, { id }, query] = await Promise.all([
    getEventPreview(),
    params,
    searchParams,
  ]);
  const event = data.events.find((item) => item.id === id);
  if (!event?.tickets?.length) notFound();
  return (
    <BookingFlow
      event={event}
      basePath="/voorskou/gebeure"
      language="af"
      initialSession={query.sessie}
    />
  );
}

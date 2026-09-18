import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { getSiteConfig } from "@/shared/services/publicService";
import { getVisitorEvents } from "@/features/events/eventService";
import { upcomingEvents } from "@/features/events/eventModel";
import { EventDetail } from "@/features/events/EventDetail";

export const dynamic = "force-dynamic";
const loadEvents = cache(getVisitorEvents);
const loadConfig = cache(getSiteConfig);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ taal?: string }>;
}) {
  try {
    const [{ id }, query, config] = await Promise.all([
      params,
      searchParams,
      loadConfig(),
    ]);
    const event = (
      await loadEvents(query.taal ?? config.defaultLanguageCode)
    ).find((item) => item.id === id);
    return event
      ? {
          title: `${event.title} | ${config.siteName}`,
          description: event.description,
          openGraph: {
            title: event.title,
            description: event.description,
            ...(event.image ? { images: [event.image] } : {}),
          },
        }
      : { title: "Geleentheid nie beskikbaar nie" };
  } catch {
    return { title: "Gebeure en ervarings" };
  }
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ taal?: string; terug?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  let config;
  try {
    config = await loadConfig();
  } catch {
    return <SetupNotice />;
  }
  const language = query.taal ?? config.defaultLanguageCode;
  const event = (await loadEvents(language)).find((item) => item.id === id);
  if (!event) notFound();
  return (
    <PublicShell siteConfig={config} language={language}>
      <EventDetail
        event={event}
        language={language}
        returnQuery={query.terug}
        contactEmail={config.contactInfo.emailAddress}
        past={!upcomingEvents([event], new Date()).length}
      />
    </PublicShell>
  );
}

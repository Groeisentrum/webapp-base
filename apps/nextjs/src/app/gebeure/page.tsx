import { PublicShell } from "@/app/(public)/PublicShell";
import { SetupNotice } from "@/app/(public)/SetupNotice";
import { getSiteConfig } from "@/shared/services/publicService";
import { getVisitorEvents } from "@/features/events/eventService";
import { upcomingEvents } from "@/features/events/eventModel";
import { EventExplorer } from "@/features/events/EventExplorer";
import { readPreferences } from "@/features/events/visitPreferences";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gebeure en ervarings",
  description:
    "Ontdek komende gebeure en ervarings. Vind jou volgende uitstappie.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  let config;
  try {
    config = await getSiteConfig();
  } catch {
    return <SetupNotice />;
  }
  const language = query.taal ?? config.defaultLanguageCode;
  const events = upcomingEvents(await getVisitorEvents(language), new Date());
  return (
    <PublicShell siteConfig={config} language={language}>
      <EventExplorer
        events={events}
        language={language}
        initialSearch={query.soek}
        initialCategory={query.tipe}
        initialPreferences={readPreferences(query)}
        contactEmail={config.contactInfo.emailAddress}
      />
    </PublicShell>
  );
}

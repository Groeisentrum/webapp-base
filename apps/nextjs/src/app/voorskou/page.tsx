import Link from "next/link";
import { getEventPreview } from "@/features/events/previewData";
import { upcomingEvents } from "@/features/events/eventModel";
import { EventsPreview } from "@/features/events/EventsPreview";
import styles from "@/features/events/Events.module.css";

export default async function PreviewHome() {
  const data = await getEventPreview();
  return (
    <>
      <header className={styles.intro}>
        <span className={styles.eyebrow}>{data.siteName}</span>
        <h1>
          Geskiedenis wat leef.
          <br />
          Herinneringe wat bly.
        </h1>
        <p>
          Kom ontdek, kom vier, kom wees deel. Jou volgende uitstappie begin
          hier.
        </p>
        <Link className={`${styles.primary} mt-6`} href="/voorskou/gebeure">
          Ontdek gebeure en ervarings →
        </Link>
      </header>
      <EventsPreview
        events={upcomingEvents(data.events, new Date(data.asOf))}
        language="af"
        basePath="/voorskou/gebeure"
      />
    </>
  );
}

/**
 * The band the site opens on.
 *
 * The monument's own site leads with a full-width photograph of the place; until a
 * deployment supplies one, this is the same shape rendered in the brand colour, so the
 * page opens on something deliberate rather than on a heading floating in grey.
 *
 * It carries the site's name and nothing else. A welcome line would have to be written
 * for one client, and this template is not allowed to know which client it is serving.
 */
export function SiteHero({ siteName }: { siteName: string }) {
  return (
    <div className="relative isolate overflow-hidden bg-(--brand-primary)">
      {/* A soft off-centre lift, so a flat colour field still has somewhere to look. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 80% at 25% 15%, rgb(255 255 255 / 0.16), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <h1 className="max-w-3xl text-3xl leading-tight font-semibold text-balance text-(--text-inverse) sm:text-5xl">
          {siteName}
        </h1>
      </div>
    </div>
  );
}

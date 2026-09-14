# Points of interest — the shared data contract

**Audience: the map team and the itinerary team.** You both read this one feed. It is
deliberately a single endpoint rather than one per feature, so a pin that is renamed,
moved, hidden or unpublished changes for both of you at the same moment. Please do not
fork a private copy of this shape.

## The endpoint

```
GET /api/public/locations
```

Anonymous. No token required — though sending one reveals pins that are gated behind
sign-in (see [Visibility](#visibility)).

From browser code, call it on the webhost's own origin; the webhost proxies to the API:

```ts
import { getPublicLocations } from "@/shared/services/publicService";

const pins = await getPublicLocations({ language: "af" });
```

| Query parameter | Type | Meaning |
|---|---|---|
| `categoryId` | number, optional | Only pins in this category. Omit for all of them. |
| `language` | string, optional | Language for `name`, `shortDescription` and `categoryName`. Defaults to the site's default language. An unsupported code is a `400`. |

## The response

A plain JSON array — **not** paged, and **not** wrapped in WolkPoort's double-encoded
envelope. That envelope belongs to the gateway; this API is local and returns its
payload directly.

```json
[
  {
    "id": 1,
    "contentId": 42,
    "name": "Voortrekkermonument",
    "shortDescription": "Die hoofmonument met sy Heldesaal, sarkofaag en historiese fries.",
    "categoryId": 7,
    "categoryName": "Geskiedenis",
    "categorySlug": "geskiedenis",
    "categoryColour": "#7b1f2b",
    "photoReference": "vtm/hoofmonument.jpg",
    "latitude": -25.776600,
    "longitude": 28.175300,
    "addressLine": null,
    "tourStopId": null,
    "arAnchorId": null,
    "nfcTagId": null
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | number | The pin. Stable. Use it as your React key and your selection id. |
| `contentId` | number | The content item behind the pin. `GET /api/public/content/{contentId}` returns the full page — body text, event window, asset. Link your detail panel at this, do not duplicate the copy. |
| `name` | string | Already translated. Never null, never empty. |
| `shortDescription` | string \| null | Already translated. One or two sentences; not the full body. |
| `categoryId` | number | |
| `categoryName` | string | Already translated. |
| `categorySlug` | string | Stable, unlocalised. **Key your legend and filters on this, not on `categoryName`** — the name changes with language, the slug does not. |
| `categoryColour` | string \| null | Hex, e.g. `#7b1f2b`. The pin and legend colour. Null when the category sets none — fall back to your own neutral, do not invent a palette per category. |
| `photoReference` | string \| null | **Not necessarily a URL.** See [Photos](#photos). |
| `latitude` | number | Decimal degrees, 6 decimal places (~0.1 m). |
| `longitude` | number | Decimal degrees, 6 decimal places. |
| `addressLine` | string \| null | Free text, for a detail panel. Not a geocoding input. |
| `tourStopId` | number \| null | Always null today. See [Reserved linkage](#reserved-linkage). |
| `arAnchorId` | number \| null | Always null today. |
| `nfcTagId` | number \| null | Always null today. |

The TypeScript type is `PublicLocation` in
[`apps/nextjs/src/shared/interfaces/Domain.ts`](../apps/nextjs/src/shared/interfaces/Domain.ts).
Import it; do not redeclare it.

## Photos

`photoReference` is interpreted according to the content item's configured asset
source, which is a per-tenant setting — YouTube id, S3 key, self-hosted path or a
plain URL. Treating it as a URL works for one deployment and breaks the next one.

Today's VTM seed uses image references like `vtm/hoofmonument.jpg`. Resolve them the
same way the content cards do rather than concatenating a base URL yourself; if you
need the asset type, fetch the content item by `contentId`.

## Visibility

The API filters this feed for whoever is asking, before it is serialised:

- **Unpublished pins never appear.** The publish window (`publishedAt`/`unpublishedAt`)
  is independent of any event dates on the content.
- **A pin inside a sign-in-only or role-restricted category is filtered out** for
  visitors who may not see that category, and restriction cascades down the tree.
- Sending the visitor's session cookie reveals whatever that visitor is entitled to.

So: **render every pin you receive.** Do not implement your own visibility check, and
do not cache one visitor's response and serve it to another. A pin is a physical
place, and the URLs behind them travel on NFC tags and QR codes — a leaked pin is a
leaked location, not just a leaked page.

## Reserved linkage

`tourStopId`, `arAnchorId` and `nfcTagId` are nullable and null in every row today.
The tour, AR and NFC tables do not exist yet. The columns are reserved now so those
features can attach to an existing pin later without migrating a table that the map
and itinerary features are already reading.

Carry them through your types. Do not filter on them, and do not assume they will stay
null forever.

## Stability

Fields may be **added** without warning — tolerate unknown keys. Renaming or removing
a field breaks both consumers at once, so it will not happen without telling you
first. Ten integration tests in
[`PublicLocationsTests.cs`](../apps/api/tests/WebAppBase.Tests.Integration/PublicLocationsTests.cs)
pin this shape and its filtering rules; a change that breaks you should break them first.

## Writing pins

Admin only, and not something the feature teams need:

```
GET    /api/locations?contentId={id}
POST   /api/locations
PUT    /api/locations/{id}
DELETE /api/locations/{id}
```

These require the `Content` or `Admin` role and are audited. Note that `GET /api/locations`
is the **admin** read, keyed by content item — it is not the public feed, and it is not
what you want.

## Seed data

`scripts/seed/vtm-sample.sql` seeds eleven VTM points of interest across the ten map
categories, each with its colour: Voortrekkermonument, Museumteater, Pioniersentrum,
Plaaswerf en Grensplaas, Ontvangs en kaartjiekantoor, Restaurant en koffiewinkel,
Uitkykdek, Hoofparkering, Badkamers by ontvangs, Piekniekterrein and Wandelroetes.

> **Only the main monument has a surveyed coordinate.** Every other pin is placed
> approximately within the heritage site so you have something real-shaped to draw,
> and each carries a `TODO: confirm` note on its row. Build against them, but do not
> let them reach a visitor before VTM has confirmed them.

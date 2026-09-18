# Product

## Register

product

## Users

Visitors to a heritage site, arriving on a phone. The expected case is someone
**standing on site** — outdoors, in bright sun, often one-handed, on mobile data — who
has just tapped an NFC tag or scanned a QR code next to the thing they are looking at.
They want a short answer about what is in front of them, now.

Three further audiences share the same surface:

- **People planning a visit**, at home on a laptop or tablet, asking about times,
  tickets, parking and what there is to see. More patience, bigger screen.
- **School groups and children.** The Pioniersentrum in the sample content is aimed at
  them. Younger readers, often sharing one device, who want a story rather than a fact.
- **Researchers and heritage interest**, who want depth and will read a long answer.

The same page has to serve the visitor with thirty seconds and the researcher with
thirty minutes. Default to the phone and the thirty seconds; let depth be reachable
rather than unavoidable.

There is a second surface, the admin area, used by staff on a tablet or a desktop to
manage content, menus and settings. It is the same register, laid out for a bigger
screen.

## Product Purpose

A reusable per-client web application for a heritage or cultural institution: published
content, a category tree, points of interest on a map, and an AI guide in period voice.
Everything a client owns — categories, languages, branding, menus, feature flags — is
data rather than code, so a new deployment is a configuration exercise.

**Oom Paul**, the chat guide, is a historical portrayal of Paul Kruger for the
Voortrekkermonument deployment. A good turn answers in his own voice and then points at
a real page on the site, which the MCP retrieval tools make possible: the chat is a way
*into* the content, not a replacement for it. It is one feature flag among several, off
until a client turns it on.

Success is a visitor getting the answer they came for without having to learn the site
first, and leaving with somewhere to go next.

## Brand Personality

**Dignified, warm, plain-spoken.** A serious institution that does not talk down to
anyone. Quiet confidence rather than ceremony. The warmth comes from the voice and the
content — Oom Paul's Afrikaans, the photographs, the stories — not from decoration.

Afrikaans is the default language and English the second; the interface speaks
Afrikaans first, in full sentences, without abbreviation or jargon.

## Anti-references

- **Not a generic SaaS product.** No gradient hero, no three-up feature-card grid, no
  tiny tracked uppercase eyebrow over every section, no floating purple chat bubble.
  This is the default look of an AI-generated web app and it is the first thing to
  avoid.
- **Not a dated government portal.** No dense link lists, no tiny type, no tables used
  for layout, no desktop-first afterthought. This is what a heritage institution's
  website usually actually is, and the reason this template exists.
- **Not a consumer support chatbot.** Oom Paul must not read like Intercom or Zendesk:
  no greeting bubble that pops open unprompted, no "How can I help you today?", no
  agent avatar with a green online dot. He is a guide, not a support queue.
- **Not a theme-park attraction.** No cartoon mascot treatment, no loud illustration,
  no animated flourishes around the persona. A historical portrayal, not a costumed
  character.

## Design Principles

**The phone is the design, not the fallback.** The public site is laid out for someone
standing outside holding a phone in one hand. Wider screens get more room, never a
different design. Device-dependent capabilities (AR, NFC, camera) are feature flags and
capability detection, never a second layout or a separate build.

**The content is the interface.** Categories, menus, languages and branding are a
client's data. The template never hardcodes a client's specifics, and design work must
survive a deployment that renames every section and changes every colour.

**Hiding is not protecting.** Anything gated by visibility is filtered server-side, and
a hidden item reports as missing rather than forbidden. The interface must never leak
the existence of something the viewer may not see — not in navigation, not in a result
count, not in an error message.

**Say the true thing plainly.** Error and empty states name what happened in ordinary
Afrikaans and say what the visitor can do about it. "Something went wrong" is a last
resort, not a default.

**Earn the motion.** Movement carries meaning — a panel opening, an answer arriving —
or it does not ship. Nothing decorative, nothing that delays reading.

## Accessibility & Inclusion

**No formal conformance target has been set by the project owner.** This section records
the baseline the work holds to anyway; raise it to an explicit WCAG level when the
client's own obligations are known.

The practical baseline, which the existing token palette already meets: every text
colour clears 4.5:1 on the surfaces it appears on, focus is always visible via the
shared `:focus-visible` ring, controls are reachable and labelled for a screen reader,
and `prefers-reduced-motion` is honoured wherever something animates.

The usage context sharpens two of these. Bright outdoor sunlight makes low-contrast
"elegant" grey text unreadable in practice, so muted text stays well above the minimum
rather than at it. One-handed phone use makes touch-target size and thumb reach real
constraints rather than guidelines.

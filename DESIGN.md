---
name: webapp-base
description: A rebrandable heritage-site visitor app — deep green, ochre, and plain surfaces that get out of the content's way.
colors:
  brand-primary: "#1f5f4b"
  brand-secondary: "#2d7a63"
  brand-accent: "#c8862a"
  page-bg: "#f6f7f5"
  panel-bg: "#ffffff"
  panel-border: "#dfe3dd"
  text-primary: "#1a1f1c"
  text-secondary: "#5a635d"
  text-inverse: "#ffffff"
  state-danger: "#a3271f"
  state-danger-bg: "#fbeceb"
  state-success: "#1f6b3f"
  state-success-bg: "#eaf5ee"
  state-warning: "#8a6116"
  state-warning-bg: "#fcf3e2"
  focus-ring: "#2d7a63"
typography:
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-danger:
    backgroundColor: "{colors.state-danger}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.body}"
  chat-bubble-visitor:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  chat-bubble-guide:
    backgroundColor: "{colors.page-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: webapp-base

## 1. Overview

**Creative North Star: "Interpretive signage, not a website"**

Good signage at a heritage site is legible in full sun, says one thing per panel, and
never competes with what it points at. This system is built the same way. Surfaces are
plain white or a barely-tinted off-white; the deep green does the identifying; the
ochre appears rarely enough that it still means something. Nothing is decorated for its
own sake, because the thing worth looking at is a monument fifty metres away, not a
card with a gradient on it.

The density is generous rather than compact. Body text is 14px with comfortable line
height, targets are large enough for a thumb, and panels breathe. That is a deliberate
trade against information density: the expected reader is standing up, outdoors, in
bright light, holding a phone in one hand — not seated at a desk scanning a table.

This system explicitly rejects four things, carried over from PRODUCT.md. It is not a
generic SaaS product: no gradient hero, no three-up feature-card grid, no tracked
uppercase eyebrow over every section, no floating purple chat bubble. It is not a dated
government portal: no dense link lists, no tiny type, no desktop-first afterthought. It
is not a consumer support chatbot: no unprompted greeting bubble, no agent avatar with
an online dot. It is not a theme-park attraction: no cartoon mascot, no animated
flourish around the persona.

Every colour is a semantic CSS custom property, and `TenantSettings.branding` overrides
the brand tokens at runtime. A component that hardcodes a colour breaks a client
rebrand, which is the one thing this template exists to make cheap.

**Key Characteristics:**
- Mobile-first by contract, not by responsive afterthought
- Semantic tokens only; brand colours are runtime-overridable data
- Flat surfaces, hairline borders, almost no shadow
- Deep green identifies, ochre accents, everything else is neutral
- System font stack — no webfont, no layout shift, no third-party request

## 2. Colors

A cool, slightly desaturated green sits against near-neutral warm-grey surfaces, with a
single ochre reserved for accent.

### Primary
- **Monument Green** (`#1f5f4b`): The identifying colour. Primary buttons, the
  visitor's own chat bubbles, active navigation. 7.51:1 against white, so white text on
  it is comfortably legible.
- **Monument Green Light** (`#2d7a63`): Secondary brand tone, and the focus ring. Used
  where the primary would be too heavy against a tinted surface.

### Secondary
- **Ochre** (`#c8862a`): The accent. Category colour in the sample content, highlights,
  occasional emphasis. Never used for body text — at 2.6:1 on white it is a colour for
  fills and marks, not for reading.

### Neutral
- **Page** (`#f6f7f5`): The page ground. A near-neutral off-white with the faintest
  green cast, not a cream.
- **Panel** (`#ffffff`): Raised surfaces — header, cards, inputs, the chat panel.
- **Panel Border** (`#dfe3dd`): Hairline dividers and input strokes at 1px.
- **Ink** (`#1a1f1c`): Body and heading text. 16.71:1 on panel, 15.55:1 on page.
- **Muted Ink** (`#5a635d`): Secondary text, placeholders, timestamps. 6.22:1 on panel
  and 5.79:1 on page — deliberately well clear of 4.5:1 rather than sitting on it,
  because this text gets read in direct sunlight.

### State
- **Danger** (`#a3271f`) on **Danger Wash** (`#fbeceb`): errors and destructive actions.
- **Success** (`#1f6b3f`) on **Success Wash** (`#eaf5ee`).
- **Warning** (`#8a6116`) on **Warning Wash** (`#fcf3e2`).

### The Voortrekkermonument deployment

The tokens above are the template's own defaults. A client's palette arrives as data
through `TenantSettings.branding`, which overrides exactly three of them:
`--brand-primary`, `--brand-secondary` and `--brand-accent`. The VTM palette is taken
from the live site at vtm.org.za, whose theme defines five author-set colours among the
stock ones:

- **Slate** (`#25404d`) → `--brand-primary`. The site's dominant colour, carrying its
  section backgrounds and headings. 10.94:1 under white text.
- **Navy** (`#26303e`) → `--brand-secondary`, and therefore the focus ring.
- **Brass** (`#b88f36`) → `--brand-accent`. Marks and fills only — 2.99:1 under white
  and 2.78:1 against the page, so it can carry neither text nor a control's boundary.
- **Olive** (`#6b723a`) and **Terracotta** (`#b15535`): category colours in the seed.

Ten map categories cannot come from five colours, so the rest are lighter and darker
steps of the same five, each verified at 3:1 or better against the map ground.

### Named Rules

**The Accent Is Not A Control Rule.** The accent may fill a mark, a category chip or a
pin. It may not fill a control or carry text. On the VTM palette brass fails both the
4.5:1 for text and the 3:1 a control's boundary needs, and a client can set anything —
so controls take `--brand-primary`, which is the colour a brand is chosen to be read
against.

**The Rebrand Rule.** No component may name a colour. Every colour reaches a component
through a semantic token, because `TenantSettings.branding` rewrites the brand tokens at
runtime and a hardcoded hex silently survives a client rebrand.

**The Sunlight Rule.** Muted text clears 4.5:1 by a real margin, not by a rounding
error. The reader is outdoors. Light grey "for elegance" is unreadable at the monument
and is the single fastest way to make this feel AI-generated.

**The Rare Accent Rule.** The accent covers well under 10% of any screen. Its scarcity is
what makes it read as emphasis rather than as decoration.

**The Focus Ring Follows The Brand Rule.** `--focus-ring` derives from
`--brand-secondary` rather than being a literal, so a client whose palette contains no
green does not get a green focus ring.

## 3. Typography

**Display Font:** system-ui (with -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** system-ui (same stack)
**Label/Mono Font:** none distinct

**Character:** One family, differentiated by weight and size alone. The system stack is
a deliberate choice rather than a placeholder: it renders instantly with no webfont
request, no layout shift and no third-party dependency, which matters when the reader is
on mobile data at a monument. It also means the interface looks native to whatever phone
is holding it, which suits signage better than a personality font would.

### Hierarchy
- **Title** (600, 1.125rem/`text-lg`, 1.3): Page and panel headings. The site name in
  the header steps from `text-base` to `text-lg` at `sm`.
- **Subtitle** (600, 1rem/`text-base`, 1.4): Card headings, section headings.
- **Body** (400, 0.875rem/`text-sm`, 1.5): Everything read as prose, including chat
  messages. Cap prose measure at 65–75ch; the chat panel does this by capping bubbles at
  85% of a narrow column.
- **Label** (500, 0.75rem/`text-xs`, 1.4): Field labels, secondary metadata, helper
  text. Sentence case.

### Named Rules

**The Sentence Case Rule.** Labels and buttons are sentence case in Afrikaans. No
all-caps tracked eyebrows — that pattern is the loudest AI tell in the current cohort
and it reads as branding noise on a signage surface.

## 4. Elevation

This system is essentially flat. Depth comes from tonal layering — a white panel on an
off-white page, separated by a 1px border — rather than from shadow. There is one
exception, and it is functional: the floating chat launcher and the chat panel carry a
shadow because they genuinely float above scrolling page content and need to read as a
separate layer rather than as part of the page.

### Shadow Vocabulary
- **Floating layer** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`,
  Tailwind `shadow-lg`): the chat launcher and, on tablet and up, the chat panel. Not
  used on cards, inputs or the header.

### Named Rules

**The Flat-By-Default Rule.** A surface gets a shadow only when it actually overlaps
content that scrolls beneath it. Cards, headers and inputs are separated by tone and a
hairline border, never by elevation.

## 5. Components

### Buttons
- **Shape:** `rounded-md` (6px), `inline-flex`, `gap-2` for an icon plus label.
- **Primary:** Monument Green fill, inverse text, `px-4 py-2`, `text-sm font-medium`.
- **Secondary:** Panel fill, ink text, 1px panel border; hovers to the page ground.
- **Danger:** Danger fill, inverse text.
- **Ghost:** Transparent, muted ink, darkening to full ink on hover.
- **Hover / Focus:** Filled variants drop to 90% opacity; focus is the global 2px
  `--focus-ring` outline at 2px offset, never removed.
- **Disabled:** `opacity-50` and `cursor-not-allowed`.

### Cards / Containers
- **Corner Style:** `rounded-lg` (8px) for panels, `rounded-md` (6px) for controls.
- **Background:** Panel white on the page ground.
- **Shadow Strategy:** None. See Elevation.
- **Border:** 1px `--panel-border`.
- **Internal Padding:** `px-4 py-3` compact, `p-4` standard.

### Inputs / Fields
- **Style:** Panel fill, 1px panel border, `rounded-md`, `px-3 py-2`, `text-sm`.
- **Placeholder:** Muted ink, which clears 4.5:1 rather than using a browser default
  grey.
- **Focus:** The global `:focus-visible` ring — 2px `--focus-ring` at 2px offset.
- **Disabled:** Reduced opacity; the control keeps its border so the field is still
  visible as a field.

### Navigation
- Header is a panel-white bar with a hairline bottom border, holding the site name, a
  language switcher and a session menu, wrapping rather than truncating on narrow
  screens. A bottom hover menu carries the secondary tier. Categories come from the API
  already filtered for the viewer — navigation is never a source of truth about what
  exists.

### Oom Paul chat (signature component)

A floating launcher that expands into a conversation panel: a full-height sheet below
`sm`, a docked corner panel above it. Present on every public page, gated on the
`chatbot` feature flag.

- **Launcher:** circular (`rounded-full`), `--brand-primary`, inverse icon, `shadow-lg`,
  56px. Sits at `bottom-20` on phones to clear the docked bottom menu, which is fixed
  full-width on the same layer. `inert` while the panel is open.
- **Bubbles:** `rounded-lg`, `px-3 py-2`, `text-sm`, `whitespace-pre-wrap`, capped at
  85% width. The visitor's are Monument Green with inverse text and sit right; Oom
  Paul's are the page ground with a hairline border and sit left. The asymmetry is the
  only thing distinguishing speaker — no avatars, no name labels, no status dots.
- **Streaming:** the reply grows in place, one message, token by token. The panel
  follows the growing text rather than the message count.
- **Waiting:** "Oom Paul dink..." appears only while nothing has arrived. The moment
  words start, the text is its own progress indicator and the notice goes.
- **Composer:** auto-growing textarea, `min-h-11` (44px — a thumb target), capped at
  `max-h-32`, disabled for the whole turn so a second billed call cannot start. Bottom
  padding clears the iOS home indicator.
- **Announcement:** a visually hidden `aria-live="polite"` region carries the finished
  reply once. A streamed answer is painted, never announced; announcing each token
  instead would interrupt the reader on every one.
- **Closed state:** the panel stays mounted so it can animate, and is `inert` while
  closed — not merely `aria-hidden`, which left its three controls focusable behind an
  invisible surface.
- **Not modal.** Nothing traps focus, and above `sm` the panel deliberately leaves the
  page usable, so it does not claim `aria-modal`.

## 6. Do's and Don'ts

### Do:
- **Do** reach every colour through a semantic token (`text-(--text-primary)`,
  `bg-(--brand-primary)`). `TenantSettings.branding` rewrites these at runtime.
- **Do** keep muted text at `--text-secondary` (#5a635d) or darker. It clears 4.5:1 on
  both grounds with room to spare, and the reader is in direct sun.
- **Do** design the phone first. `sm` (640px) is where the public site gains room; `lg`
  (1024px) is where the admin sidebar becomes a column.
- **Do** give touch targets at least 44px of height on the public site.
- **Do** keep prose to 65–75ch.
- **Do** honour `prefers-reduced-motion` on anything that animates.
- **Do** write error and empty states as plain Afrikaans sentences that say what
  happened and what to do next.

### Don't:
- **Don't** hardcode a colour. Not one hex, not one Tailwind palette class
  (`bg-emerald-600`), anywhere in a component.
- **Don't** add a gradient hero, a three-up feature-card grid, or a tiny tracked
  uppercase eyebrow above a section. That is the generic-SaaS look this project names
  as an anti-reference.
- **Don't** let the chat read like a consumer support widget: no greeting bubble that
  opens unprompted, no "How can I help you today?", no agent avatar with a green online
  dot.
- **Don't** give Oom Paul a cartoon mascot treatment or animated flourishes. He is a
  historical portrayal.
- **Don't** use `border-left` thicker than 1px as a coloured stripe on a card, alert or
  list item.
- **Don't** use the accent for body text or for a control. Template ochre is 2.6:1 on
  white and VTM brass is 2.99:1 — fill colours, not reading colours.
- **Don't** put a control at `bottom-4` on the public site. The bottom hover menu docks
  fixed at `bottom-0` on the same layer and the two will overlap.
- **Don't** put a shadow on a card, header or input. Flat by default; shadow is for
  things that actually float.
- **Don't** report what a viewer may not see — not in a count, not in an empty state,
  not in an error. Hidden is missing, never forbidden.

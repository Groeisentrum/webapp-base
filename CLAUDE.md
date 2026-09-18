# webapp-base — Claude Code instructions

Read the root `C:\Code\CLAUDE.md` too. Ecosystem-wide rules (git flow, language split,
no AI attribution, SSM configuration, coding standards) apply here and are not repeated.

## What this repo is

A reusable per-client web application: Next.js webhost + ASP.NET Core API + MariaDB,
deployed together on one EC2 instance.

**This is not a lego block.** It is not behind WolkPoort/BlokDirigent, it is not in
`gateway_api_functions`, and no sibling service calls it. It calls *out* through
WolkPoort when it needs another service's data. Do not add it to the function registry.

## Rules

- Do not make changes until you are 95% confident what to build. Ask first.
- **Never bake a client's specifics into code.** Categories, languages, branding,
  menus and feature flags are data. If a client needs something the template cannot
  express, extend `TenantSettings` — do not branch on client identity.
- **The publish window and the event window are independent.** `PublishedAt`/
  `UnpublishedAt` control site visibility; `EventStart`/`EventEnd` describe when
  something happens. Never validate one against the other, and never let a past event
  hide a published page.
- **Hiding is not protecting.** Anything gated by `Visibility` must be filtered in
  the API, never only omitted from navigation — URLs travel here via NFC tags and QR
  codes. Restrictions cascade down the category tree, and an item's own setting may
  only narrow access, never widen it. Hidden items report 404, not 403, so a direct
  URL cannot confirm they exist.
- **Consent must be evidenced, not just collected.** Registration writes a
  `ConsentRecord` — stamped with the policy versions in force — *before* the account
  is created, so an account can never exist without evidence behind it. Never
  soft-delete those records.
- **Registration verifies the email before creating the account**, so no account ever
  exists for an unproven address. Step two takes identity from the stored consent
  record, never from the request — otherwise a caller could verify one address and
  register another. Needs `OtpPurposes.Registration` admitted to SkaapHond's
  contact-bound path; until then it fails closed. See `docs/DEPLOYMENT.md`.
- **`GET /api/public/locations` is a published contract** with two independent
  consumers (the map and the itinerary features). Add fields freely; renaming or
  removing one breaks both at once, so coordinate first. Never let a consumer fork its
  own copy of the shape, and never let one reimplement the visibility filtering — the
  feed is already filtered for the caller. See `docs/LOCATIONS-CONTRACT.md`.
- A point of interest is a content item that has coordinates. Name, description, photo
  and category live on `Content`; `LocationDetail` holds geometry and the reserved
  linkage ids only. Do not duplicate content fields onto the location row.
- Never call `fetch` directly in components — use the typed services in
  `src/shared/services/`.
- Never hardcode colours — use the semantic tokens in `globals.css`.
- **One responsive codebase, no device split.** The public site is mobile-first —
  visitors arrive from an NFC tap or QR code while standing on site. The admin area
  is tablet-and-up. Device-dependent *capabilities* (AR, NFC, camera) are feature
  flags plus capability detection, never a second layout or a separate build.
- The local API returns plain JSON. The double-encoded envelope belongs to WolkPoort
  alone; applying it to `/api/local` corrupts every response.
- Authorisation is decided in the C# API from the verified token. `X-Actor-*` headers
  are audit attribution only — never gate access on them.
- **The vector index is a lookup, never an authority.** `content_embeddings` answers
  what is probably relevant; `PublicContentService` answers what the caller may see,
  and it runs after every match. A dropped match is dropped in silence — reporting
  "1 hidden" confirms the hidden item exists just as surely as a 403 would.
- **Oom Paul's harness owns persona, prompt, model, safety rules and tools.** They live
  in the AgentCore console, not here. The API carries the conversation and hosts the
  MCP server the harness calls; it never assembles a prompt or picks a model.
- No MediatR. This follows the established service/repository shape used by SkaapHond,
  Kraal and WolkPoort.

## Commands

```bash
docker compose up --build          # full stack on https://localhost
dotnet test --project apps/api     # 227 tests: unit + integration
npm --prefix apps/nextjs run lint
npm --prefix apps/nextjs run build
npm --prefix apps/nextjs run test  # 87 tests: node + jsdom wiring
```

A task is done only when the API builds warning-free with tests green, and the webhost
lints, type-checks, tests and builds.

## Layout

```
apps/api/src/WebAppBase.Api/
  Domain/         entities, value objects, enums, constants
  Services/       orchestration and business rules, returns Result<T>
  Repositories/   data access behind interfaces
  Data/           DbContext, configurations, migrations
  Controllers/    HTTP surface, role attributes

apps/nextjs/src/
  app/api/        auth routes and the three proxies
  app/admin/      admin dashboard (tablet and up)
  app/(public)/   shared public-site components
  shared/         stores, hooks, services, lib, components
  proxy.ts        route gating (Next 16 renamed this from middleware.ts)
```

Breakpoints: `sm` (640px) splits phone from tablet on the public site; `lg` (1024px,
iPad landscape) switches the admin sidebar between a horizontal strip and a left
column. Admin tables scroll inside their panel rather than widening the page.

`next.config.ts` sets `agentRules: false` — otherwise Next writes its own
`AGENTS.md`/`CLAUDE.md` into `apps/nextjs/`, which would compete with this file.

Code placement follows konnek360's three levels: route-level by default, promote to
feature-level at two consumers, promote to `shared/` at two features.

## Migrations

```bash
cd apps/api/src/WebAppBase.Api
dotnet ef migrations add <Name> --output-dir Data/Migrations
```

The API applies migrations on startup and fails to start if they fail. Prefer additive
migrations — a rollback restores code, not schema.

## Reference

- [README.md](README.md) — quick start, template vs per-client
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, auth flow, request paths
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — standing up a client deployment

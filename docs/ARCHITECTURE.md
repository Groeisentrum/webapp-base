# Architecture

## Where this sits

A lego block is called *through* WolkPoort. This template is not one. It is a
standalone application that calls *out* through WolkPoort when it needs another
service's data.

```mermaid
flowchart LR
    Visitor[Visitor] --> Nginx
    Editor[Admin / editor] --> Nginx

    subgraph EC2["Single EC2 instance"]
        Nginx[nginx<br/>TLS termination] --> Webhost[Next.js webhost]
        Webhost --> Api[ASP.NET Core API]
        Api --> Db[(MariaDB)]
    end

    Webhost -- login, refresh --> Skaaphond[SkaapHond]
    Api -- validates token --> Skaaphond
    Api -- notifications --> Posduif[Posduif]
    Webhost -. only when another service's data is needed .-> Wolkpoort[WolkPoort]
```

The database publishes no host port and the API publishes none in production. Both are
reachable only from inside the compose network, so the authenticated surface cannot be
hit directly from the internet.

## Request paths

Three proxies with deliberately different contracts. Confusing them is the most likely
way to break this app.

| Route | Upstream | Auth | Body handling |
|---|---|---|---|
| `/api/local/*` | This deployment's API | Bearer token attached | Plain JSON, untouched |
| `/api/public/*` | This deployment's API | None; GET only | Plain JSON, untouched |
| `/api/backend/*` | WolkPoort | Bearer token attached | Envelope unwrapped, embedded status lifted |

WolkPoort answers `200` even when the inner call failed, and double-encodes its
payload. `/api/backend` unwraps that and lifts the embedded status so callers can
trust `res.ok`. The local API does neither of those things — it returns ordinary
JSON with ordinary status codes, so applying the envelope logic to it would corrupt
every response.

## Authentication

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Webhost
    participant S as SkaapHond
    participant A as API

    B->>W: POST /api/login
    W->>S: POST /auth/v2/login
    S-->>W: token + refreshToken
    W-->>B: httpOnly cookies (no token in body)

    Note over B,W: On every load
    B->>W: GET /api/session
    W-->>B: decoded user, or 401

    B->>W: GET /api/local/api/content
    W->>A: + Authorization: Bearer, X-Actor-*
    A->>A: verify signature, read roles
    A-->>W: 200 / 403
```

Points that matter:

- **The browser never holds a token.** Cookies are httpOnly, so page script cannot
  read or exfiltrate one. The login response body carries no token either.
- **Tokens above 3500 bytes are split** across numbered cookies and rejoined on read,
  because a single cookie caps near 4KB.
- **Refresh tokens rotate,** so a token is valid once. Concurrent requests share one
  in-flight refresh, and the result stays addressable by the spent token for 30
  seconds — without that, two parallel requests would invalidate each other and sign
  the user out.
- **Authorisation happens in the API**, against the token's signature. The webhost
  decodes the payload without verifying it, but only to decide what to render. The
  `X-Actor-*` headers are audit attribution, not credentials: forging one can
  misattribute an audit row, never grant access.
- **Middleware checks cookie presence only.** It runs without the signing key, and
  exists to send signed-out users to the login page rather than an empty dashboard.

## Data model

```mermaid
erDiagram
    TENANT_SETTINGS ||--o{ CATEGORY : configures
    CATEGORY ||--o{ CATEGORY : "parent of"
    CATEGORY ||--o{ CONTENT : holds
    CONTENT ||--o{ LOCATION_DETAIL : "pinned at"
    CATEGORY ||--o{ MENU_ITEM : "linked from"
    MENU_ITEM ||--o{ MENU_ITEM : "parent of"
    CONTENT ||--o{ NOTIFICATION_LOG : queues

    TENANT_SETTINGS {
        string SiteName
        string DefaultLanguageCode
        json ActiveLanguageCodes
        json FeatureFlags
        json Branding
        json ContactInfo
    }
    CATEGORY {
        long ParentCategoryId
        string Name
        string Slug
        int SortOrder
    }
    CONTENT {
        long CategoryId
        int AssetType
        string AssetReference
        datetime PublishedAt
        datetime UnpublishedAt
        datetime EventStart
        datetime EventEnd
        json Recurrence
    }
    TRANSLATION {
        string EntityType
        long EntityId
        string FieldName
        string LanguageCode
        string Value
    }
    AUDIT_LOG {
        string EntityType
        long EntityId
        int Action
        string ActorUserId
        datetime OccurredAt
    }
```

`TRANSLATION` and `AUDIT_LOG` attach by `EntityType` + `EntityId` rather than a foreign
key, so any entity becomes translatable or auditable without a schema change.

### Publish window and event window are independent

The single most important rule in this model. `PublishedAt`/`UnpublishedAt` control
whether an item is **visible on the site**. `EventStart`/`EventEnd` describe **when
something happens**. They are validated separately and never against each other.

A concert page published in January for a December event is visible from January. It
stays visible in the following March, because the event being over does not close the
publish window. Conflating the two would silently unpublish every past event.

### Visibility

Categories, content and menu items each carry `Visibility` (`Public`,
`Authenticated`, `Restricted`) plus a role list for the restricted case.

Two rules make it hold:

- **Restrictions cascade.** Visibility is checked at every level of the category
  chain rather than folded into one value, so an item's own setting can only narrow
  access, never widen it. A public item inside a members-only section stays hidden —
  otherwise the section's restriction would mean nothing.
- **Enforcement is server-side.** Hidden items are filtered out of the API, not just
  omitted from navigation. Hiding a menu entry leaves its URL reachable, and on this
  template URLs travel — NFC tags and QR codes distribute them.

Hidden items report **404, not 403**, the same as drafts, so a direct URL cannot
confirm that restricted content exists.

Anonymous callers are filtered in SQL. Role-gated items survive that filter for any
signed-in viewer and are checked in memory afterwards, which can leave a page shorter
than its size and the total slightly over-reported. That is acceptable while role-gated
content is a small subset; a deployment that gates most of its content should replace
`VisibleToRoles` with a join table so the filter runs in SQL.

### Registration, verification and consent

Visitors self-register through the API — not the webhost — because the API owns the
consent evidence and already reads secrets from Parameter Store. It runs in two steps.

```mermaid
sequenceDiagram
    participant B as Browser
    participant W as Webhost
    participant A as API
    participant S as SkaapHond

    Note over B,S: Step 1 — consent and code
    B->>W: POST /api/register/start
    W->>A: + caller address
    A->>S: POST /auth/v2/otp/send (purpose: registration)
    S-->>A: pendingId
    A->>A: write ConsentRecord (versions stamped, pendingId)
    A-->>B: pendingId, masked recipient

    Note over B,S: Step 2 — verify, then create
    B->>W: POST /api/register/complete (pendingId, code, password)
    W->>A: 
    A->>S: POST /auth/v2/otp/verify
    S-->>A: verified
    A->>S: POST /users/create (Client role id)
    S-->>A: user id
    A->>A: link record to user id
    A-->>B: 200 (no token)
```

Three orderings carry weight here:

- **Verify before create.** No account ever exists for an unproven address, so there
  is no half-registered state to clean up. It also makes SkaapHond's hardcoded
  `EmailConfirmed = true` on `/users/create` accurate rather than an assumption.
- **Consent before anything.** Written at step one, so an account can never exist
  without evidence behind it. An abandoned registration leaves an unlinked record,
  retained as a trail of the attempt.
- **Identity comes from the record, not the request.** Step two carries no email or
  username — those are read from the consent row the pendingId points at. Otherwise a
  caller could verify one address and register under a different one.

Registration mints no session; the visitor signs in afterwards through the normal login
route. Every step is rate limited per caller address, since these are the only public
routes that write to an upstream system. Upstream failure reasons are logged but never
returned — they name the account and would let a caller probe which usernames exist.

> **SkaapHond prerequisite.** Verification happens before the account exists, so the
> OTP row carries no user id. SkaapHond permits that only on its contact-bound path,
> which is gated on a fixed set of purposes. `registration` must be added to its
> `OtpPurposes` and admitted to that branch, or `/otp/send` answers "user not found".
> Until then registration **fails closed** — it refuses rather than creating anything
> unverified. Do not substitute `signing-ceremony` to avoid the change: purposes scope
> resend invalidation, so reusing one conflates two intents and muddies any audit of
> OTP rows.

### Soft deletes

Everything except the audit and notification logs carries `IsDeleted`, and every query
filters on it by default. Deletions are reversible and the audit trail stays
meaningful. Audit rows are append-only and are never soft-deleted.

Categories refuse deletion while they hold children or content, rather than cascading —
removing a section should not silently take its contents with it.

### Translations and fallback

A row stores its text in the deployment's default language. Other languages live in
`TRANSLATION`. A missing translation falls back to the default-language value rather
than hiding the item, so an untranslated field degrades to readable text instead of a
gap. Languages outside the configured list are rejected on write, so translations
cannot accumulate that nothing will ever render.

## Notifications

Publishing content queues a `NOTIFICATION_LOG` row **in the same transaction** as the
change. A background dispatcher drains the queue and sends to Posduif.

This is a transactional outbox, and the reason for it is that a crash between
committing a change and sending its notification would otherwise lose the notification
silently. A failed send is marked `Failed` and left alone — ecosystem convention is to
fail fast rather than retry, and a silent retry loop risks duplicate sends.

## Layering in the API

```
Controllers/    HTTP surface, role attributes, Result -> status mapping
Services/       Orchestration and business rules, returns Result<T>
Repositories/   Data access behind interfaces
Data/           DbContext, configurations, migrations
Domain/         Entities, value objects, enums, constants
```

Following the established GroeiSentrum services (SkaapHond, Kraal, WolkPoort), there
is **no MediatR**. Expected failures return `Result<T>` and are mapped to status codes
at the controller; unexpected failures throw and are caught by the global handler,
which returns a generic Afrikaans message and logs the detail. Exception text can carry
connection strings and SQL, so it never reaches the caller.

All writes in a request share one `IUnitOfWork`, so a mutation, its audit entry and any
queued notification commit together or not at all.

## Language

Code, comments and commits are English. Everything a user sees — labels, errors,
toasts — is Afrikaans, with other languages supplied per tenant through `TRANSLATION`.

# webapp-base

A reusable web application template. Each client gets its own deployment — webhost,
API and database together on a single EC2 instance — built from this one codebase.

## What this is, and what it is not

**It is** a standalone application that authenticates against SkaapHond and owns its
own data. Content, categories, languages, branding and navigation are all rows in its
database, configured through an admin UI. Nothing about a particular client is compiled
in.

**It is not** a GroeiSentrum lego block. It does not sit behind WolkPoort/BlokDirigent,
it is not in the function registry, and other services do not call it. It reaches
*out* through WolkPoort when it needs another service's data, which is the reverse of
how a lego block works.

## Stack

| Part | Technology |
|---|---|
| Webhost | Next.js 16, TypeScript, Tailwind, Zustand, React Query |
| API | ASP.NET Core (.NET 10), EF Core, layered services/repositories |
| Database | MariaDB 11, migrated by the API on startup |
| Proxy | nginx, terminating TLS |
| Auth | SkaapHond JWT in httpOnly cookies |

## Quick start

```bash
cp .env.example .env
```

Generate a self-signed certificate for local TLS:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" -keyout docker/nginx/ssl/key.pem -out docker/nginx/ssl/cert.pem
```

Start the stack:

```bash
docker compose up --build
```

Then open <https://localhost> and accept the self-signed certificate warning. The site
will report that it has not been set up yet — sign in at `/aanmeld` with a SkaapHond
account holding the `Admin` role and configure it at `/admin/instellings`.

To load the worked example instead of starting empty:

```bash
docker compose exec -T mariadb mariadb -uroot -prootpassword webapp_base < scripts/seed/vtm-sample.sql
```

### Running the parts directly

The API and webhost can run outside Docker against the compose database, which
publishes port **3310** on the host (3306, 3307 and 3309 are taken elsewhere in the
ecosystem — see the root `CLAUDE.md`).

```bash
docker compose up mariadb
```

```bash
dotnet run --project apps/api/src/WebAppBase.Api
```

```bash
npm --prefix apps/nextjs run dev
```

## Roles

Two flat roles, read from the SkaapHond JWT. There is no local role table.

| Role | May change |
|---|---|
| `Admin` | Site settings, feature flags, languages, category structure, audit trail |
| `Content` | Content, translations, menu items, locations |

`Admin` also covers everything `Content` can do — an admin configuring a site should
not be locked out of the content inside it.

## Layout

```
apps/api/          ASP.NET Core API — owns this deployment's data
apps/nextjs/       Next.js webhost — admin UI, public site, auth routes
docker/nginx/      Reverse proxy: TLS termination and routing
scripts/db-init/   Runs automatically on an empty database volume
scripts/seed/      Client content, run deliberately
docs/              Architecture and deployment guides
```

## Template vs per-client

Most of the repository is template and should be changed for everyone or no one. A
short list of things a client deployment is expected to change:

| Path | Why |
|---|---|
| `scripts/seed/*.sql` | Client's categories, languages, branding, starting content |
| `.env` / Parameter Store | URLs, database credentials, API keys |
| `apps/nextjs/src/app/privaatheid/page.tsx` | POPIA notice — must be legally reviewed |
| `apps/nextjs/src/app/bepalings/page.tsx` | Terms of service — must be legally reviewed |
| `apps/nextjs/src/app/globals.css` | Only if brand tokens are needed beyond what TenantSettings covers |

Everything else — entities, services, endpoints, admin screens, the auth layer — is
shared. Changing it for one client changes it for all of them, so a client-specific
need is usually a sign that something belongs in `TenantSettings` instead.

Adding a feature flag needs no code change: flags are an open key/value map, so a
deployment can introduce its own and read it from `featureFlags` on the public site
config.

## Checks

```bash
dotnet test --project apps/api
```

```bash
npm --prefix apps/nextjs run lint && npm --prefix apps/nextjs run build && npm --prefix apps/nextjs run test
```

Both must pass before a change is considered done.

## Further reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, auth flow, request paths
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — standing up a new client deployment

# Deployment

How to stand up a new client deployment from this template.

Each client gets its own EC2 instance, its own ECR repositories and its own Parameter
Store subtree. Nothing is shared between clients except the code.

## 1. Branch

Work on a client branch off `dev`. The git flow is
`feature/*` → `dev` → `main`; `dev` deploys to the dev environment and `main` to
production. Never commit to `main` directly.

```bash
git checkout dev && git pull && git checkout -b client/<name>
```

Most clients need no code change at all — configuration and seed data cover it. If you
find yourself editing a service to suit one client, that is a signal the difference
belongs in `TenantSettings` instead.

## 2. AWS resources

In `af-south-1`:

- Three ECR repositories: `webapp-base-api`, `webapp-base-web`, `webapp-base-nginx`
- One EC2 instance, **arm64** (t4g family) — the images are built for arm64 only
- An instance profile granting `AmazonSSMManagedInstanceCore`, ECR pull, and read on
  the client's Parameter Store path
- A deploy role that GitHub Actions assumes via OIDC, allowing ECR push and
  `ssm:SendCommand` against that instance

## 3. Secrets in Parameter Store

Under `/GroeiSentrum/WebappBase/` (or a client-specific path, set via
`PARAMETER_STORE_PATH`). The API reads these at startup when
`Configuration__UseParameterStore` is true.

| Parameter | Type | Notes |
|---|---|---|
| `Database/ConnectionString` | SecureString | Overrides the compose-supplied value |
| `Skaaphond/SigningKey` | SecureString | Must match SkaapHond; at least 32 bytes |
| `Skaaphond/Issuer` | String | Enables issuer validation |
| `Skaaphond/Audience` | String | Enables audience validation |
| `Skaaphond/ApiKey` | SecureString | Sent when creating accounts |
| `Skaaphond/ClientRoleId` | String | Numeric id of the `Client` role — see below |
| `Skaaphond/DataHolderId` | String | Stamped on self-registered accounts |
| `Skaaphond/EntityId` | String | Stamped on self-registered accounts |
| `Posduif/ApiKey` | SecureString | |

Nothing secret belongs in `.env`, in the repository, or in a Docker image.

> `Skaaphond__AllowUnverifiedTokens` must be **false** in production. It skips
> issuer and audience checks and exists only so local development works against a dev
> token. Leaving it true in a deployed environment weakens token validation.

### Enabling visitor registration

Registration is off until four things are true. Each is a deliberate step, and the
API fails closed on any of them rather than creating something half-formed.

1. **The `Client` role exists in SkaapHond** and you know its numeric id. SkaapHond
   assigns roles by id rather than name, and the id differs per environment, so it
   cannot be hardcoded here. Create the role through SkaapHond's `RoleController`
   (Admin-gated) and put the id in `Skaaphond/ClientRoleId`. With it unset the API
   refuses to register anyone rather than creating accounts that carry no role —
   such an account could sign in but reach nothing.

2. **SkaapHond accepts the `registration` OTP purpose.** Email is verified before the
   account exists, so the OTP row carries no user id, and SkaapHond permits that only
   on its contact-bound path. That path is gated on a fixed purpose set, so
   `registration` must be added to its `OtpPurposes` **and** admitted to the branch in
   `OtpController.Send`. Until then `/otp/send` answers "user not found" and
   registration refuses — nothing unverified is ever created.

3. **A real system API key is configured.** `/otp/send` is `[AuthorizeSystem]`-gated
   and reads `DataHolderId` and `ApiKey` claims off the caller to fund gateway
   dispatch, so a placeholder will not do. `/otp/verify` and `/otp/resend` are
   anonymous and need nothing.

4. **An admin switches it on** for the deployment at `/admin/instellings`, where the
   privacy-policy and terms versions are also set.

> Related, and worth fixing on the SkaapHond side: `/users/create` currently hardcodes
> `EmailConfirmed = true`. With verify-before-create that value is accurate for this
> template, but it means SkaapHond cannot distinguish verified from unverified accounts
> created by any other route.

## 4. Prepare the instance

```bash
sudo mkdir -p /opt/webapp-base/docker/nginx/ssl && cd /opt/webapp-base
```

Copy `docker-compose.deploy.yml` and an `.env` based on `.env.production.example` into
`/opt/webapp-base`. The `.env` needs `ECR_REGISTRY`, `DB_NAME`, `DB_ROOT_PASSWORD` and
the service URLs — no API keys.

Install TLS material into `docker/nginx/ssl/` as `cert.pem` and `key.pem`. Either
terminate TLS at an ALB with an ACM certificate (simplest, renews itself) or place a
real certificate on the instance. Do not ship a self-signed certificate to production.

## 5. GitHub configuration

Repository secrets:

| Secret | Purpose |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | Role assumed via OIDC — no long-lived keys are stored |
| `EC2_INSTANCE_ID` | Deployment target for SSM |

Create `production` and `development` environments in repository settings. Add required
reviewers to `production` so a push to `main` cannot ship unattended.

## 6. First deploy

Push to `dev`. CD builds the three arm64 images, pushes them to ECR, and runs
`docker compose up -d` on the instance over SSM. No SSH key exists and no inbound port
is opened.

The API applies EF Core migrations on startup and **fails to start if they fail** —
an instance that cannot bring its schema up to date must not serve traffic. Watch the
first boot:

```bash
aws ssm start-session --target <instance-id>
```

```bash
docker logs -f webapp-base-api
```

## 7. Seed the client

The site reports that it has not been set up until `TenantSettings` exists. Either
configure it through the admin UI, or adapt the worked example:

```bash
cp scripts/seed/vtm-sample.sql scripts/seed/<client>.sql
```

Edit the site name, languages, branding, categories and menus, then load it:

```bash
docker compose -f docker-compose.deploy.yml exec -T mariadb mariadb -uroot -p"$DB_ROOT_PASSWORD" "$DB_NAME" < scripts/seed/<client>.sql
```

The seed is idempotent — re-running it changes nothing that already exists.

Finally, sign in at `/aanmeld` with a SkaapHond account holding the `Admin` role and
confirm the settings at `/admin/instellings`.

## Backups

The database lives in the `mariadb-data` named volume on the instance, so an
instance-level snapshot captures it. Nothing here writes application state outside that
volume — containers are otherwise disposable, and the images are reproducible from
ECR — so a snapshot plus the ECR tag is a complete restore point.

Schema init scripts run only against an empty volume. Restoring a snapshot does not
re-run them, which is what you want.

## Rollback

Every deploy pushes both a moving tag (`prod`) and an immutable one
(`main-20260907T120000Z-abc1234`). To roll back, set `IMAGE_TAG` to a known-good
immutable tag and bring the stack up again:

```bash
IMAGE_TAG=main-20260907T120000Z-abc1234 docker compose -f docker-compose.deploy.yml up -d
```

Note that this rolls back **code, not schema**. EF Core migrations are applied
forward on startup and are not reversed by a rollback. If a release included a
destructive migration, restore the volume snapshot instead — and prefer additive
migrations so this situation stays rare.

## Health

`GET /health` (proxied to the API) reports healthy only when the database is
reachable, so a load balancer takes a broken instance out of rotation. `GET
/nginx-health` is a container-local liveness probe for the proxy itself.

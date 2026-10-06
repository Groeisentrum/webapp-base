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
- One EC2 instance
- An instance profile granting `AmazonSSMManagedInstanceCore`, ECR pull, read on
  the client's Parameter Store path, and the Bedrock actions below
- Credentials for GitHub Actions allowing ECR push and `ssm:SendCommand` against
  that instance

> **The instance architecture and the CD build platform must agree.** `cd.yml`
> sets `runs-on` and `platforms` together so the image is built natively for the
> target — an arm64 image will not execute on a t3, and vice versa. Moving a
> client to a t4g instance means changing both, in `cd.yml` and in `ci.yml`.

### Sizing a small instance

The template runs four containers — MariaDB, the API, the webhost and nginx — on
one box. On a 2 GB instance such as a `t3.small` that is only safe deliberately:

- `docker-compose.deploy.yml` gives every service an explicit `mem_limit`. Without
  them the four negotiate for the same memory and the kernel chooses which to kill.
- MariaDB runs with `performance-schema=OFF` and a 192 MB buffer pool. The default
  configuration assumes a machine with memory to spare and costs well over 100 MB
  before storing a single row.
- The API runs workstation GC (`DOTNET_gcServer=0`); the server collector sizes
  heaps per core and holds far more resident than this box can spare.
- A 2 GB swapfile with `vm.swappiness=10` absorbs bursts instead of turning them
  into OOM kills. Swap is headroom, not a substitute for the limits above.
- The root volume wants **20 GB or more**. Four images plus a retained previous
  tag plus the database volume will not fit in 8 GB, and a deploy that runs the
  disk out fails midway through a pull.
- Docker is configured with `max-size: 10m, max-file: 3` on the json-file driver,
  both in `/etc/docker/daemon.json` and per service. Unbounded container logs are
  the most common way one of these instances fills its disk.

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
| `OomPaul/HarnessArn` | String | The AgentCore harness to invoke — see below |
| `Retrieval/Enabled` | String | `true` to build and serve the content index — see below |
| `Retrieval/Region` | String | Bedrock region for embeddings; defaults to `eu-west-1` |
| `Retrieval/McpApiKey` | SecureString | Shared secret the AgentCore gateway presents to `/mcp` |

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

### Enabling Oom Paul chat

Off until `OomPaul/HarnessArn` is set — with it empty, the endpoint answers cleanly
with "unavailable" rather than a raw AWS error, so a deployment with nothing to talk
to just doesn't offer the chat.

1. **Build the harness in the Bedrock AgentCore console** (persona, system prompt,
   model, safety rules) for this client, and publish an endpoint — usually `DEFAULT`.
   None of that configuration lives in this repository; the API only carries the
   conversation to whichever harness `HarnessArn` names.
2. **Put the *harness* ARN in `OomPaul/HarnessArn`** — not the endpoint ARN the
   console shows you. The endpoint travels separately as `OomPaul/Qualifier`, so the
   two must not both carry it:

   ```
   arn:aws:bedrock-agentcore:eu-west-1:<account>:harness/OomPaul-l3hfIX1xhn
   ```

   Pasting the console's full endpoint ARN — the one ending
   `/harness-endpoint/DEFAULT` — fails every call with
   `ValidationException: Invalid harness ARN format`, which surfaces to visitors as
   "Oom Paul kon nie nou antwoord nie". Truncate at the harness id.

   `OomPaul/Qualifier` (default `DEFAULT`) and `OomPaul/Region` (default
   `eu-west-1`) only need setting if either differs from that default.
3. **Grant the EC2 instance role `bedrock-agentcore:InvokeHarness`** scoped to that
   ARN. Auth here is the instance role, the same as everywhere else this API calls
   AWS — there is no API key to configure.

The API reaches AWS through the instance role over IMDS, from inside a container.
That only works if the instance's **IMDS hop limit is at least 2** — the default of 1
stops the request at the container boundary and every AWS call fails with no
credentials, including the Parameter Store read the API needs to boot at all:

```bash
aws ec2 describe-instances --instance-ids <id> \
  --query 'Reservations[].Instances[].MetadataOptions.HttpPutResponseHopLimit'
# 1 → fix it:
aws ec2 modify-instance-metadata-options --instance-id <id> \
  --http-put-response-hop-limit 2 --http-endpoint enabled
```

To confirm the region is actually usable before deploying, from the instance:

```bash
printf '{"inputText":"toets"}' > /tmp/e.json
aws bedrock-runtime invoke-model --region eu-west-1 \
  --model-id amazon.titan-embed-text-v2:0 \
  --body fileb:///tmp/e.json --content-type application/json \
  --accept application/json /tmp/out.json
```

A successful call returns a 1024-value embedding, which must match
`Retrieval:Dimensions` and the `VECTOR` column width. An `AccessDeniedException`
here usually means model access has not been requested for that model in the
Bedrock console for that region — an IAM grant alone is not enough.

The chat endpoint also honours the `chatbot` feature flag in tenant settings. With the
flag off the endpoint reports itself unavailable even when a harness is configured, so
a client can switch the chat off from the admin area without a deploy. A fresh
deployment has no `TenantSettings` row at all, which reads as the flag being off — seed
the client before expecting the chat to answer.

> If a reply stops partway and the stream ends in an error, the harness has hit its own
> **maximum token limit** — the log carries "Model stopped generating due to maximum
> token limit". That ceiling is a harness setting in the AgentCore console, not
> something this repository configures. Raise it there if answers are being cut off.

### Giving Oom Paul this site's content

The harness knows its persona; it knows nothing about this deployment's exhibits,
opening times or events. That comes from a remote MCP server the API hosts at `/mcp`,
which the harness calls as a tool when it decides it needs facts.

Two pieces have to be switched on.

**The index.** Set `Retrieval/Enabled` to `true` and grant the instance role
`bedrock:InvokeModel` on `amazon.titan-embed-text-v2:0` in `Retrieval/Region`. A
background service then embeds every published, public content item and keeps the
`content_embeddings` table in step with edits — it re-embeds only what changed, and
drops anything that stops being public. It needs **MariaDB 11.7 or later** for the
`VECTOR` column type; on anything older it logs one error and disables itself rather
than failing per row. The compose files pin 11.8 for this reason.

**The gateway.** Generate a secret and store it in `Retrieval/McpApiKey`:

```bash
aws ssm put-parameter --name /GroeiSentrum/WebappBase/Retrieval/McpApiKey \
  --value "$(openssl rand -hex 32)" --type SecureString --overwrite
```

> Store the 64 characters and nothing else. `openssl rand -hex 32 > file` appends a
> newline, and writing that file's contents verbatim stores 65 characters — the
> filter compares lengths exactly, so every call is refused and `/mcp` stays shut
> no matter what the gateway sends. The failure looks identical to a wrong key.

Then, in the Bedrock AgentCore console:

1. Create a **gateway** and add an **MCP target** pointing at
   `https://<host>/mcp`.
2. Give the target an **API key credential provider** that sends the secret as the
   `X-Api-Key` header.
3. Attach the gateway to the Oom Paul harness.

Nothing in this repository configures the harness's tools — the harness owns them,
exactly as it owns the persona and the model.

> An empty `Retrieval/McpApiKey` closes `/mcp` completely. A deployment that has not
> set one serves no tools rather than serving them to anyone who asks.

The two tools the server exposes, `search_site_content` and `get_site_content`, answer
as an anonymous visitor: they resolve every match through the same read path the public
site uses, so restricted or unpublished content is never returned and a hidden item
reports as missing rather than forbidden. The index is a lookup, never an authority —
an item restricted after it was indexed disappears from answers immediately, without
waiting for the indexer to catch up.

## 4. Prepare the instance

Reach it with `aws ssm start-session --target <instance-id>`, then `sudo -i`.

```bash
# Docker Compose v2. Amazon Linux 2023's docker package does not include it, and
# the v1 `docker-compose` binary cannot read this compose file.
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Swap, on anything with 2 GB of memory or less.
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Cap container logs globally as well as per service.
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl restart docker

mkdir -p /opt/webapp-base/docker/nginx/ssl && cd /opt/webapp-base
```

Copy `docker-compose.deploy.yml` and an `.env` based on `.env.production.example` into
`/opt/webapp-base`. The `.env` needs `ECR_REGISTRY`, `DB_NAME`, `DB_ROOT_PASSWORD` and
the service URLs — no API keys.

> Generate `DB_ROOT_PASSWORD` **on the instance** and leave it there. MariaDB's data
> volume is initialised with it on first boot, so changing it later locks the API out
> of its own database. Back it up with the volume snapshot, not separately.

Install TLS material into `docker/nginx/ssl/` as `cert.pem` and `key.pem`. Either
terminate TLS at an ALB with an ACM certificate (simplest, renews itself) or place a
real certificate on the instance. Do not ship a self-signed certificate to production.

## 5. GitHub configuration

Secrets — organisation-level ones are already set for every Groeisentrum service and
are inherited, so only the instance id is per-repository:

| Secret | Scope | Purpose |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Organisation | Pushes to ECR and sends the SSM command |
| `AWS_SECRET_ACCESS_KEY` | Organisation | Pushes to ECR and sends the SSM command |
| `EC2_INSTANCE_ID` | Repository | Deployment target for SSM |

Variables, both optional — `cd.yml` falls back to `af-south-1` and the GroeiSentrum
account id when they are unset:

| Variable | Default |
|---|---|
| `AWS_REGION` | `af-south-1` |
| `AWS_ACCOUNT_ID` | `746669232703` |

Create `production` and `development` environments in repository settings. Add required
reviewers to `production` so a push to `main` cannot ship unattended.

## 6. First deploy

Push to `dev`. CD builds the three images natively for the instance's architecture,
pushes them to ECR, and runs `docker compose up -d --wait` on the instance over SSM.
No SSH key exists and no inbound port is opened.

`--wait` blocks on each container's healthcheck, so a container that starts and then
crashes fails the deploy rather than passing it. The instance frees disk *before*
pulling rather than after, because a pull that runs out of space has already failed
by the time a prune would have helped.

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
(`main-20260907T120000Z-abc1234`). Prefer rolling back through the pipeline: run
the CD workflow with **Run workflow → image tag** set to a known-good immutable
tag. It verifies the tag exists in all three repositories, skips the build
entirely, and redeploys through the same path as any other release.

On the instance directly, if the pipeline itself is the thing that is broken:

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

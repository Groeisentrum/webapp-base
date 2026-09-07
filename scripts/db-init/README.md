# Database init scripts

Anything placed here runs automatically when the MariaDB container starts against an
**empty** volume. It will not re-run on an existing volume — to replay it, drop the
volume first:

```bash
docker compose down -v
```

The template ships nothing here on purpose. Schema creation is EF Core's job: the API
applies migrations on startup, so an init script that creates tables would fight it.

Use this directory only for things that must exist before the API connects — a
non-default character set, or an extra database user. Client content belongs in
`scripts/seed/`, which is run deliberately rather than automatically.

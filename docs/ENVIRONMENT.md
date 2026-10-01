# LeadTR — Environment and Deployment

## Development services

Recommended Docker Compose services:

```text
web
api
postgres
redis
typesense
worker-api
worker-python
scheduler
```

Optional:

```text
minio  # local S3-compatible storage for development
mailhog # local email testing
```

## Environment variables

Example names only:

```text
DATABASE_URL=
REDIS_URL=
TYPESENSE_HOST=
TYPESENSE_API_KEY=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
AUTH_SECRET=
BILLING_SECRET=
APP_URL=
```

Do not commit real values.

## Production

Suggested deployment shape:

```text
Coolify
  |
  +-- Next.js
  +-- NestJS API
  +-- Worker containers
  +-- Scheduler
  +-- Typesense
  +-- Redis
  +-- PostgreSQL or managed PostgreSQL
  +-- S3/R2 object storage
```

Prefer managed PostgreSQL for production if budget allows.

## Backup requirements

At minimum:
- daily database backups
- object storage versioning where appropriate
- tested restore procedure
- retention policy

## Observability

Track:
- API latency
- error rate
- queue depth
- job failures
- crawler success rate
- source ingestion rate
- records normalized
- records merged
- records enriched
- records verified
- search latency
- export failures

## Security checklist

- HTTPS everywhere
- secret management
- least privilege DB users
- API rate limits
- admin MFA where supported
- audit logs
- dependency updates
- backup encryption where supported
- no raw secrets in logs


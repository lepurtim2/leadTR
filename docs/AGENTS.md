# LeadTR — AI Agent Development Rules

## 1. Source of truth

Before making implementation decisions, read:
- `PROJECT.md`
- `ARCHITECTURE.md`
- `DATA_PIPELINE.md`
- `DATABASE.md`
- `API.md`
- `ROADMAP.md`

`PROJECT.md` defines the product. The other documents define the implementation contracts.

Do not silently remove or simplify major requirements to make implementation easier.

## 2. Engineering principles

Build production-oriented software, not a demo.

Every feature should include:
- validation
- error handling
- logging
- tests
- sensible retries
- observability
- security considerations
- migration strategy where data changes are involved

Prefer simple, explicit code over unnecessary abstraction.

## 3. Required stack

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- NestJS
- TypeScript

Data:
- PostgreSQL
- PostGIS
- Redis
- BullMQ
- Typesense
- Python
- Polars
- DuckDB
- PyArrow

Infrastructure:
- Docker
- Docker Compose for development
- Coolify-compatible production deployment
- Object storage such as Cloudflare R2 or S3-compatible storage

## 4. Repository safety

Before changing architecture, inspect the existing repository.
Do not overwrite existing working code without understanding it.
Do not delete migrations or production data paths.
Never commit secrets.

Use environment variables for:
- database credentials
- Redis credentials
- third-party API keys
- object-storage credentials
- billing secrets
- authentication secrets

## 5. Data-source policy

Do not make Google Maps scraping the core ingestion mechanism.

Only ingest, persist, enrich, or redistribute data when its source terms/licensing and the intended product use permit it.

For every source store:
- provider
- source_name
- source_record_id
- source_url where appropriate
- collected_at
- license
- terms_url
- storage_allowed
- commercial_use_allowed
- redistribution_allowed

When permissions are unclear, stop the specific data path and document the issue instead of guessing.

## 6. Pipeline contract

Do not bypass the canonical pipeline:

Source
-> Raw Storage
-> Parse
-> Normalize
-> Deduplicate
-> Enrich
-> Verify
-> Score
-> PostgreSQL
-> Search Index
-> API / Dashboard / Export

Raw source payloads must be preserved separately from canonical records.

## 7. Entity resolution

Never merge businesses using name similarity alone.

Use multiple signals such as:
- normalized phone
- normalized domain
- coordinates / geographic distance
- normalized address
- name similarity
- source identifiers

Store the reason and score for merges.

Potential matches should go to a review queue instead of being merged automatically.

## 8. Privacy and personal data

Separate business-level data from individual personal data.
Do not automatically classify a personal mobile number or personal email as a business contact.
Track source and purpose for contact data.
Provide deletion/suppression mechanisms where required by the product's legal/privacy design.

## 9. Database rules

All schema modifications use migrations.

Use PostgreSQL as the canonical source of truth.
Use PostGIS for spatial queries.
Create indexes intentionally and verify query plans for important filters.

Do not introduce a second database to replace PostgreSQL without documenting the reason.

## 10. API rules

All external input must be validated.
Use pagination for list endpoints.
Use stable cursor pagination for large datasets where practical.
Protect expensive endpoints with rate limits and quotas.
Never expose internal source payloads unless explicitly designed.

## 11. Workers

Long-running operations must be asynchronous jobs.
Examples:
- bulk ingestion
- normalization
- deduplication
- website crawling
- enrichment
- verification
- export generation
- search reindexing

Every job needs:
- unique job id
- status
- retries
- backoff
- error information
- idempotency strategy

## 12. Testing

At minimum, add tests for:
- name normalization
- address normalization
- phone normalization
- URL/domain normalization
- deduplication
- merge scoring
- source permission handling
- API validation
- pagination
- worker retry behavior
- export generation

## 13. Implementation workflow

1. Inspect repository.
2. Read all project docs.
3. Produce a short implementation plan.
4. Implement one milestone at a time.
5. Run tests/type checks/linting.
6. Fix errors before moving forward.
7. Update documentation when behavior changes.
8. Never claim a feature is complete unless its acceptance criteria are met.

## 14. Definition of done

A feature is complete only when:
- code is implemented
- tests pass
- errors are handled
- logs are meaningful
- migrations are included when needed
- documentation is updated
- no secrets are exposed
- the feature works in Docker


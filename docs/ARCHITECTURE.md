# LeadTR — System Architecture

## 1. Goal

Build a multi-source Türkiye business intelligence platform that can ingest large datasets, normalize and deduplicate them, enrich business records from permitted sources, verify freshness, index the canonical records, and expose them through a dashboard, exports, and API.

## 2. High-level architecture

```text
                +-----------------------------+
                |       DATA SOURCES         |
                | Overture / OSM / licensed  |
                | providers / public sources |
                +-------------+---------------+
                              |
                              v
                    +-------------------+
                    | Ingestion Service |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Object Storage    |
                    | raw snapshots     |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | ETL / Normalizer  |
                    | Python + Polars   |
                    | DuckDB + PyArrow  |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    | Entity Resolution |
                    | dedup + merge     |
                    +---------+---------+
                              |
                 +------------+-------------+
                 |                          |
                 v                          v
        +-------------------+       +-------------------+
        | PostgreSQL        |       | Verification /    |
        | + PostGIS         |       | Enrichment        |
        +---------+---------+       +---------+---------+
                  |                           |
                  +-------------+-------------+
                                |
                                v
                      +-------------------+
                      | Search Index      |
                      | Typesense         |
                      +---------+---------+
                                |
                    +-----------+------------+
                    |                        |
                    v                        v
             Next.js Dashboard         Public API
                    |
             +------+-------+
             |              |
             v              v
           CSV/XLSX       Billing
```

## 3. Application boundaries

### Web application

Responsibilities:
- authentication
- business search
- filters
- map/list result presentation
- record detail
- saved searches
- export creation/download
- API key management
- usage dashboard
- billing UI
- account settings

### API & Embedded DuckDB Engine

Responsibilities:
- authentication and authorization
- search & aggregation via In-Process DuckDB (30-50ms latency)
- lock-free partitioned Parquet query lake (`data/parquets/*.parquet`, 1.66M+ records)
- semantic business category and province normalization
- business details
- streaming CSV / Excel exports
- usage limits
- customer APIs
- admin endpoints
- zero Windows background daemons / zero boot overhead

### Ingestion workers

Responsibilities:
- fetch/download source data
- validate source files
- store immutable raw artifacts
- create ingestion jobs

### ETL workers

Responsibilities:
- parsing
- normalization
- taxonomy mapping
- deduplication
- canonical entity updates

### Enrichment workers

Responsibilities:
- website discovery
- website crawling
- structured contact extraction
- social-link discovery
- technology detection
- booking/WhatsApp detection

### Verification workers

Responsibilities:
- freshness checks
- HTTP status checks
- domain checks
- phone syntax/metadata checks where legally and technically appropriate
- conflicting field detection

## 4. Queue topology

Recommended queues:

```text
source_ingestion
normalization
entity_resolution
enrichment
verification
search_index
exports
maintenance
```

Each queue should have independent concurrency and rate limits.

## 5. Idempotency

Every pipeline operation should be safe to retry.

Use:
- deterministic source keys
- content hashes
- job ids
- upsert operations
- versioned snapshots

Do not create duplicate canonical entities simply because a worker retries.

## 6. Storage strategy

Object storage:
- raw source files
- raw web snapshots where storage is permitted
- intermediate Parquet files
- generated exports

PostgreSQL:
- canonical entities
- normalized fields
- relationships
- billing
- audit data

Typesense:
- denormalized searchable representation only

Redis:
- queues
- short-lived cache
- rate-limit counters
- job coordination

## 7. Scaling strategy

Phase 1:
- one PostgreSQL instance
- one Redis
- one API service
- one web service
- a few workers

Phase 2:
- separate ingestion and enrichment worker pools
- dedicated search node
- object storage for all large artifacts

Phase 3:
- multiple worker replicas
- read replicas if needed
- partitioning for very large history tables
- dedicated ETL compute

Do not scale infrastructure before measuring real bottlenecks.

## 8. Failure model

A source can fail without taking down customer search.

A crawler can fail without blocking ingestion.

A search-index outage must not corrupt PostgreSQL.

Billing outages must not corrupt customer data.

All asynchronous failures must be observable and retryable.


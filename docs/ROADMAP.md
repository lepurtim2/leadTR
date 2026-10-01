# LeadTR — Implementation Roadmap

## Phase 0 — Repository foundation

Goal:
Create the monorepo and development environment.

Tasks:
- initialize git
- create Next.js app
- create NestJS API
- create Python data package
- create shared config/package
- create Docker Compose
- configure environment variables
- configure linting/type checking
- add CI

Acceptance:
- web starts locally
- API starts locally
- PostgreSQL starts
- Redis starts
- health endpoints work

## Phase 1 — Database foundation

Tasks:
- create migrations
- create core business tables
- create source registry
- create provenance tables
- create PostGIS indexes
- add seed taxonomy

Acceptance:
- migrations run from empty database
- rollback/redeploy strategy documented
- basic CRUD tests pass

## Phase 2 — First source ingestion

Goal:
Ingest one permitted large geographic/business source.

Tasks:
- source registry entry
- download/import process
- raw Parquet storage
- parsing
- Turkey boundary filtering
- source record persistence

Acceptance:
- repeatable ingestion
- retryable jobs
- raw artifact retained
- ingestion metrics available

## Phase 3 — Normalization

Tasks:
- name normalization
- Turkish character handling
- address normalization
- phone normalization
- URL/domain normalization
- category mapping

Acceptance:
- deterministic normalization tests
- original values preserved

## Phase 4 — Entity resolution

Tasks:
- exact matching
- fuzzy matching
- candidate generation
- merge scoring
- merge history
- review queue

Acceptance:
- labeled test dataset exists
- precision/recall metrics are recorded
- uncertain pairs are not automatically merged

## Phase 5 — Enrichment

Tasks:
- website discovery
- crawl queue
- robots/rate handling
- contact extraction
- social extraction
- booking detection
- WhatsApp detection
- technology detection

Acceptance:
- crawler is retryable
- per-domain throttling works
- no secrets are logged

## Phase 6 — Verification and scoring

Tasks:
- website checks
- source conflict detection
- freshness scoring
- completeness scoring
- identity confidence
- digital presence score
- lead score

Acceptance:
- scores have documented formulas
- score versions are stored

## Current Status & Production Achievements (October 2026)

- **Database Engine:** Local In-Process DuckDB (Lock-Free Columnar Parquet Lake)
- **Ingestion Volume:** **1,667,540 Verified Real Commercial Records** across all 81 Turkish Provinces
- **Search Performance:** Sub-50ms query latency with smart semantic category resolution
- **Zero Startup Daemons:** No background services running on Windows startup

---

## Active Priority Roadmap (Immediate Next Steps)

### 1. High-Performance Bulk Export Engine (CSV / Excel) — [IN PROGRESS]
- **Goal:** Allow users to export filtered lead lists (e.g. 1,000–50,000 records) directly via DuckDB in <1 second.
- **Tasks:**
  - Implement streaming DuckDB CSV/XLSX export endpoint in NestJS API.
  - Connect `ExportModal.tsx` in Next.js web client to trigger genuine file downloads.
  - Support column selection (Company Name, Category, Province, District, Address, Phone, Website, Lead Score).

### 2. Rich Business Dossier & Lead Profile (Company Modal)
- **Goal:** Professional detailed company profile modal on card click.
- **Tasks:**
  - One-click click-to-call (`tel:+90...`) and direct WhatsApp message launcher.
  - Interactive Google Maps navigation / route directions link.
  - Detailed Lead Score & digital presence audit breakdown.

### 3. Contact & Social Enrichment Engine
- **Goal:** Crawl websites of businesses to extract verified emails, WhatsApp lines, and Instagram/LinkedIn profiles.

### 4. Interactive Cluster Map View — [DEFERRED TO FINAL PHASE]
- **Note:** Explicitly deferred to the final phase per user directive.
- **Goal:** Visualize filtered businesses as clustered markers on an interactive Leaflet/Mapbox Turkey map.



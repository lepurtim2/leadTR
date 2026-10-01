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
- **Ingestion Volume:** **1,859,546 Verified Real Commercial Records** across all 81 Turkish Provinces
  - 1,141,824 Verified Phone Numbers (61.4%)
  - 540,323 Verified Corporate Emails (29.1%)
  - 633,186 Active Websites (34.1%)
- **Search Performance:** Sub-50ms query latency with smart Turkish semantic category resolution
- **Zero Startup Daemons:** No background services or Docker containers running on Windows startup

---

## Completed Core Milestones

### 1. High-Performance Bulk Export Engine (CSV / Excel) — [COMPLETED]
- Streaming DuckDB CSV/XLSX export in <200ms with UTF-8 BOM for Microsoft Excel compatibility.
- Instant province, district, category, and lead-target selector directly inside `ExportModal`.
- Injected direct `WhatsApp Linki` and `Fırsat / İhtiyaç Durumu` columns.

### 2. Rich Business Dossier & Lead Profile (Company Modal) — [COMPLETED]
- 1-click click-to-call (`tel:+90...`) and direct WhatsApp message launcher.
- Interactive Google Maps navigation / route directions link.
- Lead Score, completeness, digital presence, and identity confidence breakdown.

### 3. Contact & Social Enrichment Engine — [COMPLETED]
- High-speed web & social scraper (`scraper.util.ts`) extracting emails, WhatsApp, Instagram, LinkedIn, Facebook.
- Persistent local intelligence cache (`apps/api/data/enrichments.json`) merged with DuckDB analytical queries.

### 4. Interactive Map View — [COMPLETED]
- SSR-safe Leaflet integration with CartoDB Dark basemap.
- Coordinate-based custom markers with interactive business dossiers.

### 5. Hot Lead & WhatsApp Outreach Suite — [COMPLETED]
- 📱 **WhatsApp / 05xx Mobile Filter:** 624,866+ mobile-verified businesses with 1-click WhatsApp buttons.
- 🔥 **Hot Lead / Digital Need Filter:** 333,899+ businesses with verified phones but NO website.
- 💬 **Personalized Sales Pitch Assistant:** Auto-generates customized sales pitches (Web/SEO, B2B, POS) with 1-click clipboard copy and WhatsApp messaging.

---

## Optional Future Expansions

1. **Pre-Packaged Lead Bundles:** One-click pre-packaged vertical lists (deferred per user request).
2. **SaaS Credit & Payment Billing:** Stripe / PayTR / İyzico subscription integration.
3. **CRM Integration:** 1-click export to HubSpot, Pipedrive, or Salesforce.



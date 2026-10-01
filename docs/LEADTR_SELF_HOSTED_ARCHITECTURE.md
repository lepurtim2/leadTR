# LEADTR — FULL SELF-HOSTED PRODUCTION ARCHITECTURE

## 1. ANA KARAR

LeadTR'nin tüm çekirdek altyapısı kullanıcının kendi VDS'i üzerinde çalışacaktır.

Amaç:

> Database, search engine, cache, queue, workers, object storage, application, monitoring ve scheduled jobs için mümkün olduğunca üçüncü taraf managed servislere bağımlı olmamak.

Harici servisler yalnızca zorunlu dış dünya kaynakları için kullanılabilir:

- veri kaynakları
- domain registrar / DNS
- ödeme sağlayıcısı
- e-posta/SMS gibi gerçekten dış ağ hizmeti gerektiren servisler

Core application data ve infrastructure kullanıcının kontrolündeki VDS'te kalmalıdır.

---

# 2. SELF-HOSTED STACK

## Application

- Next.js
- TypeScript
- Tailwind
- NestJS

## Database

- PostgreSQL
- PostGIS

## Search

- Typesense

## Queue / Cache

- Redis
- BullMQ

## Data Processing

- Python
- Polars
- DuckDB
- PyArrow

## Object Storage

- MinIO

## Reverse Proxy / TLS

- Caddy

## Monitoring

- Prometheus
- Grafana
- Loki
- Uptime Kuma

## Container

- Docker
- Docker Compose

## Deployment

- Coolify veya doğrudan Docker Compose

---

# 3. ÖNERİLEN TOPOLOJİ

```text
                         INTERNET
                            |
                         DOMAIN
                            |
                          CADDY
                   TLS + Reverse Proxy
                            |
           +----------------+----------------+
           |                                 |
        NEXT.JS                           NESTJS API
           |                                 |
           |              +------------------+------------------+
           |              |                  |                  |
           |          POSTGRES            REDIS             TYPESENSE
           |          + POSTGIS             |                  |
           |              |              BULLMQ                |
           |              |                  |                  |
           |              +------------------+------------------+
           |                                 |
           |                              WORKERS
           |                         /        |        \
           |                     ingestion  enrich   verify
           |                                 |
           |                               DUCKDB
           |                                 |
           |                               MINIO
           |                                 |
           +---------------------------------+
```

---

# 4. DOCKER SERVICES

Production Compose:

```text
leadtr-web
leadtr-api
leadtr-worker
leadtr-ingestion-worker
leadtr-enrichment-worker

postgres
redis
typesense
minio

prometheus
grafana
loki
uptime-kuma

caddy
```

Worker sayısı VDS kapasitesine göre artırılabilir.

---

# 5. DATABASE

Ana database:

```text
PostgreSQL + PostGIS
```

Tüm canonical business data burada tutulur.

Örnek:

```text
businesses
business_names
business_categories
business_addresses
business_contacts
business_websites
business_socials
business_hours

business_sources
business_source_records

business_snapshots
business_changes
business_signals

business_scores
product_fit_scores

organizations
users
subscriptions
credits
exports

crm_leads
crm_notes
crm_tasks

sync_runs
audit_logs
```

PostgreSQL source of truth olacaktır.

---

# 6. SEARCH

Search engine de VDS üzerinde çalışacaktır.

```text
Typesense
```

PostgreSQL'den indekslenecek alanlar:

```text
business_id
name
category
province
district

phone_exists
mobile_exists
email_exists
website_exists
whatsapp_exists

lead_score
opportunity_score
digital_score
trust_score
freshness_score

status
location
```

Kullanıcı aramaları:

```text
search
filter
facet
sort
pagination
```

Typesense'e gider.

Database değişiklikleri queue üzerinden indexlenebilir.

---

# 7. DUCKDB'NİN ROLÜ

DuckDB kaldırılmayacak.

Fakat PostgreSQL'in yerine geçmeyecek.

DuckDB:

- bulk import
- bulk export
- Parquet analysis
- data QA
- backfill
- large aggregation
- offline analytics
- dedup preprocessing

için kullanılacaktır.

Örnek:

```text
PostgreSQL
    ↓
analytics snapshot
    ↓
Parquet
    ↓
DuckDB
```

---

# 8. OBJECT STORAGE

Cloudflare R2 veya S3 yerine:

```text
MinIO
```

kullan.

MinIO VDS üzerinde çalışır.

Bucket yapısı:

```text
raw-data
snapshots
exports
audit
backups
website-artifacts
```

Örneğin:

```text
/raw-data/2026-10-01/source-a/places.parquet
/snapshots/2026-10-01/businesses.parquet
/exports/org-123/export-456.xlsx
/audit/sync/2026-10-01.json
```

---

# 9. REDIS

Redis VDS üzerinde çalışacak.

Kullanım alanları:

```text
BullMQ queues
cache
rate limiting
temporary state
job locks
distributed locks
```

Redis persistence gerektiğinde AOF/RDB yapılandırılmalıdır.

---

# 10. WORKER ARCHITECTURE

Ağır işlerin tamamı async yapılmalıdır.

```text
API
 |
 +--> enqueue job
 |
Redis
 |
 +--> ingestion worker
 +--> enrichment worker
 +--> verification worker
 +--> website audit worker
 +--> scoring worker
 +--> export worker
```

Job tipleri:

```text
IMPORT_SOURCE
NORMALIZE_BUSINESS
DEDUP_BUSINESS
ENRICH_WEBSITE
VERIFY_WEBSITE
VERIFY_PHONE
VERIFY_EMAIL
SOCIAL_SCAN
WEBSITE_XRAY
CREATE_SIGNAL
RECALCULATE_SCORE
REINDEX_BUSINESS
EXPORT_CSV
EXPORT_XLSX
GENERATE_AUDIT
SYNC_SOURCE
```

---

# 11. JOB TASARIM KURALLARI

Her job:

- idempotent
- retryable
- timeout'lu
- structured logging'li
- failure durumunda yeniden çalıştırılabilir

olmalıdır.

Örnek:

```text
job_id
job_type
entity_id
attempt
status
started_at
finished_at
error
```

---

# 12. SYNC SYSTEM

Ayda iki kez veya daha sık sync:

```text
Scheduler
    ↓
Create Sync Run
    ↓
Fetch Source Data
    ↓
Raw Storage
    ↓
Normalize
    ↓
Deduplicate
    ↓
Validate
    ↓
Upsert PostgreSQL
    ↓
Detect Changes
    ↓
Create Signals
    ↓
Recalculate Scores
    ↓
Reindex Typesense
    ↓
Create Audit
```

Bu süreç API request'lerini bloklamamalıdır.

---

# 13. SCHEDULER

Harici scheduler yerine Linux cron veya uygulama içi scheduler kullanılabilir.

Tercih:

```text
host cron
    ↓
docker exec / API trigger
    ↓
BullMQ job
```

Alternatif:

```text
BullMQ repeatable jobs
```

Sistemin tamamen VDS üzerinde kalması sağlanmalıdır.

---

# 14. OPPORTUNITY ENGINE

VDS üzerinde worker olarak çalışır.

Input:

```text
business snapshot
website xray
social activity
review changes
contact changes
business changes
```

Output:

```text
signals
opportunity_score
product_fit_score
```

---

# 15. WEBSITE X-RAY

Website taraması VDS worker'ları üzerinde yapılır.

Kontroller:

```text
HTTP status
HTTPS
SSL
redirect
title
meta
H1
canonical
robots
sitemap
schema
mobile viewport
performance
social links
booking
WhatsApp
analytics
pixel
CMS
technology
```

Sonuç PostgreSQL'e yazılır.

Raw sonuçlar gerektiğinde MinIO'da tutulur.

---

# 16. CRAWLER RESOURCE CONTROL

Website scanning sınırsız concurrency ile yapılmamalıdır.

Ayarlar:

```text
MAX_CONCURRENCY
REQUEST_TIMEOUT_MS
MAX_RESPONSE_SIZE
MAX_PAGES_PER_DOMAIN
CRAWL_DELAY_MS
MAX_RETRIES
```

Ayrıca:

- domain-level concurrency
- global concurrency
- circuit breaker
- retry backoff

uygulanmalıdır.

---

# 17. VDS KAYNAK YÖNETİMİ

Tüm servislerin aynı makinede olması kaynak planlamasını önemli hale getirir.

Örnek hedef:

```text
PostgreSQL
en yüksek öncelik

Typesense
yüksek öncelik

Redis
orta

API/Web
orta

Workers
düşük / ölçeklenebilir
```

Worker concurrency gerektiğinde düşürülebilmelidir.

Özellikle website enrichment CPU/RAM/network kullanımı kontrol edilmelidir.

---

# 18. VDS ÖNERİSİ

Yaklaşık 1.88M kayıt için minimum rahat production hedefi:

```text
CPU: 6-8 vCPU
RAM: 16-32 GB
SSD: 300-500 GB NVMe
Network: yeterli unmetered/large quota
```

Daha büyük enrichment ve crawling kapasitesi için:

```text
8-16 vCPU
32-64 GB RAM
500 GB - 1 TB NVMe
```

daha rahat olur.

Bu değerler uygulama/indeks boyutuna göre ölçülmelidir; production kararı gerçek benchmark ile verilmelidir.

---

# 19. TEK VDS RİSKİ

Tamamen self-hosted olmanın en büyük dezavantajı:

> Tek VDS = tek failure domain.

Bu nedenle database'in tek kopyasını tutma.

En az:

```text
VDS
 |
 +-- primary PostgreSQL
 |
 +-- local backups
 |
 +-- second backup destination
```

olmalı.

İkinci backup destination:

- ikinci VDS
- ev NAS'ı
- ayrı fiziksel disk

olabilir.

Tamamen farklı bir sağlayıcı kullanmak zorunda değilsin.

---

# 20. POSTGRESQL BACKUP

Tercih:

```text
pgBackRest
```

veya PostgreSQL native backup + WAL arşivleme.

Minimum:

```text
daily backup
weekly full backup
retention policy
restore test
```

Çok önemli:

> Backup alınıyor demek backup düzgün çalışıyor demek değildir.

Düzenli restore testi yapılmalıdır.

---

# 21. MINIO BACKUP

MinIO:

```text
raw-data
snapshots
exports
audit
```

için kullanılır.

Önemli dataset'lerin en az ikinci bir kopyası bulunmalıdır.

---

# 22. MONITORING

Tamamen self-hosted:

```text
Prometheus
Grafana
Loki
Uptime Kuma
```

izlemesi:

```text
CPU
RAM
disk
network
Postgres connections
Postgres size
Redis memory
queue depth
worker failures
Typesense health
API latency
error count
sync progress
```

---

# 23. LOGGING

Application logları structured JSON formatında:

```json
{
  "timestamp": "...",
  "service": "leadtr-worker",
  "job_id": "...",
  "job_type": "WEBSITE_XRAY",
  "business_id": "...",
  "level": "info",
  "message": "completed"
}
```

Loki ile toplanabilir.

---

# 24. REVERSE PROXY

```text
Caddy
```

VDS üzerinde:

```text
:80
:443
```

üzerinden uygulamalara proxy yapar.

Örnek:

```text
app.domain.com → web:3000
api.domain.com → api:4000
```

Caddy otomatik TLS sertifikası yönetebilir.

---

# 25. COOLIFY

Coolify kullanılabilir.

Öneri:

```text
Coolify
    ↓
Docker Compose / Services
```

Ancak production database'in:

- persistent volume
- backup
- health check
- restart policy

ayarları ayrıca güvenceye alınmalıdır.

---

# 26. NETWORK SEGMENTATION

Database internetten doğrudan erişilebilir olmamalıdır.

Örneğin:

```text
Internet
   ↓
Caddy
   ↓
Web/API
   ↓
Private Docker network
   ├── postgres
   ├── redis
   ├── typesense
   └── minio
```

PostgreSQL portu:

```text
5432
```

public firewall'a açılmamalıdır.

Redis:

```text
6379
```

public olmamalıdır.

Typesense de mümkünse yalnızca internal network üzerinden erişilebilir.

---

# 27. SECRETS

Secret'lar:

```text
.env
Docker secrets
Coolify secrets
```

ile yönetilir.

Source code'a:

```text
password
API key
JWT secret
R2 key
MinIO key
```

yazılmayacaktır.

---

# 28. AUTH

Production:

```text
Auth service
```

uygulama içinde veya self-hosted auth çözümü olabilir.

User:

```text
organization_id
user_id
role
```

ile tenant'a bağlanır.

---

# 29. MULTI-TENANCY

Tüm müşteri verileri tenant-safe olmalıdır.

Örneğin:

```text
organizations
users
api_keys
subscriptions
credits
exports
saved_searches
crm_leads
webhooks
```

tablolarında:

```text
organization_id
```

bulunmalıdır.

---

# 30. EXPORT

Büyük export API process'inde yapılmaz.

```text
User
 ↓
POST /exports
 ↓
Redis
 ↓
Export Worker
 ↓
DuckDB
 ↓
CSV/XLSX
 ↓
MinIO
 ↓
Temporary signed URL
```

URL expiration:

```text
1h
6h
24h
```

pakete göre ayarlanabilir.

---

# 31. LOCAL DATA FLOW

Tamamen self-hosted ana veri akışı:

```text
External Data Source
        ↓
Ingestion Worker
        ↓
MinIO Raw
        ↓
DuckDB / Python
        ↓
Normalize
        ↓
Deduplicate
        ↓
PostgreSQL
        ↓
Typesense
        ↓
LeadTR Web
```

Externally hosted managed DB kullanılmayacak.

---

# 32. VERİ KAYNAKLARI VE ALTYAPIYI AYIR

“Harici bağımlılık istemiyorum” demek:

> İnternetten gelen hiçbir veri kullanmayacağım

anlamına gelmez.

LeadTR bir veri ürünü olduğu için veri kaynakları doğal olarak dışarıdan gelebilir.

Burada ayrım:

```text
DATA SOURCES
= dış dünya olabilir

CORE INFRASTRUCTURE
= senin VDS'in
```

olmalıdır.

Örnek:

```text
Overture
OSM
licensed datasets
public datasets
business websites
```

→ dış veri kaynakları.

Ama:

```text
PostgreSQL
Redis
Typesense
MinIO
workers
API
web
monitoring
```

→ senin VDS'inde.

---

# 33. GOOGLE MAPS KULLANIMI

Google Maps verisini ürünün ana kalıcı database'i haline getirmeden önce kullanım şartları ayrıca değerlendirilmelidir.

Google Places/Maps verisi ile ilgili:

- storage
- caching
- redistribution
- business listing
- export

kuralları kaynak bazında kontrol edilmelidir.

LeadTR'nin core database'i lisansı ve ticari kullanım hakkı açık veri kaynakları üzerine kurulmalıdır.

---

# 34. ZERO-DAEMON TASARIMI

Kullanıcının kendi Windows bilgisayarında:

```text
NO local database daemon
NO local crawler daemon
NO local Redis
NO permanent sync service
```

olabilir.

Bütün bunlar:

```text
VDS
```

üzerinde çalışmalıdır.

Kullanıcı bilgisayarı yalnızca:

```text
Browser
+
Git
+
Development IDE
```

olarak kullanılabilir.

---

# 35. DEVELOPMENT ENVIRONMENT

Local:

```text
Docker Compose
```

Production:

```text
VDS Docker
```

Aynı container mimarisi kullanılmalıdır.

Örnek:

```text
docker-compose.yml
docker-compose.dev.yml
docker-compose.prod.yml
```

---

# 36. CI/CD

Harici CI kullanmak istemiyorsan deploy VDS üzerinde de yapılabilir.

Basit yapı:

```text
git push
   ↓
VDS pulls repository
   ↓
docker compose build
   ↓
migration
   ↓
health checks
   ↓
restart
```

İleri aşamada self-hosted Git runner eklenebilir.

---

# 37. ZERO-DOWNTIME DEPLOYMENT

İlk sürümde:

```text
maintenance deploy
```

kabul edilebilir.

Sonraki aşama:

```text
blue/green
rolling
```

uygulanabilir.

Database migration'ları backward-compatible yazılmalıdır.

---

# 38. PRODUCTION DATABASE IMPORT

1. DuckDB backup
2. Parquet export
3. PostgreSQL staging
4. validation
5. dedup check
6. canonical import
7. indexes
8. analyze
9. Typesense import
10. application smoke test

---

# 39. POSTGRESQL TUNING

Gerçek workload benchmark edilmeden rastgele tuning yapılmamalıdır.

İzlenecek:

```text
shared_buffers
work_mem
maintenance_work_mem
effective_cache_size
max_connections
checkpoint settings
autovacuum
wal settings
```

Connection pooling önerilir.

Örneğin:

```text
PgBouncer
```

VDS üzerinde kullanılabilir.

---

# 40. SEARCH CACHE

Önce Typesense.

Redis cache yalnızca tekrarlanan pahalı sorgular için kullanılmalıdır.

Cache key:

```text
search:v1:<hash-of-query>
```

TTL:

```text
30s
60s
5m
```

gerçek kullanım sonrası belirlenmelidir.

---

# 41. DATA QUALITY JOBS

Scheduled worker:

```text
CHECK_INVALID_PHONE
CHECK_INVALID_EMAIL
CHECK_DEAD_WEBSITE
CHECK_DUPLICATES
CHECK_STALE_RECORDS
CHECK_MISSING_SOURCE
RECALCULATE_COMPLETENESS
RECALCULATE_TRUST
```

---

# 42. ADMIN OPERATIONS

Admin panel:

```text
Start sync
Pause sync
Resume sync
Retry jobs
Reindex
Recalculate scores
Inspect duplicates
Merge businesses
Inspect source
Inspect snapshot
View failed crawls
```

Her kritik işlem audit log'a yazılır.

---

# 43. SCALING PLAN

Başlangıç:

```text
1 VDS
all services
```

Sonra gerekirse:

```text
VDS 1
web + api + postgres

VDS 2
workers + crawling

VDS 3
search + analytics
```

Database büyüyünce:

```text
primary postgres
replica postgres
```

eklenebilir.

Bu yüzden ilk günden microservice cehennemi kurulmayacak.

---

# 44. ÖNERİLEN BAŞLANGIÇ

1.88M business için ilk production sürümü:

```text
Caddy
Next.js
NestJS
PostgreSQL + PostGIS
Redis
Typesense
MinIO
BullMQ workers
DuckDB
Prometheus
Grafana
Loki
Uptime Kuma
```

tek güçlü VDS üzerinde çalıştır.

---

# 45. NELERİ KULLANMAYALIM?

Core infrastructure için mümkün olduğunca:

```text
Supabase
Firebase
Vercel
Netlify
Cloudflare R2
AWS S3
Managed Redis
Managed PostgreSQL
Hosted Typesense
Hosted OpenSearch
Hosted logging
```

kullanma.

Bunların yerine self-hosted karşılıkları kullan.

Not: Domain/DNS ve ödeme gibi internet hizmetleri teknik olarak tamamen sunucudan bağımsız olamaz; bunlar core database altyapısından ayrı değerlendirilmelidir.

---

# 46. SON TOPOLOJİ

```text
                       INTERNET
                           |
                        CADDY
                           |
              +------------+------------+
              |                         |
           NEXT.JS                  NESTJS API
                                         |
                         +---------------+---------------+
                         |               |               |
                     POSTGRES          REDIS          TYPESENSE
                     + POSTGIS           |               |
                         |             BULLMQ             |
                         |               |               |
                         +---------------+---------------+
                                         |
                                      WORKERS
                                /        |        \
                           ingestion   enrich     verify
                                |        |          |
                                +--------+----------+
                                         |
                                       DUCKDB
                                         |
                                       MINIO
                                         |
                              Prometheus / Grafana
                                         |
                                        Loki
                                         |
                                   Uptime Kuma
```

---

# 47. LEADTR İÇİN TEMEL FELSEFE

LeadTR'nin dışarı bağımlı olmaması:

```text
Database ownership
Storage ownership
Search ownership
Queue ownership
Worker ownership
Logs ownership
Monitoring ownership
Deployment ownership
```

anlamına gelmelidir.

Bu nedenle sistemin temel verisi ve uygulama state'i tamamen senin kontrolündeki sunucuda bulunmalıdır.

---

# 48. SONUÇ

Senin senaryonda en mantıklı yaklaşım:

> **Self-host everything, outsource only what must exist outside the server.**

Yani:

```text
VERİ
    ↓
VDS
    ↓
PostgreSQL
    ↓
Typesense
    ↓
Redis
    ↓
Workers
    ↓
MinIO
    ↓
LeadTR
```

Böylece LeadTR'nin çalışma maliyeti ağırlıklı olarak:

```text
VDS
electricity/provider cost
domain
external data acquisition
```

olur.

Core application infrastructure için kullanıcı başına veya sorgu başına üçüncü taraf SaaS maliyeti oluşmaz.


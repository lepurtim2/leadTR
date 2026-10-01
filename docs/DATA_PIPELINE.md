# LeadTR — Data Ingestion, ETL, Enrichment and Verification

## 1. Objective

Create a reliable pipeline that turns source records into canonical business entities.

Canonical flow:

```text
SOURCE
  -> RAW
  -> PARSE
  -> NORMALIZE
  -> CLASSIFY
  -> ENTITY RESOLUTION
  -> CANONICAL MERGE
  -> ENRICH
  -> VERIFY
  -> SCORE
  -> INDEX
```

## 2. Source registry

Every source is registered before ingestion.

Required fields:

```text
source_id
provider
name
source_type
license
terms_url
storage_allowed
commercial_use_allowed
redistribution_allowed
collection_method
refresh_frequency
notes
active
```

No source without a source registry entry.

## 3. Raw ingestion

Never write external records directly into `businesses`.

First write an immutable raw artifact or raw record.

Recommended raw fields:

```text
raw_record_id
source_id
source_record_id
payload_hash
payload
collected_at
source_version
storage_path
```

Large source datasets should be stored as Parquet rather than huge JSON blobs.

## 4. Turkey extraction

For country-scale geospatial sources:

1. Obtain the licensed country/source dataset.
2. Filter to Türkiye using authoritative geographic boundaries.
3. Keep the source identifier.
4. Preserve the original source record.
5. Convert to an internal normalized format.

Do not rely on a rough bounding box as the final country boundary.

## 5. Normalization

### Business name

Create:
- display_name
- normalized_name

Normalization should handle:
- case
- Turkish characters
- punctuation
- duplicate whitespace
- legal suffixes where appropriate
- common abbreviations

Do not destroy the original value.

### Phone

Store:
- original_phone
- normalized_phone
- country_code
- phone_type when known
- source
- confidence

Use E.164-style normalization where possible.

### Website

Store:
- original_url
- canonical_url
- normalized_domain
- https_available
- redirect_target when checked

Canonicalization should remove tracking parameters when safe and preserve meaningful paths.

### Address

Store both original and structured components:

```text
province
district
neighborhood
street
building_number
postal_code
country
formatted_address
```

## 6. Taxonomy

Create an internal stable taxonomy independent of any single source.

Example:

```text
health
  dental
    dentist
    dental_clinic
    orthodontist

hospitality
  hotel
    hotel
    boutique_hotel
```

Each source category should map to the internal taxonomy.

Never overwrite the original source category.

## 7. Deduplication / entity resolution

### Exact matches

Strong signals:
- same source id
- same normalized domain
- same normalized phone

### Fuzzy matches

Signals:
- name similarity
- address similarity
- geographic distance
- category similarity

Example scoring model:

```text
same_phone            +40
same_domain           +30
same_coordinate       +20
same_address          +15
high_name_similarity +10
same_category         +5
```

These weights are starting values, not permanent truth. They must be evaluated against labeled examples.

Threshold proposal:

```text
>= 85      auto-merge candidate
60-84      review / probabilistic match
< 60       keep separate
```

The threshold system must be configurable.

## 8. Merge rules

When records are merged:
- never discard source history
- retain all source ids
- retain field provenance
- retain merge score
- record merge timestamp
- record merge reason

Canonical value selection should consider source reliability, freshness and agreement.

## 9. Website enrichment

Only crawl websites when:
- the crawl is technically permitted
- the site terms/robots considerations have been evaluated for the intended use
- the intended storage and resale use is appropriate

Recommended crawler stages:

```text
homepage
  -> contact
  -> about
  -> appointment / booking
  -> privacy / corporate pages when useful
```

Respect:
- rate limits
- timeouts
- robots directives where applicable to the use case
- retry budgets
- robots.txt changes

Never hammer a site.

## 10. Enrichment fields

Potential business-level fields:

```text
email_domains
business_emails
social_links
whatsapp_present
booking_present
booking_url
contact_form_present
ssl_present
cms
analytics_tools
advertising_pixels
technology_stack
website_status
```

Treat inferred fields as signals, not absolute facts.

## 11. Contact handling

Separate:
- business contact
- personal contact
- source URL
- collection date
- confidence

Do not automatically convert any email/phone discovered on a website into a verified business contact.

## 12. Verification

Verification jobs may check:

```text
DNS
HTTP status
TLS/SSL
redirect chain
domain expiration signal where licensed/available
phone formatting
source agreement
```

Recommended statuses:

```text
verified
likely_valid
needs_review
stale
closed
conflicting
```

## 13. Freshness

Every field with external provenance should have a freshness timestamp.

At minimum:

```text
first_seen_at
last_seen_at
last_verified_at
```

Use field-level provenance where practical.

## 14. Quality score

Initial components:

```text
completeness
freshness
source_agreement
identity_confidence
contact_confidence
location_confidence
```

Example:

```text
quality_score = weighted average of the components
```

Do not present the score as objective truth. Document what it measures.

## 15. Change detection

Compare current record with the previous snapshot.

Detect:
- name change
- phone change
- website change
- address change
- category change
- opening status change

Write every meaningful change to `business_changes`.

## 16. Reprocessing

Pipeline steps must be independently rerunnable.

Example:

```text
Taxonomy logic changed
        |
        v
re-run classification
        |
        v
re-score records
        |
        v
re-index
```

Do not download the entire source again just because the transformation logic changed.


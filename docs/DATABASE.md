# LeadTR — PostgreSQL / PostGIS Data Model

## 1. Database goals

PostgreSQL is the canonical source of truth.
PostGIS handles geographic queries.
Search-engine data is derived and disposable.

## 2. Core tables

### businesses

```sql
id UUID PRIMARY KEY
canonical_name TEXT NOT NULL
automated_description TEXT NULL
business_status TEXT NOT NULL
category_id UUID NULL
source_count INT NOT NULL DEFAULT 0
identity_confidence NUMERIC(5,2)
completeness_score NUMERIC(5,2)
freshness_score NUMERIC(5,2)
digital_presence_score NUMERIC(5,2)
lead_score NUMERIC(5,2)
first_seen_at TIMESTAMPTZ NOT NULL
last_seen_at TIMESTAMPTZ NOT NULL
last_verified_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

### business_names

```text
id
business_id
name
normalized_name
language
is_primary
source_id
source_record_id
created_at
```

### business_locations

```text
id
business_id
country
province
province_normalized
district
district_normalized
neighborhood
street
building_number
postal_code
formatted_address
latitude
longitude
location GEOGRAPHY(POINT,4326)
source_id
source_record_id
confidence
created_at
updated_at
```

### business_phones

```text
id
business_id
original_phone
normalized_phone
country_code
phone_type
is_primary
source_id
source_record_id
first_seen_at
last_seen_at
confidence
```

### business_emails

```text
id
business_id
email
normalized_email
email_type
is_primary
source_id
source_record_id
first_seen_at
last_seen_at
confidence
```

### business_websites

```text
id
business_id
original_url
canonical_url
domain
is_primary
http_status
https_available
last_checked_at
source_id
confidence
```

### business_socials

```text
id
business_id
platform
url
normalized_handle
is_primary
source_id
last_checked_at
confidence
```

### business_categories

```text
id
parent_id
slug
name
level
active
```

### business_category_sources

```text
id
business_id
source_id
source_category
mapped_category_id
mapping_confidence
```

## 3. Provenance tables

### data_sources

```text
id
provider
name
source_type
license
terms_url
storage_allowed
commercial_use_allowed
redistribution_allowed
refresh_frequency
active
created_at
updated_at
```

### source_records

```text
id
source_id
source_record_id
raw_payload_hash
raw_storage_path
source_version
collected_at
created_at
```

### field_provenance

```text
id
business_id
field_name
field_value_hash
source_id
source_record_id
observed_at
confidence
```

## 4. History

### business_snapshots

Store canonical snapshots or field versions as needed for change detection.

### business_changes

```text
id
business_id
field_name
old_value
new_value
change_type
observed_at
source_id
```

## 5. Crawl tables

### crawl_jobs

```text
id
business_id
url
job_type
status
attempt_count
scheduled_at
started_at
finished_at
error_code
error_message
```

### crawl_results

```text
id
crawl_job_id
url
http_status
content_type
content_hash
response_size
storage_path
extracted_fields JSONB
created_at
```

## 6. Quality tables

### data_quality_scores

```text
id
business_id
completeness_score
freshness_score
source_agreement_score
identity_score
contact_score
location_score
calculated_at
model_version
```

## 7. Customer tables

```text
customers
users
organizations
memberships
subscriptions
plans
credits
credit_transactions
api_keys
api_usage
saved_searches
exports
export_items
suppression_requests
```

## 8. Recommended indexes

Create indexes deliberately:

```sql
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_locations_province ON business_locations(province_normalized);
CREATE INDEX idx_locations_district ON business_locations(district_normalized);
CREATE INDEX idx_phones_normalized ON business_phones(normalized_phone);
CREATE INDEX idx_emails_normalized ON business_emails(normalized_email);
CREATE INDEX idx_websites_domain ON business_websites(domain);
CREATE INDEX idx_businesses_status ON businesses(business_status);
```

For geospatial search:

```sql
CREATE INDEX idx_business_locations_geo
ON business_locations
USING GIST (location);
```

## 9. Uniqueness

Possible unique constraints:

```text
(source_id, source_record_id)
normalized_domain where appropriate
normalized_phone where business-level uniqueness is safe
```

Do not enforce uniqueness assumptions that are not globally valid.

## 10. Migrations

Use a migration tool compatible with the chosen backend framework.

Never make production-only manual schema edits.

Every migration should be:
- deterministic
- reversible where practical
- reviewed
- tested on a copy of production-like data


CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"automated_description" text,
	"business_status" text DEFAULT 'unknown' NOT NULL,
	"category_id" uuid,
	"source_count" integer DEFAULT 0 NOT NULL,
	"identity_confidence" numeric(5, 2),
	"completeness_score" numeric(5, 2),
	"freshness_score" numeric(5, 2),
	"digital_presence_score" numeric(5, 2),
	"lead_score" numeric(5, 2),
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "business_categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"source_type" text NOT NULL,
	"license" text,
	"terms_url" text,
	"storage_allowed" boolean DEFAULT false NOT NULL,
	"commercial_use_allowed" boolean DEFAULT false NOT NULL,
	"redistribution_allowed" boolean DEFAULT false NOT NULL,
	"attribution_required" boolean DEFAULT true NOT NULL,
	"refresh_frequency" text,
	"collection_method" text,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "source_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"source_record_id" text NOT NULL,
	"raw_payload_hash" text,
	"raw_storage_path" text,
	"source_version" text,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"email_type" text DEFAULT 'unknown',
	"is_primary" boolean DEFAULT false NOT NULL,
	"source_id" uuid,
	"source_record_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" numeric(5, 2)
);

CREATE TABLE "business_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"country" text DEFAULT 'TR' NOT NULL,
	"province" text,
	"province_normalized" text,
	"district" text,
	"district_normalized" text,
	"neighborhood" text,
	"street" text,
	"building_number" text,
	"postal_code" text,
	"formatted_address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"source_id" uuid,
	"source_record_id" text,
	"confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"language" text DEFAULT 'tr',
	"is_primary" boolean DEFAULT false NOT NULL,
	"source_id" uuid,
	"source_record_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"original_phone" text NOT NULL,
	"normalized_phone" text,
	"country_code" text DEFAULT '90',
	"phone_type" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source_id" uuid,
	"source_record_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" numeric(5, 2)
);

CREATE TABLE "business_socials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"normalized_handle" text,
	"is_primary" boolean DEFAULT true NOT NULL,
	"source_id" uuid,
	"last_checked_at" timestamp with time zone,
	"confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"original_url" text NOT NULL,
	"canonical_url" text,
	"domain" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"http_status" text,
	"https_available" boolean,
	"last_checked_at" timestamp with time zone,
	"source_id" uuid,
	"confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_category_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_category" text NOT NULL,
	"mapped_category_id" uuid,
	"mapping_confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"change_type" text NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_id" uuid
);

CREATE TABLE "data_quality_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"completeness_score" numeric(5, 2),
	"freshness_score" numeric(5, 2),
	"source_agreement_score" numeric(5, 2),
	"identity_score" numeric(5, 2),
	"contact_score" numeric(5, 2),
	"location_score" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_version" text DEFAULT 'v1' NOT NULL
);

CREATE TABLE "field_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"field_value_hash" text,
	"source_id" uuid NOT NULL,
	"source_record_id" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" numeric(5, 2)
);

CREATE TABLE "crawl_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"url" text NOT NULL,
	"job_type" text DEFAULT 'homepage' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "crawl_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crawl_job_id" uuid NOT NULL,
	"url" text NOT NULL,
	"http_status" text,
	"content_type" text,
	"content_hash" text,
	"response_size" integer,
	"storage_path" text,
	"extracted_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"reference_id" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"filters" jsonb NOT NULL,
	"columns" jsonb,
	"format" text DEFAULT 'csv' NOT NULL,
	"record_count" integer,
	"credits_cost" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"file_url" text,
	"expires_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);

CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);

CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"monthly_credits" integer DEFAULT 0 NOT NULL,
	"max_api_requests_per_minute" integer DEFAULT 60 NOT NULL,
	"max_exports_per_month" integer DEFAULT 0 NOT NULL,
	"price_monthly" numeric(10, 2),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);

CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"notify_on_new" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "suppression_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_value_hash" text NOT NULL,
	"reason" text,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_auth_id" text,
	"email" text NOT NULL,
	"full_name" text,
	"role" text DEFAULT 'member' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_auth_id_unique" UNIQUE("external_auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_business_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."business_categories"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "source_records" ADD CONSTRAINT "source_records_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_emails" ADD CONSTRAINT "business_emails_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_emails" ADD CONSTRAINT "business_emails_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_names" ADD CONSTRAINT "business_names_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_names" ADD CONSTRAINT "business_names_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_phones" ADD CONSTRAINT "business_phones_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_phones" ADD CONSTRAINT "business_phones_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_socials" ADD CONSTRAINT "business_socials_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_socials" ADD CONSTRAINT "business_socials_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_websites" ADD CONSTRAINT "business_websites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_websites" ADD CONSTRAINT "business_websites_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_category_sources" ADD CONSTRAINT "business_category_sources_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_category_sources" ADD CONSTRAINT "business_category_sources_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "business_changes" ADD CONSTRAINT "business_changes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_changes" ADD CONSTRAINT "business_changes_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "data_quality_scores" ADD CONSTRAINT "data_quality_scores_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crawl_results" ADD CONSTRAINT "crawl_results_crawl_job_id_crawl_jobs_id_fk" FOREIGN KEY ("crawl_job_id") REFERENCES "public"."crawl_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "credits" ADD CONSTRAINT "credits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exports" ADD CONSTRAINT "exports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "exports" ADD CONSTRAINT "exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE INDEX "idx_businesses_category" ON "businesses" USING btree ("category_id");
CREATE INDEX "idx_businesses_status" ON "businesses" USING btree ("business_status");
CREATE INDEX "idx_businesses_updated" ON "businesses" USING btree ("updated_at");
CREATE INDEX "idx_businesses_lead_score" ON "businesses" USING btree ("lead_score");
CREATE INDEX "idx_categories_parent" ON "business_categories" USING btree ("parent_id");
CREATE INDEX "idx_categories_slug" ON "business_categories" USING btree ("slug");
CREATE INDEX "idx_sources_provider" ON "data_sources" USING btree ("provider");
CREATE INDEX "idx_sources_active" ON "data_sources" USING btree ("active");
CREATE INDEX "idx_source_records_source" ON "source_records" USING btree ("source_id");
CREATE INDEX "idx_source_records_external" ON "source_records" USING btree ("source_id","source_record_id");
CREATE INDEX "idx_emails_business" ON "business_emails" USING btree ("business_id");
CREATE INDEX "idx_emails_normalized" ON "business_emails" USING btree ("normalized_email");
CREATE INDEX "idx_locations_business" ON "business_locations" USING btree ("business_id");
CREATE INDEX "idx_locations_province" ON "business_locations" USING btree ("province_normalized");
CREATE INDEX "idx_locations_district" ON "business_locations" USING btree ("district_normalized");
CREATE INDEX "idx_names_business" ON "business_names" USING btree ("business_id");
CREATE INDEX "idx_names_normalized" ON "business_names" USING btree ("normalized_name");
CREATE INDEX "idx_phones_business" ON "business_phones" USING btree ("business_id");
CREATE INDEX "idx_phones_normalized" ON "business_phones" USING btree ("normalized_phone");
CREATE INDEX "idx_socials_business" ON "business_socials" USING btree ("business_id");
CREATE INDEX "idx_socials_platform" ON "business_socials" USING btree ("platform");
CREATE INDEX "idx_websites_business" ON "business_websites" USING btree ("business_id");
CREATE INDEX "idx_websites_domain" ON "business_websites" USING btree ("domain");
CREATE INDEX "idx_cat_sources_business" ON "business_category_sources" USING btree ("business_id");
CREATE INDEX "idx_cat_sources_source" ON "business_category_sources" USING btree ("source_id");
CREATE INDEX "idx_changes_business" ON "business_changes" USING btree ("business_id");
CREATE INDEX "idx_changes_observed" ON "business_changes" USING btree ("observed_at");
CREATE INDEX "idx_changes_type" ON "business_changes" USING btree ("change_type");
CREATE INDEX "idx_quality_business" ON "data_quality_scores" USING btree ("business_id");
CREATE INDEX "idx_provenance_business" ON "field_provenance" USING btree ("business_id");
CREATE INDEX "idx_provenance_field" ON "field_provenance" USING btree ("business_id","field_name");
CREATE INDEX "idx_crawl_jobs_business" ON "crawl_jobs" USING btree ("business_id");
CREATE INDEX "idx_crawl_jobs_status" ON "crawl_jobs" USING btree ("status");
CREATE INDEX "idx_crawl_jobs_scheduled" ON "crawl_jobs" USING btree ("scheduled_at");
CREATE INDEX "idx_crawl_results_job" ON "crawl_results" USING btree ("crawl_job_id");
CREATE INDEX "idx_api_keys_org" ON "api_keys" USING btree ("organization_id");
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");
CREATE INDEX "idx_audit_org" ON "audit_logs" USING btree ("organization_id");
CREATE INDEX "idx_credit_tx_org" ON "credit_transactions" USING btree ("organization_id");
CREATE INDEX "idx_credit_tx_created" ON "credit_transactions" USING btree ("created_at");
CREATE UNIQUE INDEX "idx_credits_org" ON "credits" USING btree ("organization_id");
CREATE INDEX "idx_exports_org" ON "exports" USING btree ("organization_id");
CREATE INDEX "idx_exports_status" ON "exports" USING btree ("status");
CREATE UNIQUE INDEX "idx_memberships_unique" ON "memberships" USING btree ("user_id","organization_id");
CREATE INDEX "idx_orgs_slug" ON "organizations" USING btree ("slug");
CREATE INDEX "idx_saved_searches_org" ON "saved_searches" USING btree ("organization_id");
CREATE INDEX "idx_suppression_hash" ON "suppression_requests" USING btree ("entity_value_hash");
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");
CREATE INDEX "idx_users_external_auth" ON "users" USING btree ("external_auth_id");
ALTER TABLE "business_locations" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);
CREATE INDEX IF NOT EXISTS "idx_locations_geog" ON "business_locations" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "idx_business_names_trgm" ON "business_names" USING GIN ("normalized_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_businesses_name_trgm" ON "businesses" USING GIN ("canonical_name" gin_trgm_ops);
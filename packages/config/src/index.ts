import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // PostgreSQL / Supabase
  DATABASE_URL: z.string().optional(),
  DATABASE_DIRECT_URL: z.string().optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Supabase Auth
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // S3 / Object Storage
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().default('leadtr-raw'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().default('auto'),

  // Typesense Search
  TYPESENSE_HOST: z.string().default('localhost'),
  TYPESENSE_PORT: z.coerce.number().default(8108),
  TYPESENSE_PROTOCOL: z.string().default('http'),
  TYPESENSE_API_KEY: z.string().optional(),

  // Security & Billing
  JWT_SECRET: z.string().default('leadtr-super-secret-jwt-key-for-development-change-in-prod'),
  BILLING_SECRET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!parsedConfig) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.warn('⚠️ Environment variable validation warnings:', result.error.format());
      parsedConfig = envSchema.parse({});
    } else {
      parsedConfig = result.data;
    }
  }
  return parsedConfig;
}

export const config = getConfig();

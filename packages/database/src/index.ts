import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

/**
 * Create a database connection.
 * Uses DATABASE_URL from environment.
 *
 * @param url - Override connection URL (defaults to DATABASE_URL env var)
 * @param options - postgres.js connection options
 */
export function createDb(url?: string, options?: postgres.Options<Record<string, never>>) {
  const connectionUrl = url ?? process.env.DATABASE_URL;

  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL is not set. Please set it in your .env file.\n' +
      'Example: postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
    );
  }

  const client = postgres(connectionUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ...options,
  });

  return drizzle(client, { schema });
}

/** Type of the database instance returned by createDb */
export type Database = ReturnType<typeof createDb>;

// Re-export schema for convenience
export * from './schema/index.js';

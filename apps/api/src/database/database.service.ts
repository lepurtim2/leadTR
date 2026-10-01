import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { createDb, type Database } from '@leadtr/database';
import postgres from 'postgres';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public db: Database | null = null;
  public client: postgres.Sql | null = null;
  public isConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      this.logger.warn(
        '⚠️ DATABASE_URL is not configured. Database direct queries will run in mock/standby mode.\n' +
        'Set DATABASE_URL=postgresql://postgres:[PASSWORD]@db.daqgvimsxarrkhagphvd.supabase.co:5432/postgres in .env'
      );
      return;
    }

    try {
      this.client = postgres(url, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      this.db = createDb(url, { max: 10 });
      this.isConnected = true;
      this.logger.log('✅ PostgreSQL / Supabase connection initialized');
    } catch (err) {
      this.logger.error('❌ Failed to initialize PostgreSQL client', err);
    }
  }

  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'disconnected'; latencyMs?: number }> {
    if (!this.client) {
      return { status: 'disconnected' };
    }
    const start = Date.now();
    try {
      await this.client`SELECT 1`;
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error('Database health check failed', err);
      return { status: 'degraded' };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.end();
    }
  }
}

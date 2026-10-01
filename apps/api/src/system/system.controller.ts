import { Controller, Get, Post, Inject, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DuckDbService } from '../database/duckdb.service.js';

@Controller('system')
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(@Inject(DuckDbService) private readonly duckDb: DuckDbService) {}

  @Get('sync-status')
  getSyncStatus() {
    const auditPaths = [
      path.resolve(process.cwd(), '../../data/sync_audit.json'),
      path.resolve(process.cwd(), '../data/sync_audit.json'),
      path.resolve(process.cwd(), 'data/sync_audit.json'),
      'C:/Users/Administrator/Desktop/Personal/data/leadTR/data/sync_audit.json',
    ];

    let auditHistory: any[] = [];
    for (const p of auditPaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          auditHistory = JSON.parse(raw);
          break;
        } catch {
          // continue
        }
      }
    }

    const latestRun = auditHistory[0] || null;

    return {
      status: 'ok',
      engine: 'LeadTR Bi-Monthly Automated Sync Engine',
      schedule: {
        frequency: 'Twice Monthly (Her ayın 1. ve 15. günleri)',
        cron_expression: '0 3 1,15 * *',
        next_run: latestRun?.next_scheduled_run || 'Her ayın 1 ve 15 i',
        description: 'Eskiyen / kapalı domainleri tespit edip otomatik çıkarma ve aktif verileri doğrulama döngüsü',
      },
      latest_sync: latestRun,
      history_runs: auditHistory.slice(0, 10),
    };
  }

  @Get('stats')
  async getLakeStats() {
    const pattern = this.duckDb.getParquetPattern();
    if (!pattern) {
      return { status: 'no_data', message: 'Parquet lake not found' };
    }

    try {
      const stats = await (this.duckDb as any).query(`
        SELECT 
          count(*) AS total_businesses,
          count(CASE WHEN business_status = 'active' OR business_status IS NULL THEN 1 END) AS active_businesses,
          count(CASE WHEN business_status = 'inactive' THEN 1 END) AS inactive_businesses,
          count(phone) AS total_phones,
          count(website) AS total_websites,
          count(email) AS total_emails,
          count(DISTINCT province) AS total_provinces,
          count(DISTINCT category_slug) AS total_categories
        FROM '${pattern}'
      `);

      const raw = stats[0] || {};
      const serialized = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [
          k,
          typeof v === 'bigint' ? Number(v) : v,
        ])
      );

      return {
        status: 'ok',
        stats: serialized,
      };
    } catch (err: any) {
      this.logger.error('Failed to query lake stats', err);
      return { status: 'error', message: err.message };
    }
  }
}

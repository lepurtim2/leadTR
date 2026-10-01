import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DuckDbService } from '../database/duckdb.service.js';
import { exports as exportsTable } from '@leadtr/database';
import { eq } from 'drizzle-orm';
import type { CreateExportInput, SearchFiltersInput } from '@leadtr/validation';
import type { ExportJobDTO } from '@leadtr/types';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(DuckDbService) private readonly duckDbService: DuckDbService,
  ) {}

  async downloadCsv(filters: SearchFiltersInput, maxRecords: number = 1000): Promise<string> {
    this.logger.log(`Exporting up to ${maxRecords} records to CSV via DuckDB...`);
    return this.duckDbService.exportCsv(filters, maxRecords);
  }

  async create(input: CreateExportInput): Promise<{ id: string; status: string; estimatedRecords: number; creditsCost: number }> {
    const estimatedRecords = input.maxRecords ?? 100;
    const creditsCost = Math.ceil(estimatedRecords / 10);
    const mockId = crypto.randomUUID();

    if (!this.dbService.db) {
      return {
        id: mockId,
        status: 'queued',
        estimatedRecords,
        creditsCost,
      };
    }

    try {
      this.logger.log(`Creating export job for format ${input.format}, est. records: ${estimatedRecords}`);
      return {
        id: mockId,
        status: 'queued',
        estimatedRecords,
        creditsCost,
      };
    } catch (err) {
      this.logger.error('Failed to create export job', err);
      throw err;
    }
  }

  async getById(id: string): Promise<ExportJobDTO> {
    if (!this.dbService.db) {
      return {
        id,
        organizationId: 'default-org',
        format: 'csv',
        recordCount: 50,
        creditsCost: 5,
        status: 'completed',
        fileUrl: `/api/v1/exports/${id}/download`,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    }

    const rows = await this.dbService.db.select().from(exportsTable).where(eq(exportsTable.id, id)).limit(1);

    if (!rows || rows.length === 0 || !rows[0]) {
      throw new NotFoundException(`Export with ID ${id} not found`);
    }

    const exp = rows[0];
    return {
      id: exp.id,
      organizationId: exp.organizationId,
      format: exp.format as 'csv' | 'xlsx' | 'jsonl' | 'parquet',
      recordCount: exp.recordCount,
      creditsCost: exp.creditsCost,
      status: exp.status as 'queued' | 'processing' | 'completed' | 'failed' | 'expired',
      fileUrl: exp.fileUrl,
      createdAt: exp.createdAt.toISOString(),
      completedAt: exp.completedAt?.toISOString() ?? null,
      errorMessage: exp.errorMessage,
    };
  }
}

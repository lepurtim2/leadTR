import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeBusinessWebsite, ScrapedContactData } from './scraper.util.js';
import { DuckDbService } from '../database/duckdb.service.js';

export interface EnrichedRecord {
  businessId: string;
  website: string;
  canonicalName?: string;
  emails: string[];
  phones: string[];
  socials: {
    platform: 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'x' | 'tiktok';
    url: string;
    handle?: string;
  }[];
  title?: string;
  metaDescription?: string;
  httpStatus?: number;
  enrichedAt: string;
}

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly enrichmentsFilePath = path.resolve(process.cwd(), 'data', 'enrichments.json');
  private enrichmentsMap = new Map<string, EnrichedRecord>();

  constructor(
    @Inject(forwardRef(() => DuckDbService))
    private readonly duckDbService: DuckDbService,
  ) {}

  onModuleInit() {
    this.loadEnrichments();
  }

  private loadEnrichments() {
    try {
      if (fs.existsSync(this.enrichmentsFilePath)) {
        const raw = fs.readFileSync(this.enrichmentsFilePath, 'utf-8');
        const data: Record<string, EnrichedRecord> = JSON.parse(raw);
        for (const [id, record] of Object.entries(data)) {
          this.enrichmentsMap.set(id, record);
        }
        this.logger.log(`Loaded ${this.enrichmentsMap.size} persistent business enrichments.`);
      }
    } catch (err) {
      this.logger.warn(`Could not load enrichments file: ${err}`);
    }
  }

  private saveEnrichments() {
    try {
      const dir = path.dirname(this.enrichmentsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const obj: Record<string, EnrichedRecord> = {};
      for (const [id, record] of this.enrichmentsMap.entries()) {
        obj[id] = record;
      }
      fs.writeFileSync(this.enrichmentsFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error(`Error saving enrichments to file: ${err}`);
    }
  }

  getEnrichment(businessId: string): EnrichedRecord | null {
    return this.enrichmentsMap.get(businessId) || null;
  }

  getAllEnrichments(): Map<string, EnrichedRecord> {
    return this.enrichmentsMap;
  }

  async enrichBusiness(businessId: string): Promise<{ success: boolean; message: string; data?: EnrichedRecord }> {
    // 1. Check if business exists in DuckDB
    const business = await this.duckDbService.getById(businessId);
    if (!business) {
      return { success: false, message: 'İşletme kaydı bulunamadı.' };
    }

    const websiteUrl = business.websites?.[0]?.originalUrl || business.websites?.[0]?.canonicalUrl;
    if (!websiteUrl) {
      return {
        success: false,
        message: 'Bu işletmenin kayıtlı bir web sitesi bulunmuyor. Yalnızca web sitesi olan firmalar taranabilir.',
      };
    }

    this.logger.log(`Enriching business ${businessId} (${business.canonicalName}) via ${websiteUrl}`);

    // 2. Perform live scrape
    const scraped: ScrapedContactData = await scrapeBusinessWebsite(websiteUrl);

    // 3. Merge with existing business data
    const existingEmails = new Set(business.emails?.map((e) => e.email.toLowerCase()) || []);
    const newEmails = scraped.emails.filter((e) => !existingEmails.has(e.toLowerCase()));

    const record: EnrichedRecord = {
      businessId,
      website: websiteUrl,
      canonicalName: business.canonicalName,
      emails: Array.from(new Set([...existingEmails, ...newEmails])),
      phones: scraped.phones,
      socials: scraped.socials,
      title: scraped.title,
      metaDescription: scraped.metaDescription,
      httpStatus: scraped.httpStatus,
      enrichedAt: scraped.scrapedAt,
    };

    // 4. Save persistently and update DuckDB in-memory cache with 0ms delay
    this.enrichmentsMap.set(businessId, record);
    this.saveEnrichments();
    this.duckDbService.updateEnrichmentInMemory(businessId, record);

    return {
      success: true,
      message: `Zenginleştirme tamamlandı. ${record.emails.length} e-posta, ${record.socials.length} sosyal medya hesabı tespit edildi.`,
      data: record,
    };
  }
}

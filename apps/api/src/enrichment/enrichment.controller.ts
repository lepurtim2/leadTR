import { Controller, Post, Get, Param, Body, BadRequestException, Inject } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service.js';
import { scrapeBusinessWebsite } from './scraper.util.js';

@Controller('enrichment')
export class EnrichmentController {
  constructor(@Inject(EnrichmentService) private readonly enrichmentService: EnrichmentService) {}

  @Post(':businessId')
  async enrichBusiness(@Param('businessId') businessId: string) {
    if (!businessId || !businessId.trim()) {
      throw new BadRequestException('Geçerli bir businessId belirtilmelidir.');
    }
    return this.enrichmentService.enrichBusiness(businessId.trim());
  }

  @Get(':businessId')
  async getEnrichment(@Param('businessId') businessId: string) {
    const data = this.enrichmentService.getEnrichment(businessId);
    if (!data) {
      return { enriched: false, data: null };
    }
    return { enriched: true, data };
  }

  @Post('scrape/direct')
  async scrapeDirect(@Body('url') url: string) {
    if (!url || !url.trim()) {
      throw new BadRequestException('Taranacak web sitesi URL adresi belirtilmelidir.');
    }
    const result = await scrapeBusinessWebsite(url.trim());
    return {
      success: true,
      data: result,
    };
  }
}

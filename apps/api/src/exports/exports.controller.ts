import { Controller, Post, Get, Param, Query, Body, Res, BadRequestException, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { ExportsService } from './exports.service.js';
import { createExportSchema, searchFiltersSchema, type SearchFiltersInput } from '@leadtr/validation';

@Controller('exports')
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exportsService: ExportsService) {}

  @Get('download')
  async download(@Query() query: any, @Res() res: Response) {
    const filtersResult = searchFiltersSchema.safeParse(query);
    const filters: SearchFiltersInput = filtersResult.success
      ? filtersResult.data
      : searchFiltersSchema.parse({});
    const maxRecords = query.maxRecords
      ? parseInt(query.maxRecords, 10)
      : query.limit
        ? parseInt(query.limit, 10)
        : 1000;

    const csvData = await this.exportsService.downloadCsv(filters, maxRecords);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `leadtr_export_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  }

  @Post()
  async create(@Body() body: unknown) {
    const result = createExportSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid export parameters',
        errors: result.error.format(),
      });
    }
    return this.exportsService.create(result.data);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.exportsService.getById(id);
  }
}

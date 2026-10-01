import { Controller, Get, Param, Query, UsePipes, PipeTransform, BadRequestException, Inject } from '@nestjs/common';
import { BusinessesService } from './businesses.service.js';
import { searchFiltersSchema, type SearchFiltersInput } from '@leadtr/validation';

class ZodValidationPipe implements PipeTransform {
  transform(value: unknown) {
    const result = searchFiltersSchema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid search parameters',
        errors: result.error.format(),
      });
    }
    return result.data;
  }
}

@Controller('businesses')
export class BusinessesController {
  constructor(@Inject(BusinessesService) private readonly businessesService: BusinessesService) {}

  @Get()
  @UsePipes(new ZodValidationPipe())
  async search(@Query() filters: SearchFiltersInput) {
    return this.businessesService.search(filters);
  }

  @Get('count')
  @UsePipes(new ZodValidationPipe())
  async count(@Query() filters: SearchFiltersInput) {
    return this.businessesService.count(filters);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.businessesService.getById(id);
  }

  @Get(':id/provenance')
  async getProvenance(@Param('id') id: string) {
    return this.businessesService.getProvenance(id);
  }

  @Get(':id/changes')
  async getChanges(@Param('id') id: string) {
    return this.businessesService.getChanges(id);
  }
}

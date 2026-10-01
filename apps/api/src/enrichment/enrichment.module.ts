import { Module, forwardRef } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service.js';
import { EnrichmentController } from './enrichment.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [forwardRef(() => DatabaseModule)],
  controllers: [EnrichmentController],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}

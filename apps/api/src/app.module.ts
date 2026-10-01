import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { PlansModule } from './plans/plans.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { EnrichmentModule } from './enrichment/enrichment.module.js';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    BusinessesModule,
    CategoriesModule,
    PlansModule,
    ExportsModule,
    EnrichmentModule,
  ],
})
export class AppModule {}

import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { plans } from '@leadtr/database';
import { eq, asc } from 'drizzle-orm';
import type { PlanDTO } from '@leadtr/types';

@Injectable()
export class PlansService {
  constructor(@Inject(DatabaseService) private readonly dbService: DatabaseService) {}

  async getAll(): Promise<PlanDTO[]> {
    if (!this.dbService.db) return [];

    const rows = await this.dbService.db
      .select()
      .from(plans)
      .where(eq(plans.active, true))
      .orderBy(asc(plans.monthlyCredits));

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      monthlyCredits: p.monthlyCredits,
      maxApiRequestsPerMinute: p.maxApiRequestsPerMinute,
      maxExportsPerMonth: p.maxExportsPerMonth,
      priceMonthly: p.priceMonthly,
      active: p.active,
    }));
  }
}

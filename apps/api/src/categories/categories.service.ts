import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { businessCategories } from '@leadtr/database';
import { eq, asc } from 'drizzle-orm';
import type { BusinessCategoryDTO } from '@leadtr/types';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DatabaseService) private readonly dbService: DatabaseService) {}

  async getAll(): Promise<BusinessCategoryDTO[]> {
    if (!this.dbService.db) return [];

    const rows = await this.dbService.db
      .select()
      .from(businessCategories)
      .where(eq(businessCategories.active, true))
      .orderBy(asc(businessCategories.level), asc(businessCategories.name));

    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      level: c.level,
      parentId: c.parentId,
    }));
  }
}

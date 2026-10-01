import { describe, it, expect } from 'vitest';
import { searchFiltersSchema } from '@leadtr/validation';

describe('API Search Filters Validation', () => {
  it('should accept valid filter params', () => {
    const input = {
      query: 'Acıbadem',
      province: 'İstanbul',
      minLeadScore: 80,
      businessStatus: 'active',
      page: 1,
      limit: 20,
    };
    const result = searchFiltersSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid province', () => {
    const input = {
      province: 'Geçersiz Şehir',
    };
    const result = searchFiltersSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

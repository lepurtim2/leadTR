import { describe, it, expect } from 'vitest';
import {
  businesses,
  businessCategories,
  dataSources,
  businessLocations,
  businessPhones,
  plans,
} from './schema/index.js';

describe('Database Schema Definitions', () => {
  it('should properly export core tables', () => {
    expect(businesses).toBeDefined();
    expect(businessCategories).toBeDefined();
    expect(dataSources).toBeDefined();
    expect(businessLocations).toBeDefined();
    expect(businessPhones).toBeDefined();
    expect(plans).toBeDefined();
  });

  it('should have required columns on businesses table', () => {
    expect(businesses.canonicalName).toBeDefined();
    expect(businesses.businessStatus).toBeDefined();
    expect(businesses.leadScore).toBeDefined();
    expect(businesses.firstSeenAt).toBeDefined();
  });
});

import { Controller, Get, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly dbService: DatabaseService) {}

  @Get()
  async getHealth() {
    const dbHealth = await this.dbService.checkHealth();

    let redisStatus = 'not_configured';
    if (process.env.UPSTASH_REDIS_REST_URL) {
      redisStatus = 'configured';
    }

    return {
      status: 'ok',
      service: 'leadtr-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        provider: 'supabase-postgresql-postgis',
        ...dbHealth,
      },
      redis: {
        provider: 'upstash',
        status: redisStatus,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

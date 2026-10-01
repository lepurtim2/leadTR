import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { DuckDbService } from './duckdb.service.js';

@Global()
@Module({
  providers: [DatabaseService, DuckDbService],
  exports: [DatabaseService, DuckDbService],
})
export class DatabaseModule {}

import { Module } from '@nestjs/common';
import { SystemController } from './system.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemController],
})
export class SystemModule {}

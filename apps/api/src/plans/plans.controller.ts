import { Controller, Get, Inject } from '@nestjs/common';
import { PlansService } from './plans.service.js';

@Controller('plans')
export class PlansController {
  constructor(@Inject(PlansService) private readonly plansService: PlansService) {}

  @Get()
  async getAll() {
    return this.plansService.getAll();
  }
}

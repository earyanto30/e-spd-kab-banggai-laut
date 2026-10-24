import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  getStats() {
    return this.dashboardService.getStats();
  }
}

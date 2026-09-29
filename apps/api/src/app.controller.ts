import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { Role } from '@si-setda/shared-types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('admin/status')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  getAdminStatus() {
    return {
      message: 'Admin access authorized',
      timestamp: new Date().toISOString(),
    };
  }
}

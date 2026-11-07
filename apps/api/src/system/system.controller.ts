import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { SystemService } from './system.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, OnboardingSubmitSchema } from '@si-setda/shared-types';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  async getStatus() {
    return this.systemService.getStatus();
  }

  @Post('onboarding')
  @UseGuards(AuthGuard)
  @Roles(Role.SUPER_ADMIN)
  async completeOnboarding(@Body() body: unknown, @Req() req: any) {
    const parsed = OnboardingSubmitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors[0]?.message || 'Data inisialisasi onboarding tidak valid',
      );
    }

    return this.systemService.completeOnboarding(parsed.data, req.user?.sub);
  }
}

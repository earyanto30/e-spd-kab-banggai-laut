import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestSchema } from '@si-setda/shared-types';
import { APP_CLIENT_HEADER, APP_CLIENT_ID, AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: unknown,
    @Headers(APP_CLIENT_HEADER) clientHeader?: string,
  ) {
    if (clientHeader !== APP_CLIENT_ID) {
      throw new ForbiddenException(
        'Akses ditolak: Permintaan login hanya dapat dilakukan melalui aplikasi resmi SI-SPD.'
      );
    }

    const result = LoginRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Data login tidak valid');
    }

    return this.authService.login(result.data);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return req.user;
  }
}

import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestSchema } from '@si-setda/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown) {
    const result = LoginRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.errors[0]?.message || 'Data login tidak valid');
    }

    return this.authService.login(result.data);
  }
}

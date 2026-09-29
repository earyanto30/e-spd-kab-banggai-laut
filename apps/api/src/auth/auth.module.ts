import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RolesGuard } from './roles.guard';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RolesGuard, AuthGuard],
  exports: [AuthService, RolesGuard, AuthGuard],
})
export class AuthModule {}

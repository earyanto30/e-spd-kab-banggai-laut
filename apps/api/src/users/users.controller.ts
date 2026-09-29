import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserSchema,
  UpdateUserSchema,
  Role,
} from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(AuthGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('q') query?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll(query, role, isActive);
  }

  @Get('pegawai-options')
  getPegawaiOptions(@Query('userId') userId?: string) {
    return this.usersService.getUnlinkedPegawai(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  create(@Body() body: unknown) {
    const parseResult = CreateUserSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.errors[0]?.message || 'Data input pengguna tidak valid'
      );
    }
    return this.usersService.create(parseResult.data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parseResult = UpdateUserSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(
        parseResult.error.errors[0]?.message || 'Data perbaruan pengguna tidak valid'
      );
    }
    return this.usersService.update(id, parseResult.data);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}

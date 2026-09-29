import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PegawaiService, CreatePegawaiDto, UpdatePegawaiDto } from './pegawai.service';
import { Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('pegawai')
@UseGuards(AuthGuard)
export class PegawaiController {
  constructor(private readonly pegawaiService: PegawaiService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  findAll(
    @Query('q') query?: string,
    @Query('status') status?: string,
  ) {
    return this.pegawaiService.findAll(query, status);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  findById(@Param('id') id: string) {
    return this.pegawaiService.findById(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreatePegawaiDto) {
    return this.pegawaiService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePegawaiDto) {
    return this.pegawaiService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.pegawaiService.delete(id);
  }
}

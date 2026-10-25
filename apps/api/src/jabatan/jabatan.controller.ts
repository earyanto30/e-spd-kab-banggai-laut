import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JabatanService } from './jabatan.service';
import { CreateJabatanDto, UpdateJabatanDto, Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('jabatan')
@UseGuards(AuthGuard)
export class JabatanController {
  constructor(private readonly jabatanService: JabatanService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async findAll(@Query('query') query?: string) {
    return this.jabatanService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async findById(@Param('id') id: string) {
    return this.jabatanService.findById(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async create(@Body() dto: CreateJabatanDto) {
    return this.jabatanService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateJabatanDto) {
    return this.jabatanService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.jabatanService.remove(id);
  }
}

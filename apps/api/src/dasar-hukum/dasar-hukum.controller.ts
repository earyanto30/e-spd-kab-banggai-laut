import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DasarHukumService } from './dasar-hukum.service';
import { CreateDasarHukumDto, UpdateDasarHukumDto, Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('dasar-hukum')
@UseGuards(AuthGuard)
export class DasarHukumController {
  constructor(private readonly dasarHukumService: DasarHukumService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async findAll(@Query('query') query?: string) {
    return this.dasarHukumService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async findById(@Param('id') id: string) {
    return this.dasarHukumService.findById(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() dto: CreateDasarHukumDto) {
    return this.dasarHukumService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateDasarHukumDto) {
    return this.dasarHukumService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.dasarHukumService.remove(id);
  }
}

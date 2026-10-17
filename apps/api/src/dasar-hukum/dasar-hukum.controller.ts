import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { DasarHukumService } from './dasar-hukum.service';
import { CreateDasarHukumDto, UpdateDasarHukumDto } from '@si-setda/shared-types';

@Controller('dasar-hukum')
export class DasarHukumController {
  constructor(private readonly dasarHukumService: DasarHukumService) {}

  @Get()
  async findAll(@Query('query') query?: string) {
    return this.dasarHukumService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.dasarHukumService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateDasarHukumDto) {
    return this.dasarHukumService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDasarHukumDto) {
    return this.dasarHukumService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dasarHukumService.remove(id);
  }
}

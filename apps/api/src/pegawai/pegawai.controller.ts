import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PegawaiService, CreatePegawaiDto, UpdatePegawaiDto } from './pegawai.service';

@Controller('pegawai')
export class PegawaiController {
  constructor(private readonly pegawaiService: PegawaiService) {}

  @Get()
  findAll(
    @Query('q') query?: string,
    @Query('status') status?: string,
  ) {
    return this.pegawaiService.findAll(query, status);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.pegawaiService.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePegawaiDto) {
    return this.pegawaiService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePegawaiDto) {
    return this.pegawaiService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.pegawaiService.delete(id);
  }
}

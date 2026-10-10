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
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { PegawaiService, CreatePegawaiDto, UpdatePegawaiDto } from './pegawai.service';
import { Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('pegawai')
@UseGuards(AuthGuard)
export class PegawaiController {
  constructor(private readonly pegawaiService: PegawaiService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  findAll(
    @Query('q') query?: string,
    @Query('isASN') isASN?: string,
    @Query('isPenandatangan') isPenandatangan?: string,
  ) {
    return this.pegawaiService.findAll(query, isASN, isPenandatangan);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
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

  @Post(':id/tanda-tangan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN)
  @UseInterceptors(FileInterceptor('file'))
  uploadSignature(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.pegawaiService.saveSignature(id, file);
  }

  @Get(':id/tanda-tangan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  async streamSignature(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.pegawaiService.getSignaturePath(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="ttd-${id}.png"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Delete(':id/tanda-tangan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN)
  deleteSignature(@Param('id') id: string) {
    return this.pegawaiService.deleteSignature(id);
  }
}


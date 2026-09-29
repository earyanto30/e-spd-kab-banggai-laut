import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { KopSuratService } from './kop-surat.service';
import { Role } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('kop-surat')
@UseGuards(AuthGuard)
export class KopSuratController {
  constructor(private readonly kopSuratService: KopSuratService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async findAll() {
    return this.kopSuratService.findAll();
  }

  @Post('upload')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile() file: any,
    @Body('nama') nama: string,
    @Body('keterangan') keterangan?: string,
    @Body('isDefault') isDefault?: string | boolean,
  ) {
    const defaultFlag = isDefault === 'true' || isDefault === true;
    return this.kopSuratService.saveUploadedPdf(file, nama, keterangan, defaultFlag);
  }

  @Get(':id/stream')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async streamPdf(@Param('id') id: string, @Res() res: Response) {
    const item = await this.kopSuratService.findById(id);
    const filePath = this.kopSuratService.getFilePath(item.storedFileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${item.fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Patch(':id/default')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async setDefault(@Param('id') id: string) {
    return this.kopSuratService.setDefault(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async delete(@Param('id') id: string) {
    await this.kopSuratService.delete(id);
    return { success: true, message: 'Kop surat berhasil dihapus' };
  }
}

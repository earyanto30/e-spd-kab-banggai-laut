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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { KopSuratService } from './kop-surat.service';

@Controller('kop-surat')
export class KopSuratController {
  constructor(private readonly kopSuratService: KopSuratService) {}

  @Get()
  async findAll() {
    return this.kopSuratService.findAll();
  }

  @Post('upload')
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
  async streamPdf(@Param('id') id: string, @Res() res: Response) {
    const item = await this.kopSuratService.findById(id);
    const filePath = this.kopSuratService.getFilePath(item.storedFileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${item.fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Patch(':id/default')
  async setDefault(@Param('id') id: string) {
    return this.kopSuratService.setDefault(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.kopSuratService.delete(id);
    return { success: true, message: 'Kop surat berhasil dihapus' };
  }
}

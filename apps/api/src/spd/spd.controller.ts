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
  Res,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { SpdService } from './spd.service';
import { SpdPdfService } from './spd-pdf.service';
import { Role, CreateSpdDto, UpdateSpdDto, GenerateLaporanSpdDto } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('spd')
@UseGuards(AuthGuard)
export class SpdController {
  constructor(
    private readonly spdService: SpdService,
    private readonly spdPdfService: SpdPdfService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  findAll(
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('laporanStatus') laporanStatus?: string,
  ) {
    return this.spdService.findAll(query, status, startDate, endDate, laporanStatus);
  }

  @Get(':id/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('signerNama') signerNama?: string,
    @Query('signerNip') signerNip?: string,
    @Query('signerPangkat') signerPangkat?: string,
    @Query('signerGolongan') signerGolongan?: string,
    @Query('signerJabatan') signerJabatan?: string,
    @Query('fontFamily') fontFamily?: string,
  ) {
    await this.spdService.findById(id);

    const signer = signerNama
      ? {
          nama: signerNama,
          nip: signerNip || '',
          pangkat: signerPangkat || '',
          golongan: signerGolongan || '',
          jabatan: signerJabatan || '',
        }
      : undefined;

    const { buffer, fileName } = await this.spdPdfService.generatePdf(id, signer, fontFamily);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post(':id/laporan-pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async generateLaporanPdf(
    @Param('id') id: string,
    @Body() body: GenerateLaporanSpdDto,
    @Res() res: Response,
    @Query('fontFamily') fontFamilyQuery?: string,
  ) {
    if (!body.hasilPerjalanan || !body.hasilPerjalanan.trim()) {
      throw new BadRequestException('Hasil perjalanan wajib diisi.');
    }
    if (!body.penandatangan) {
      throw new BadRequestException('Pejabat penanda tangan wajib dipilih.');
    }

    await this.spdService.saveLaporan(id, body);
    const selectedFont = body.fontFamily || fontFamilyQuery;
    const { buffer, fileName } = await this.spdPdfService.generateLaporanPdf(id, body, selectedFont);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Put(':id/laporan')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  async saveLaporan(
    @Param('id') id: string,
    @Body() body: GenerateLaporanSpdDto,
  ) {
    if (!body.hasilPerjalanan || !body.hasilPerjalanan.trim()) {
      throw new BadRequestException('Hasil perjalanan wajib diisi.');
    }
    if (!body.penandatangan) {
      throw new BadRequestException('Pejabat penanda tangan wajib dipilih.');
    }
    return this.spdService.saveLaporan(id, body);
  }

  @Post('bulk-delete')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  async bulkDelete(@Body('ids') ids: string[]) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Daftar ID SPD wajib disertakan.');
    }
    return this.spdService.bulkDelete(ids);
  }

  @Post('bulk-pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async downloadBulkPdf(
    @Body('ids') ids: string[],
    @Body('fontFamily') fontFamily: string | undefined,
    @Body('sequence') sequence: 'collate' | 'non-collate' | undefined,
    @Res() res: Response,
  ) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Daftar ID SPD wajib disertakan.');
    }
    const { buffer, fileName } = await this.spdPdfService.generateBulkPdf(ids, fontFamily, sequence || 'non-collate');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  findById(@Param('id') id: string) {
    return this.spdService.findById(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  create(@Body() dto: CreateSpdDto) {
    return this.spdService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateSpdDto) {
    return this.spdService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.spdService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  delete(@Param('id') id: string) {
    return this.spdService.delete(id);
  }
}

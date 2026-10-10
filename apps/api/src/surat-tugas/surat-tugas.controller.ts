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
} from '@nestjs/common';
import { Response } from 'express';
import { SuratTugasService } from './surat-tugas.service';
import { SuratTugasPdfService } from './surat-tugas-pdf.service';
import { Role, CreateSuratTugasDto, UpdateSuratTugasDto, GenerateSpdFromSuratTugasDto } from '@si-setda/shared-types';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('surat-tugas')
@UseGuards(AuthGuard)
export class SuratTugasController {
  constructor(
    private readonly suratTugasService: SuratTugasService,
    private readonly suratTugasPdfService: SuratTugasPdfService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  findAll(
    @Req() req: any,
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.suratTugasService.findAll(query, status, startDate, endDate, req.user);
  }

  @Get(':id/pdf')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  async downloadPdf(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query('signerNama') signerNama?: string,
    @Query('signerNip') signerNip?: string,
    @Query('signerPangkat') signerPangkat?: string,
    @Query('signerGolongan') signerGolongan?: string,
    @Query('signerJabatan') signerJabatan?: string,
    @Query('fontFamily') fontFamily?: string,
  ) {
    // Verify signer permission if user is penandatangan
    await this.suratTugasService.findById(id, req.user);

    const signer = signerNama
      ? {
          nama: signerNama,
          nip: signerNip || '',
          pangkat: signerPangkat || '',
          golongan: signerGolongan || '',
          jabatan: signerJabatan || '',
        }
      : undefined;

    const { buffer, fileName } = await this.suratTugasPdfService.generatePdf(id, signer, fontFamily);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.suratTugasService.updateStatus(id, status);
  }

  @Post(':id/generate-spd')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  generateSpd(
    @Param('id') id: string,
    @Body() dto?: GenerateSpdFromSuratTugasDto,
  ) {
    return this.suratTugasService.generateSpd(id, dto);
  }

  @Delete(':id/spds')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  deleteAllSpd(@Param('id') id: string) {
    return this.suratTugasService.deleteAllSpd(id);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  findById(@Param('id') id: string, @Req() req: any) {
    return this.suratTugasService.findById(id, req.user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  create(@Body() dto: CreateSuratTugasDto) {
    return this.suratTugasService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateSuratTugasDto) {
    return this.suratTugasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.suratTugasService.delete(id);
  }
}

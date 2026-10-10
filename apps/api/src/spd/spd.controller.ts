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
import { SpdService } from './spd.service';
import { SpdPdfService } from './spd-pdf.service';
import { Role, CreateSpdDto, UpdateSpdDto } from '@si-setda/shared-types';
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
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  findAll(
    @Req() req: any,
    @Query('q') query?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.spdService.findAll(query, status, startDate, endDate, req.user);
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
    // Verify signer access if user is penandatangan
    await this.spdService.findById(id, req.user);

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

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  findById(@Param('id') id: string, @Req() req: any) {
    return this.spdService.findById(id, req.user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF, Role.USER)
  create(@Body() dto: CreateSpdDto) {
    return this.spdService.create(dto);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateSpdDto) {
    return this.spdService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PENANDATANGAN, Role.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.spdService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.spdService.delete(id);
  }
}

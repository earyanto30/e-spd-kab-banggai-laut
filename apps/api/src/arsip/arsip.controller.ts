import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ArsipService, BulkArchiveDto } from './arsip.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@si-setda/shared-types';

@Controller('arsip')
@UseGuards(AuthGuard)
export class ArsipController {
  constructor(private readonly arsipService: ArsipService) {}

  @Get('bundle/surat-tugas/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async downloadSuratTugasBundle(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.arsipService.generateBundlePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get('bundle/spd/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async downloadSpdBundle(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.arsipService.generateSpdBundlePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }

  @Post('surat-tugas/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  async archiveSuratTugas(@Param('id') id: string) {
    return this.arsipService.archiveSuratTugas(id);
  }

  @Post('spd/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  async archiveSpd(@Param('id') id: string) {
    return this.arsipService.archiveSpd(id);
  }

  @Post('bulk-archive')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
  async bulkArchive(@Body() body: BulkArchiveDto) {
    return this.arsipService.bulkArchive(body);
  }

  @Get('siap-arsip')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF, Role.USER)
  async getSiapArsip() {
    return this.arsipService.getSiapArsip();
  }
}

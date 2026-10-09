import { Module } from '@nestjs/common';
import { SuratTugasService } from './surat-tugas.service';
import { SuratTugasPdfService } from './surat-tugas-pdf.service';
import { SuratTugasController } from './surat-tugas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KopSuratModule } from '../kop-surat/kop-surat.module';

@Module({
  imports: [PrismaModule, KopSuratModule],
  controllers: [SuratTugasController],
  providers: [SuratTugasService, SuratTugasPdfService],
  exports: [SuratTugasService, SuratTugasPdfService],
})
export class SuratTugasModule {}

import { Module } from '@nestjs/common';
import { SpdService } from './spd.service';
import { SpdPdfService } from './spd-pdf.service';
import { SpdController } from './spd.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KopSuratModule } from '../kop-surat/kop-surat.module';

@Module({
  imports: [PrismaModule, KopSuratModule],
  controllers: [SpdController],
  providers: [SpdService, SpdPdfService],
  exports: [SpdService, SpdPdfService],
})
export class SpdModule {}

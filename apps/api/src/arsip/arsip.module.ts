import { Module } from '@nestjs/common';
import { ArsipService } from './arsip.service';
import { ArsipController } from './arsip.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SuratTugasModule } from '../surat-tugas/surat-tugas.module';
import { SpdModule } from '../spd/spd.module';

@Module({
  imports: [PrismaModule, SuratTugasModule, SpdModule],
  controllers: [ArsipController],
  providers: [ArsipService],
  exports: [ArsipService],
})
export class ArsipModule {}

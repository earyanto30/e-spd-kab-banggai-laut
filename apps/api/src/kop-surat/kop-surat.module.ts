import { Module } from '@nestjs/common';
import { KopSuratService } from './kop-surat.service';
import { KopSuratController } from './kop-surat.controller';

@Module({
  controllers: [KopSuratController],
  providers: [KopSuratService],
  exports: [KopSuratService],
})
export class KopSuratModule {}

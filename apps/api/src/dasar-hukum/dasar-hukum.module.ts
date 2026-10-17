import { Module } from '@nestjs/common';
import { DasarHukumService } from './dasar-hukum.service';
import { DasarHukumController } from './dasar-hukum.controller';

@Module({
  controllers: [DasarHukumController],
  providers: [DasarHukumService],
  exports: [DasarHukumService],
})
export class DasarHukumModule {}

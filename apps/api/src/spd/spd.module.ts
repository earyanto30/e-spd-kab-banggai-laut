import { Module } from '@nestjs/common';
import { SpdService } from './spd.service';
import { SpdController } from './spd.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpdController],
  providers: [SpdService],
  exports: [SpdService],
})
export class SpdModule {}

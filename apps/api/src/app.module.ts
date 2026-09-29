import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KopSuratModule } from './kop-surat/kop-surat.module';
import { PegawaiModule } from './pegawai/pegawai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, AuthModule, KopSuratModule, PegawaiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

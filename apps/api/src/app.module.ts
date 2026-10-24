import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KopSuratModule } from './kop-surat/kop-surat.module';
import { PegawaiModule } from './pegawai/pegawai.module';
import { UsersModule } from './users/users.module';
import { SpdModule } from './spd/spd.module';
import { SuratTugasModule } from './surat-tugas/surat-tugas.module';
import { DasarHukumModule } from './dasar-hukum/dasar-hukum.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    KopSuratModule,
    PegawaiModule,
    UsersModule,
    SpdModule,
    SuratTugasModule,
    DasarHukumModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

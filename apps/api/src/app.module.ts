import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KopSuratModule } from './kop-surat/kop-surat.module';
import { PegawaiModule } from './pegawai/pegawai.module';
import { UsersModule } from './users/users.module';
import { SpdModule } from './spd/spd.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, AuthModule, KopSuratModule, PegawaiModule, UsersModule, SpdModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

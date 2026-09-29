import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRequestDto, AuthResponseDto, Role, RoleType } from '@si-setda/shared-types';
import { hashPassword, verifyPassword, signJwt } from './crypto.util';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultUsers();
  }

  private async seedDefaultUsers() {
    // 1. Ensure Pegawai record for Fadli A. Arsad exists in master data
    const nipFadli = '198801152010011002';
    let pegawaiFadli = await this.prisma.pegawai.findUnique({
      where: { nip: nipFadli },
    });

    if (!pegawaiFadli) {
      pegawaiFadli = await this.prisma.pegawai.create({
        data: {
          nip: nipFadli,
          nama: 'Fadli A. Arsad',
          pangkat: 'Pembina Utama Muda',
          golongan: 'IV/c',
          jabatan: 'Sekretaris Daerah / Super Admin',
          unitKerja: 'Sekretariat Daerah Kab. Banggai Laut',
          status: 'PNS',
          email: 'fadli.arsad@banggailautkab.go.id',
          noHp: '08114567890',
        },
      });
      console.log('Seeded default ASN Pegawai: Fadli A. Arsad (NIP: 198801152010011002)');
    }

    // 2. Ensure User login account for Fadli A. Arsad exists with SUPER_ADMIN role
    const existingFadliUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: nipFadli },
          { username: 'fadli.arsad' },
          { pegawaiId: pegawaiFadli.id },
        ],
      },
    });

    if (!existingFadliUser) {
      await this.prisma.user.create({
        data: {
          username: nipFadli,
          name: 'Fadli A. Arsad',
          email: 'fadli.arsad@banggailautkab.go.id',
          password: hashPassword('admin123'),
          role: Role.SUPER_ADMIN,
          isActive: true,
          pegawaiId: pegawaiFadli.id,
        },
      });
      console.log('Seeded default User: Fadli A. Arsad as SUPER_ADMIN (NIP/Login: 198801152010011002, pass: admin123)');
    } else {
      await this.prisma.user.update({
        where: { id: existingFadliUser.id },
        data: {
          role: Role.SUPER_ADMIN,
          pegawaiId: pegawaiFadli.id,
          isActive: true,
        },
      });
    }
  }

  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const rawUsername = dto.username.trim();
    const cleanNip = rawUsername.replace(/\s+/g, '');

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: rawUsername },
          { username: cleanNip },
          { pegawai: { nip: rawUsername } },
          { pegawai: { nip: cleanNip } },
        ],
      },
      include: {
        pegawai: true,
      },
    });

    if (!user || !verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('NIP / Username atau kata sandi salah');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun pengguna tidak aktif');
    }

    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      pegawaiId: user.pegawaiId,
    };

    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.pegawai?.nama || user.name,
        role: user.role as RoleType,
        email: user.email || user.pegawai?.email || null,
        isActive: user.isActive,
        pegawaiId: user.pegawaiId,
        nip: user.pegawai?.nip || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}

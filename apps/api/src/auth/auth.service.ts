import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRequestDto, AuthResponseDto, RoleType } from '@si-setda/shared-types';
import { verifyPassword, signJwt } from './crypto.util';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const rawUsername = dto.username.trim();
    const cleanInput = rawUsername.replace(/\s+/g, '');
    const lowerInput = rawUsername.toLowerCase();
    const cleanLowerInput = cleanInput.toLowerCase();

    // Support common aliases for default super admin (Fadli A. Arsad)
    const isAdminAlias = [
      'admin',
      'superadmin',
      'super_admin',
      'fadli',
      'fadli.arsad',
      'sekda',
    ].includes(cleanLowerInput);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          // 1. Direct username matching (raw, stripped, or lowercase)
          { username: rawUsername },
          { username: cleanInput },
          { username: lowerInput },
          { username: cleanLowerInput },
          // 2. Email matching
          { email: lowerInput },
          { email: rawUsername },
          // 3. Pegawai NIP matching
          { pegawai: { nip: rawUsername } },
          { pegawai: { nip: cleanInput } },
          // 4. Pegawai Email matching
          { pegawai: { email: lowerInput } },
          // 5. Special super admin aliases
          ...(isAdminAlias
            ? [
                { username: 'admin' },
                { username: '198801152010011002' },
                { pegawai: { nip: '198801152010011002' } },
              ]
            : []),
        ],
      },
      include: {
        pegawai: true,
      },
    });

    if (!user || !verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Username / NIP atau kata sandi salah');
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

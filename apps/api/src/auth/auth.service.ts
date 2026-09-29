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
    const existingAdmin = await this.prisma.user.findUnique({
      where: { username: 'admin_setda' },
    });

    if (!existingAdmin) {
      await this.prisma.user.create({
        data: {
          username: 'admin_setda',
          name: 'Administrator SI-SPD Sekda Kab. Banggai Laut',
          email: 'admin.spd@banggailautkab.go.id',
          password: hashPassword('admin123'),
          role: Role.ADMIN,
        },
      });
      console.log('Seeded default user: admin_setda (password: admin123)');
    }

    const existingStaff = await this.prisma.user.findUnique({
      where: { username: 'staff_setda' },
    });

    if (!existingStaff) {
      await this.prisma.user.create({
        data: {
          username: 'staff_setda',
          name: 'Staff Administrasi SPD Sekda Kab. Banggai Laut',
          email: 'staff.spd@banggailautkab.go.id',
          password: hashPassword('staff123'),
          role: Role.STAFF,
        },
      });
      console.log('Seeded default user: staff_setda (password: staff123)');
    }
  }

  async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Username atau kata sandi salah');
    }

    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = signJwt(tokenPayload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as RoleType,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }
}

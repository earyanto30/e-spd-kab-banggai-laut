import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { hashPassword } from './crypto.util';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@si-setda/shared-types';

describe('AuthService', () => {
  const password = 'secretpassword';
  const hashedPassword = hashPassword(password);

  const mockUser = {
    id: 'user-1',
    username: '198801152010011002',
    name: 'Fadli A. Arsad',
    role: Role.SUPER_ADMIN,
    password: hashedPassword,
    email: 'admin@banggaikab.go.id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    pegawaiId: 'pegawai-1',
    pegawai: {
      id: 'pegawai-1',
      nip: '198801152010011002',
      nama: 'Fadli A. Arsad, S.STP',
      jabatan: 'Sekretaris Daerah',
      isPenandatangan: true,
    },
  };

  it('authenticates successfully with valid credentials and resolves pegawai profile', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(mockUser),
      },
    } as any;

    const authService = new AuthService(prisma);
    const result = await authService.login({
      username: '198801152010011002',
      password,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.name).toBe('Fadli A. Arsad, S.STP');
    expect(result.user.role).toBe(Role.SUPER_ADMIN);
    expect(result.user.isPenandatangan).toBe(true);
    expect(prisma.user.findFirst).toHaveBeenCalled();
  });

  it('supports admin aliases and trims input spaces', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(mockUser),
      },
    } as any;

    const authService = new AuthService(prisma);
    const result = await authService.login({
      username: '  admin  ',
      password,
    });

    expect(result.accessToken).toBeDefined();
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { username: 'admin' },
            { username: '198801152010011002' },
          ]),
        }),
      }),
    );
  });

  it('throws UnauthorizedException on invalid password or user not found', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const authService = new AuthService(prisma);
    await expect(
      authService.login({ username: 'unknown', password: 'wrongpassword' }),
    ).rejects.toThrow(UnauthorizedException);

    // With user found but wrong password
    prisma.user.findFirst.mockResolvedValueOnce(mockUser);
    await expect(
      authService.login({ username: 'admin', password: 'wrongpassword' }),
    ).rejects.toThrow('Username / NIP atau kata sandi salah');
  });

  it('throws UnauthorizedException when account is inactive', async () => {
    const inactiveUser = { ...mockUser, isActive: false };
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(inactiveUser),
      },
    } as any;

    const authService = new AuthService(prisma);
    await expect(
      authService.login({ username: 'admin', password }),
    ).rejects.toThrow('Akun pengguna tidak aktif');
  });
});

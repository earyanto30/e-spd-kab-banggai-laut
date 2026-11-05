import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service';
import { Role } from '@si-setda/shared-types';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('UsersService', () => {
  const mockUser = {
    id: 'u1',
    username: 'admin',
    name: 'Administrator',
    role: Role.SUPER_ADMIN,
    email: 'admin@banggai.go.id',
    isActive: true,
    pegawaiId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    pegawai: null,
  };

  it('filters users by query, role, and active status', async () => {
    const findMany = vi.fn().mockResolvedValue([mockUser]);
    const prisma = { user: { findMany } } as any;

    const service = new UsersService(prisma);
    const result = await service.findAll('admin', Role.SUPER_ADMIN, 'true');

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: Role.SUPER_ADMIN,
          isActive: true,
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('creates user with hashed password and checks username conflict', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn(async ({ data }) => ({ ...mockUser, ...data, id: 'u2' })),
      },
    } as any;

    const service = new UsersService(prisma);
    const created = await service.create({
      username: 'newuser',
      password: 'password123',
      name: 'New User',
      role: Role.STAFF,
      isActive: true,
    });

    expect(created.id).toBe('u2');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'newuser',
          role: Role.STAFF,
        }),
      }),
    );
  });

  it('rejects duplicate username on user creation', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValueOnce(mockUser),
      },
    } as any;

    const service = new UsersService(prisma);
    await expect(
      service.create({
        username: 'admin',
        password: 'password123',
        name: 'Admin Duplicate',
        role: Role.ADMIN,
        isActive: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('protects the last active SUPER_ADMIN from demotion or deactivation', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(mockUser),
        count: vi.fn().mockResolvedValue(0), // no other active super admins
      },
    } as any;

    const service = new UsersService(prisma);

    // Demotion attempt
    await expect(
      service.update('u1', { role: Role.USER }),
    ).rejects.toThrow(BadRequestException);

    // Deactivation attempt
    await expect(
      service.update('u1', { isActive: false }),
    ).rejects.toThrow(BadRequestException);

    // Deletion attempt
    await expect(service.delete('u1')).rejects.toThrow(BadRequestException);
  });

  it('protects primary default admin and last active SUPER_ADMIN from deletion', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(mockUser), // username is 'admin'
        count: vi.fn().mockResolvedValue(2),
      },
    } as any;

    const service = new UsersService(prisma);
    await expect(service.delete('u1')).rejects.toThrow('Akun Super Admin Utama');
  });

  it('updates user password and finds unlinked pegawai', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn(async ({ data }) => ({ ...mockUser, ...data })),
      },
      pegawai: {
        findMany: vi.fn().mockResolvedValue([{ id: 'p1', nama: 'Pegawai Tanpa User' }]),
      },
    } as any;

    const service = new UsersService(prisma);
    const updated = await service.update('u1', { password: 'newpassword123' });
    expect(updated).toBeDefined();

    const unlinked = await service.getUnlinkedPegawai();
    expect(unlinked).toHaveLength(1);
  });
});

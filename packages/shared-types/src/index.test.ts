import { describe, expect, it } from 'vitest';
import {
  CreateSpdSchema,
  CreateSuratTugasSchema,
  CreateUserSchema,
  LoginRequestSchema,
  Role,
  RoleHierarchy,
  hasRequiredRole,
} from './index';

describe('RBAC and shared schemas', () => {
  it('matches roles exactly and exposes the intended hierarchy', () => {
    expect(RoleHierarchy[Role.SUPER_ADMIN]).toBeGreaterThan(RoleHierarchy[Role.ADMIN]);
    expect(hasRequiredRole(Role.ADMIN, [Role.ADMIN, Role.SUPER_ADMIN])).toBe(true);
    expect(hasRequiredRole(Role.USER, [Role.ADMIN])).toBe(false);
  });

  it('validates login and applies user defaults', () => {
    expect(LoginRequestSchema.safeParse({ username: 'ab', password: 'secret' }).success).toBe(false);
    expect(LoginRequestSchema.safeParse({ username: 'admin', password: 'secret' }).success).toBe(true);

    const user = CreateUserSchema.parse({ username: 'admin', password: 'secret', name: 'Admin' });
    expect(user.role).toBe(Role.USER);
    expect(user.isActive).toBe(true);
  });

  it('validates SPD constraints and required Surat Tugas executors', () => {
    const baseSpd = {
      pemberiPerintah: 'Sekda',
      pegawaiId: 'pegawai-1',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
      lamaHari: 0,
    };
    expect(CreateSpdSchema.safeParse(baseSpd).success).toBe(false);
    expect(CreateSpdSchema.safeParse({ ...baseSpd, lamaHari: 2 }).success).toBe(true);
    expect(CreateSuratTugasSchema.safeParse({ dalamRangka: 'Dinas', pegawaiIds: [] }).success).toBe(false);
    expect(CreateSuratTugasSchema.safeParse({ dalamRangka: 'Dinas', pegawaiIds: ['pegawai-1'] }).success).toBe(true);
  });
});

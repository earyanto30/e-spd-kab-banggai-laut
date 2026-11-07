import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SystemService } from './system.service';

describe('SystemService', () => {
  let service: SystemService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      pegawai: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      jabatan: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };
    service = new SystemService(prisma);
  });

  it('returns false for onboarding status when setting is not found', async () => {
    prisma.systemSetting.findUnique.mockResolvedValue(null);
    prisma.pegawai.findMany.mockResolvedValue([]);

    const status = await service.getStatus();
    expect(status.isOnboardingCompleted).toBe(false);
    expect(status.hasKpa).toBe(false);
    expect(status.hasPa).toBe(false);
  });

  it('completes onboarding by updating admin password, setting KPA and PA, and marking completed', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u-admin', username: 'admin' });
    prisma.jabatan.findFirst
      .mockResolvedValueOnce({ id: 'j-kabag', nama: 'Kepala Bagian Umum' })
      .mockResolvedValueOnce({ id: 'j-sekda', nama: 'Sekretaris Daerah' });

    prisma.pegawai.upsert
      .mockResolvedValueOnce({ id: 'p-kpa', nama: 'Pejabat KPA' })
      .mockResolvedValueOnce({ id: 'p-pa', nama: 'Pejabat PA' });

    const result = await service.completeOnboarding({
      adminPassword: 'newsecurepassword',
      kpa: {
        nama: 'Ahmad KPA, S.STP',
        nip: '19800101 200501 1 001',
        pangkat: 'Pembina',
        golongan: 'IV/a',
        jabatan: 'Kepala Bagian Umum',
        unitKerja: 'Bagian Umum Sekretariat Daerah',
      },
      pa: {
        nama: 'Drs. Budi Sekda, M.Si',
        nip: '19750101 199901 1 002',
        pangkat: 'Pembina Utama Madya',
        golongan: 'IV/d',
        jabatan: 'Sekretaris Daerah',
        unitKerja: 'Sekretariat Daerah',
      },
    });

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.pegawai.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: 'onboarding_completed' },
      update: { value: 'true' },
      create: { key: 'onboarding_completed', value: 'true' },
    });
  });
});

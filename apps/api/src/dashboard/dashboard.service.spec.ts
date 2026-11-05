import { describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  it('computes KPIs, monthly trends, and destination categories', async () => {
    const spdCount = vi.fn().mockImplementation(({ where } = {}) => {
      if (where?.status === 'DISETUJUI') return 8;
      return 15;
    });

    const stCount = vi.fn().mockResolvedValue(10);
    const pegawaiCount = vi.fn().mockResolvedValue(25);

    const spdFindMany = vi.fn().mockImplementation((args) => {
      if (args?.take === 5) {
        return [
          {
            id: 'spd-1',
            nomorSpd: '001/SPD/2026',
            tempatTujuan: 'Palu',
            tanggalBerangkat: new Date('2026-05-01'),
            lamaHari: 3,
            status: 'DISETUJUI',
            createdAt: new Date('2026-05-01'),
            pegawai: { nama: 'Budi', nip: '123' },
          },
        ];
      }
      return [
        { id: '1', tempatTujuan: 'Banggai Laut', alatAngkut: 'Speedboat Pemda', lamaHari: 2 },
        { id: '2', tempatTujuan: 'Jakarta', alatAngkut: 'Pesawat Udara', lamaHari: 4 },
        { id: '3', tempatTujuan: 'Luwuk', alatAngkut: 'Kapal Laut / Feri', lamaHari: 1 },
      ];
    });

    const prisma = {
      spd: {
        count: spdCount,
        findMany: spdFindMany,
      },
      suratTugas: {
        count: stCount,
      },
      pegawai: {
        count: pegawaiCount,
      },
    } as unknown as PrismaService;

    const service = new DashboardService(prisma);
    const stats = await service.getStats();

    expect(stats.kpi.totalSpd).toBe(15);
    expect(stats.kpi.spdActive).toBe(8);
    expect(stats.kpi.totalPegawai).toBe(25);
    expect(stats.monthlyStats.months).toHaveLength(6);
    expect(stats.transportModes.labels).toContain('Pesawat Udara');
    expect(stats.topDestinations.labels).toBeDefined();
    expect(stats.recentSpd).toHaveLength(1);
    expect(stats.recentSpd[0].nomor).toBe('001/SPD/2026');
  });
});

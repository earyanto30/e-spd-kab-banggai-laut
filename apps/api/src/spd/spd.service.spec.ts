import { describe, expect, it, vi } from 'vitest';
import { SpdService } from './spd.service';

const pegawai = { id: 'p1', nama: 'Budi', nip: '123', pangkat: 'III/c', golongan: 'III/c', jabatan: 'Staf' };

describe('SpdService', () => {
  it('generates a numbered SPD and calculates return date', async () => {
    const created = vi.fn(async (args) => args.data);
    const prisma = {
      pegawai: { findUnique: vi.fn().mockResolvedValue(pegawai) },
      spd: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
        create: created,
      },
    } as any;

    const result = await new SpdService(prisma).create({
      pemberiPerintah: 'Sekda',
      pegawaiId: 'p1',
      dalamRangka: ' Dinas ',
      alatAngkut: ' Mobil ',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
      lamaHari: 3,
      tanggalBerangkat: '2026-01-10',
    });

    expect(result.nomorSpd).toBe('001/SPD/2026');
    expect(result.tanggalKembali).toEqual(new Date('2026-01-12'));
    expect(created).toHaveBeenCalled();
  });

  it('increments the generated sequence when the first number collides', async () => {
    const prisma = {
      pegawai: { findUnique: vi.fn().mockResolvedValue(pegawai) },
      spd: {
        count: vi.fn().mockResolvedValue(4),
        findUnique: vi.fn().mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null),
        create: vi.fn(async (args) => args.data),
      },
    } as any;

    const result = await new SpdService(prisma).create({
      pemberiPerintah: 'Kuasa Pengguna Anggaran',
      pegawaiId: 'p1',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    });

    expect(result.nomorSpd).toBe('KPA006/SPD/2026');
  });

  it('builds status, date, and search filters', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { spd: { findMany } } as any;
    await new SpdService(prisma).findAll('Budi', 'DRAFT', '2026-01-01', '2026-01-31');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'DRAFT',
        OR: expect.any(Array),
        tanggalBerangkat: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
      }),
    }));
  });
});

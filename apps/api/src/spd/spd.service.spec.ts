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

  it('rejects missing employees and duplicate manual numbers', async () => {
    const prisma = {
      pegawai: { findUnique: vi.fn().mockResolvedValue(null) },
      spd: { findUnique: vi.fn() },
    } as any;
    await expect(new SpdService(prisma).create({
      nomorSpd: '001/SPD/2026',
      pemberiPerintah: 'Sekda',
      pegawaiId: 'missing',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    })).rejects.toThrow(/Pegawai/);

    prisma.pegawai.findUnique.mockResolvedValue(pegawai);
    prisma.spd.findUnique.mockResolvedValue({ id: 'duplicate' });
    await expect(new SpdService(prisma).create({
      nomorSpd: '001/SPD/2026',
      pemberiPerintah: 'Sekda',
      pegawaiId: 'p1',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    })).rejects.toThrow(/sudah digunakan/);
  });

  it('resolves signatories and linked Surat Tugas data when creating', async () => {
    const signer = { ...pegawai, id: 'signer', nama: 'Signer', nip: '999', golongan: '' };
    const create = vi.fn(async ({ data }: any) => data);
    const prisma = {
      pegawai: {
        findUnique: vi.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(where.id === 'signer' ? signer : pegawai)
        ),
      },
      suratTugas: {
        findUnique: vi.fn().mockResolvedValue({
          penandatanganId: 'st-signer',
          penandatanganNama: 'ST Signer',
          penandatanganJabatan: 'Kepala',
          penandatanganPangkat: 'IV/a',
          penandatanganNip: '888',
        }),
      },
      spd: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as any;

    await new SpdService(prisma).create({
      nomorSpd: ' /SPD/2026',
      pemberiPerintah: 'Sekda',
      pegawaiId: 'p1',
      penandatanganId: 'signer',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    });
    expect(create.mock.calls[0][0].data.penandatanganNama).toBe('Signer');

    await new SpdService(prisma).create({
      nomorSpd: '002/SPD/2026',
      pemberiPerintah: 'Sekda',
      pegawaiId: 'p1',
      suratTugasId: 'st1',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    });
    expect(create.mock.calls[1][0].data.penandatanganNama).toBe('ST Signer');
  });

  it('finds, updates, deletes, and bulk deletes SPD records', async () => {
    const existing = {
      id: 'spd1',
      nomorSpd: '001/SPD/2026',
      pegawaiId: 'p1',
      suratTugasId: 'st1',
      tanggalBerangkat: new Date('2026-01-01'),
      lamaHari: 2,
    };
    const prisma = {
      spd: {
        findUnique: vi.fn().mockResolvedValue(existing),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ ...existing, status: 'SELESAI' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      suratTugas: { update: vi.fn() },
    } as any;
    const service = new SpdService(prisma);

    expect(await service.findById('spd1')).toBe(existing);
    expect(await service.updateStatus('spd1', ' SELESAI ')).toMatchObject({ status: 'SELESAI' });
    expect(await service.update('spd1', {
      dalamRangka: '1. Dinas\n2. Rapat',
      tempatBerangkat: ' Luwuk ',
      tempatTujuan: ' Banggai ',
      alatAngkut: ' Mobil ',
      lamaHari: 3,
      tanggalBerangkat: '2026-01-03',
      penandatanganId: '',
    })).toBeTruthy();
    expect(prisma.suratTugas.update).toHaveBeenCalled();
    expect(prisma.spd.updateMany).toHaveBeenCalled();
    expect(await service.delete('spd1')).toEqual({ success: true, message: expect.stringContaining('dihapus') });
    expect(await service.bulkDelete([])).toMatchObject({ count: 0 });
    expect(await service.bulkDelete(['spd1', 'spd2'])).toMatchObject({ count: 2 });
  });

  it('rejects missing records and duplicate update numbers', async () => {
    const prisma = {
      spd: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn(),
      },
    } as any;
    const service = new SpdService(prisma);
    await expect(service.findById('missing')).rejects.toThrow(/tidak ditemukan/);

    prisma.spd.findUnique.mockResolvedValue({ id: 'spd1', nomorSpd: '001/SPD/2026', pegawaiId: 'p1' });
    prisma.spd.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.update('spd1', { nomorSpd: '002/SPD/2026' })).rejects.toThrow(/sudah digunakan/);
  });
});

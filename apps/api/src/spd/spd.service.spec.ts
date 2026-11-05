import { describe, expect, it, vi } from 'vitest';
import { SpdService } from './spd.service';
import { PrismaService } from '../prisma/prisma.service';

const pegawai = { id: 'p1', nama: 'Budi', nip: '123', pangkat: 'III/c', golongan: 'III/c', jabatan: 'Staf' };

describe('SpdService', () => {
  it('generates a numbered SPD and calculates return date', async () => {
    const created = vi.fn((args) => args.data);
    const prisma = {
      pegawai: { findUnique: vi.fn().mockResolvedValue(pegawai) },
      spd: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
        create: created,
      },
    } as unknown as PrismaService;

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
        create: vi.fn((args) => args.data),
      },
    } as unknown as PrismaService;

    const result = await new SpdService(prisma).create({
      pemberiPerintah: 'Kuasa Pengguna Anggaran',
      pegawaiId: 'p1',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    });

    expect(result.nomorSpd).toBe('KPA/006/SPD/2026');
  });

  it('builds status, date, and search filters', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { spd: { findMany } } as unknown as PrismaService;
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
    const findUniquePegawai = vi.fn().mockResolvedValue(null);
    const findUniqueSpd = vi.fn();
    const prisma = {
      pegawai: { findUnique: findUniquePegawai },
      spd: { findUnique: findUniqueSpd },
    } as unknown as PrismaService;
    await expect(new SpdService(prisma).create({
      nomorSpd: '001/SPD/2026',
      pemberiPerintah: 'Sekda',
      pegawaiId: 'missing',
      dalamRangka: 'Dinas',
      alatAngkut: 'Mobil',
      tempatBerangkat: 'Banggai',
      tempatTujuan: 'Luwuk',
    })).rejects.toThrow(/Pegawai/);

    findUniquePegawai.mockResolvedValue(pegawai);
    findUniqueSpd.mockResolvedValue({ id: 'duplicate' });
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
    const create = vi.fn(({ data }: { data: { penandatanganNama?: string; [k: string]: unknown } }) => data);
    const prisma = {
      pegawai: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === 'signer' ? signer : pegawai)
        ),
      },
      suratTugas: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === 'st-draft') {
            return Promise.resolve({
              id: 'st-draft',
              status: 'DRAFT',
              penandatanganNama: 'Draft Signer',
            });
          }
          return Promise.resolve({
            id: 'st1',
            status: 'DISETUJUI',
            penandatanganId: 'st-signer',
            penandatanganNama: 'ST Signer',
            penandatanganJabatan: 'Kepala',
            penandatanganPangkat: 'IV/a',
            penandatanganNip: '888',
          });
        }),
      },
      spd: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;

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

    await expect(
      new SpdService(prisma).create({
        nomorSpd: '003/SPD/2026',
        pemberiPerintah: 'Sekda',
        pegawaiId: 'p1',
        suratTugasId: 'st-draft',
        dalamRangka: 'Dinas',
        alatAngkut: 'Mobil',
        tempatBerangkat: 'Banggai',
        tempatTujuan: 'Luwuk',
      }),
    ).rejects.toThrow('Surat Perjalanan Dinas (SPD) hanya dapat dibuat untuk Surat Tugas yang telah disetujui (status DISETUJUI).');
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
    } as unknown as PrismaService;
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
    const findUnique = vi.fn().mockResolvedValue(null);
    const findFirst = vi.fn();
    const prisma = {
      spd: {
        findUnique,
        findFirst,
      },
    } as unknown as PrismaService;
    const service = new SpdService(prisma);
    await expect(service.findById('missing')).rejects.toThrow(/tidak ditemukan/);

    findUnique.mockResolvedValue({ id: 'spd1', nomorSpd: '001/SPD/2026', pegawaiId: 'p1' });
    findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.update('spd1', { nomorSpd: '002/SPD/2026' })).rejects.toThrow(/sudah digunakan/);
  });

  it('checks number availability correctly for single and multiple records', async () => {
    const prisma = {
      spd: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: 'spd1', nomorSpd: 'KPA/031/SPD/2026' })
          .mockResolvedValueOnce(null),
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: 'spd2', nomorSpd: 'KPA/032/SPD/2026' }])
          .mockResolvedValueOnce([]),
      },
    } as unknown as PrismaService;
    const service = new SpdService(prisma);

    // Single check taken
    const taken = await service.checkNumberAvailability('KPA/031/SPD/2026');
    expect(taken.available).toBe(false);
    expect(taken.message).toContain('sudah digunakan');

    // Single check available
    const available = await service.checkNumberAvailability('KPA/999/SPD/2026');
    expect(available.available).toBe(true);

    // Multiple check with one conflict
    const multiConflict = await service.checkNumberAvailability('KPA/031/SPD/2026', undefined, 3);
    expect(multiConflict.available).toBe(false);
    expect(multiConflict.message).toContain('sudah digunakan');

    // Multiple check all available
    const multiAvailable = await service.checkNumberAvailability('KPA/050/SPD/2026', undefined, 3);
    expect(multiAvailable.available).toBe(true);
  });

  it('automatically sets SPD and Surat Tugas status to SELESAI upon saving laporan', async () => {
    const spdUpdate = vi.fn().mockResolvedValue({ id: 'spd1', status: 'SELESAI' });
    const stUpdate = vi.fn().mockResolvedValue({ id: 'st1', status: 'SELESAI' });
    const prisma = {
      spd: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'spd1',
          nomorSpd: '001/SPD/2026',
          suratTugasId: 'st1',
          pegawai: { id: 'p1', nama: 'Budi' },
        }),
        update: spdUpdate,
        findMany: vi.fn().mockResolvedValue([]),
      },
      suratTugas: {
        update: stUpdate,
      },
      laporanPerjalanan: {
        upsert: vi.fn().mockResolvedValue({
          id: 'lap1',
          spdId: 'spd1',
          suratTugasId: 'st1',
          hasilPerjalanan: 'Hasil rapat',
          penandatangan: 'Kepala Bagian',
        }),
      },
    } as unknown as PrismaService;
    const service = new SpdService(prisma);

    const result = await service.saveLaporan('spd1', {
      hasilPerjalanan: 'Hasil rapat',
      penandatangan: 'Kepala Bagian',
    });

    expect(result.id).toBe('lap1');
    expect(spdUpdate).toHaveBeenCalledWith({
      where: { id: 'spd1' },
      data: { status: 'SELESAI' },
    });
    expect(stUpdate).toHaveBeenCalledWith({
      where: { id: 'st1' },
      data: { status: 'SELESAI' },
    });
  });

  it('reverts SPD and Surat Tugas status to DISETUJUI upon deleting laporan', async () => {
    const spdUpdate = vi.fn().mockResolvedValue({ id: 'spd1', status: 'DISETUJUI' });
    const stUpdate = vi.fn().mockResolvedValue({ id: 'st1', status: 'DISETUJUI' });
    const prisma = {
      laporanPerjalanan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'lap1',
          spdId: 'spd1',
          suratTugasId: 'st1',
        }),
        delete: vi.fn().mockResolvedValue({ id: 'lap1' }),
      },
      spd: {
        update: spdUpdate,
      },
      suratTugas: {
        update: stUpdate,
      },
    } as unknown as PrismaService;
    const service = new SpdService(prisma);

    await service.deleteLaporan('spd1');
    expect(spdUpdate).toHaveBeenCalledWith({
      where: { id: 'spd1' },
      data: { status: 'DISETUJUI' },
    });
    expect(stUpdate).toHaveBeenCalledWith({
      where: { id: 'st1' },
      data: { status: 'DISETUJUI' },
    });
  });
});

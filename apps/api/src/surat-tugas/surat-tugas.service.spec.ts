import { describe, expect, it, vi } from 'vitest';
import { SuratTugasService } from './surat-tugas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SuratTugasService', () => {
  it('creates a numbered assignment with serialized executors', async () => {
    const created = vi.fn().mockResolvedValue({ id: 'st1' });
    const prisma = {
      suratTugas: {
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          id: 'st1',
          pegawaiIds: JSON.stringify(['p1']),
          spdList: [],
        }),
        create: created,
      },
      pegawai: {
        findMany: vi.fn().mockResolvedValue([{ id: 'p1', nama: 'Budi' }]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const result = await new SuratTugasService(prisma).create({
      dalamRangka: 'Dinas',
      pegawaiIds: ['p1'],
    });

    expect(created.mock.calls[0][0].data.nomorSurat).toMatch(/^000\.1\.2\.3\/001\/Bag\.Umum\/\d{4}$/);
    expect(created.mock.calls[0][0].data.pegawaiIds).toBe('["p1"]');
    expect(result.id).toBe('st1');
  });

  it('filters assignments and resolves stored employee IDs', async () => {
    const item = {
      id: 'st1',
      pegawaiIds: JSON.stringify(['p1']),
      spdList: [],
    };
    const prisma = {
      pegawai: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: 'p1' }])
          .mockResolvedValueOnce([{ id: 'p1', nama: 'Budi' }]),
      },
      suratTugas: { findMany: vi.fn().mockResolvedValue([item]) },
    } as unknown as PrismaService;
    const result = await new SuratTugasService(prisma).findAll('Budi', 'DRAFT', '2026-01-01', '2026-01-31');
    expect(result[0].pegawaiList).toEqual([{ id: 'p1', nama: 'Budi' }]);
    expect(prisma.suratTugas.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'DRAFT', OR: expect.any(Array) }),
    }));
  });

  it('updates Surat Tugas and synchronizes existing SPD personnel', async () => {
    const existing = {
      id: 'st1',
      nomorSurat: '001',
      dalamRangka: 'Old',
      tempatDikeluarkan: 'Banggai',
      tanggalSurat: new Date('2026-01-01'),
      pegawaiIds: JSON.stringify(['p1']),
      spdList: [{ id: 'spd1', pegawaiId: 'p1' }],
    };
    const updated = { ...existing, dalamRangka: 'New', pegawaiIds: JSON.stringify(['p1', 'p2']) };
    const prisma = {
      suratTugas: {
        findUnique: vi.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(updated),
        update: vi.fn().mockResolvedValue(updated),
      },
      spd: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ id: 'spd1', pegawaiId: 'p1' }])
          .mockResolvedValueOnce([{ id: 'spd1', pegawaiId: 'p1' }]),
        updateMany: vi.fn(),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      pegawai: { findUnique: vi.fn().mockResolvedValue({ id: 'p2' }) },
    } as unknown as PrismaService;

    const result = await new SuratTugasService(prisma).update('st1', {
      dalamRangka: '1. New\n2. Briefing',
      tempatDikeluarkan: 'Luwuk',
      pegawaiIds: ['p1', 'p2'],
      status: 'DISETUJUI',
    });
    expect(result.id).toBe('st1');
    expect(prisma.spd.updateMany).toHaveBeenCalled();
    expect(prisma.spd.create).toHaveBeenCalled();
  });

  it('updates status, handles missing records, and deletes assignments', async () => {
    const item = { id: 'st1', pegawaiIds: null, spdList: [{ pegawai: { id: 'p1' } }] };
    const findUnique = vi.fn().mockResolvedValue(item);
    const prisma = {
      suratTugas: {
        findUnique,
        update: vi.fn().mockResolvedValue(item),
        delete: vi.fn().mockResolvedValue(item),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      spd: {
        deleteMany: vi.fn(),
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as PrismaService;
    const service = new SuratTugasService(prisma);
    expect(await service.findById('st1')).toMatchObject({ pegawaiList: [{ id: 'p1' }] });
    expect(await service.updateStatus('st1', ' SELESAI ')).toBe(item);
    expect(await service.deleteAllSpd('st1')).toMatchObject({ count: 2 });
    expect(await service.delete('st1')).toBe(item);
    expect(await service.bulkDelete([])).toMatchObject({ count: 0 });
    expect(await service.bulkDelete(['st1'])).toMatchObject({ count: 2 });

    findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(/tidak ditemukan/);
  });

  it('generates SPD documents for all assigned employees', async () => {
    const suratTugas = {
      id: 'st1',
      nomorSurat: '001',
      status: 'DISETUJUI',
      pegawaiIds: JSON.stringify(['p1', 'p2']),
      tanggalSurat: new Date('2026-01-01'),
      tempatDikeluarkan: 'Banggai',
      dalamRangka: 'Dinas',
      penandatanganId: null,
      penandatanganNama: 'Signer',
      penandatanganJabatan: 'Kepala',
      penandatanganPangkat: 'IV/a',
      penandatanganNip: '999',
      kopSuratId: null,
      spdList: [],
    };
    const create = vi.fn(({ data }: { data: { nomorSpd?: string; alatAngkut?: string; [k: string]: unknown } }) => data);
    const prisma = {
      suratTugas: { findUnique: vi.fn().mockResolvedValue(suratTugas) },
      pegawai: {
        findMany: vi.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      },
      spd: {
        findMany: vi.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 'spd1' }, { id: 'spd2' }]),
        count: vi.fn().mockResolvedValue(0),
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;
    const result = await new SuratTugasService(prisma).generateSpd('st1', {
      pemberiPerintah: 'Kuasa Pengguna Anggaran',
      alatAngkut: ['Mobil', 'Pesawat'],
      tanggalBerangkat: '2026-01-10',
      lamaHari: 3,
    });
    expect(result.count).toBe(2);
    expect(create.mock.calls[0][0].data.nomorSpd).toBe('KPA/001/SPD/2026');
    expect(create.mock.calls[0][0].data.alatAngkut).toBe('Mobil, Pesawat');
  });

  it('returns existing SPD and supports custom numbering updates', async () => {
    const suratTugas = {
      id: 'st1',
      nomorSurat: '001',
      status: 'DISETUJUI',
      pegawaiIds: JSON.stringify(['p1']),
      tanggalSurat: new Date('2026-01-01'),
      tempatDikeluarkan: 'Banggai',
      dalamRangka: 'Dinas',
      penandatanganId: null,
      penandatanganNama: null,
      penandatanganJabatan: null,
      penandatanganPangkat: null,
      penandatanganNip: null,
      spdList: [],
    };
    const existing = [{ id: 'spd1', pegawaiId: 'p1', nomorSpd: '001/SPD/2026' }];
    const update = vi.fn(({ data }: { data: Record<string, unknown> }) => ({ ...existing[0], ...data }));
    const prisma = {
      suratTugas: { findUnique: vi.fn().mockResolvedValue(suratTugas) },
      pegawai: { findMany: vi.fn().mockResolvedValue([{ id: 'p1' }]) },
      spd: {
        findMany: vi.fn().mockResolvedValue(existing),
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
    } as unknown as PrismaService;
    const service = new SuratTugasService(prisma);
    expect((await service.generateSpd('st1')).count).toBe(1);
    const result = await service.generateSpd('st1', {
      nomorSpdMode: 'custom',
      customPrefix: 'KPA',
      customSeq: '007',
      tahunSpd: 2027,
    });
    expect(result.count).toBe(1);
    expect(update.mock.calls[0][0].data.nomorSpd).toBe('KPA/007/SPD/2027');
  });

  it('rejects generateSpd if Surat Tugas is not DISETUJUI', async () => {
    const draftSuratTugas = {
      id: 'st-draft',
      nomorSurat: '002',
      status: 'DRAFT',
      pegawaiIds: JSON.stringify(['p1']),
      tanggalSurat: new Date('2026-01-01'),
      spdList: [],
    };
    const prisma = {
      suratTugas: { findUnique: vi.fn().mockResolvedValue(draftSuratTugas) },
    } as unknown as PrismaService;
    const service = new SuratTugasService(prisma);
    await expect(service.generateSpd('st-draft')).rejects.toThrow(
      'Surat Perjalanan Dinas (SPD) hanya dapat diterbitkan untuk Surat Tugas yang telah disetujui (status DISETUJUI).',
    );
  });

  it('checks number availability correctly', async () => {
    const prisma = {
      suratTugas: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: 'st1', nomorSurat: '000.1.2.3/001/Bag.Umum/2026' })
          .mockResolvedValueOnce(null),
      },
    } as unknown as PrismaService;
    const service = new SuratTugasService(prisma);

    const taken = await service.checkNumberAvailability('000.1.2.3/001/Bag.Umum/2026');
    expect(taken.available).toBe(false);
    expect(taken.message).toContain('sudah digunakan');

    const available = await service.checkNumberAvailability('000.1.2.3/999/Bag.Umum/2026');
    expect(available.available).toBe(true);
    expect(available.message).toBe('Nomor surat tersedia');

    const placeholder = await service.checkNumberAvailability('000.1.2.3/[Otomatis]/Bag.Umum/2026');
    expect(placeholder.available).toBe(true);
    expect(placeholder.isPlaceholder).toBe(true);
  });
});

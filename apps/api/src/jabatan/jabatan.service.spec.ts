import { describe, expect, it, vi } from 'vitest';
import { JabatanService } from './jabatan.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

describe('JabatanService', () => {
  const mockJabatan = {
    id: 'j1',
    nama: 'Sekretaris Daerah',
    keterangan: 'Eselon II.a',
    urutan: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    pegawaiList: [],
    _count: { pegawaiList: 0 },
  };

  it('retrieves all jabatan sorted by urutan and nama', async () => {
    const findMany = vi.fn().mockResolvedValue([mockJabatan]);
    const prisma = { jabatan: { findMany } } as unknown as PrismaService;

    const service = new JabatanService(prisma);
    const result = await service.findAll('Sekda');

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
      }),
    );
  });

  it('creates a new jabatan and enforces unique name', async () => {
    const prisma = {
      jabatan: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockJabatan),
        create: vi.fn(({ data }) => ({ ...mockJabatan, ...data })),
      },
    } as unknown as PrismaService;

    const service = new JabatanService(prisma);
    const created = await service.create({
      nama: 'Kepala Dinas',
      keterangan: 'Eselon II.b',
      urutan: 2,
    });
    expect(created.nama).toBe('Kepala Dinas');

    // Duplicate attempt
    await expect(
      service.create({ nama: 'Sekretaris Daerah', urutan: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('syncs linked pegawai when jabatan name is updated', async () => {
    const prisma = {
      jabatan: {
        findUnique: vi.fn().mockResolvedValue(mockJabatan),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ ...mockJabatan, nama: 'Sekretaris Baru' }),
      },
      pegawai: {
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as unknown as PrismaService;

    const service = new JabatanService(prisma);
    const updated = await service.update('j1', { nama: 'Sekretaris Baru' });

    expect(updated.nama).toBe('Sekretaris Baru');
    expect(prisma.pegawai.updateMany).toHaveBeenCalledWith({
      where: { jabatanId: 'j1' },
      data: { jabatan: 'Sekretaris Baru' },
    });
  });

  it('unlinks pegawai and deletes jabatan on remove', async () => {
    const prisma = {
      jabatan: {
        findUnique: vi.fn().mockResolvedValue(mockJabatan),
        delete: vi.fn().mockResolvedValue(mockJabatan),
      },
      pegawai: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;

    const service = new JabatanService(prisma);
    const result = await service.remove('j1');

    expect(result.success).toBe(true);
    expect(prisma.pegawai.updateMany).toHaveBeenCalledWith({
      where: { jabatanId: 'j1' },
      data: { jabatanId: null },
    });
    expect(prisma.jabatan.delete).toHaveBeenCalledWith({ where: { id: 'j1' } });
  });

  it('throws NotFoundException when jabatan does not exist', async () => {
    const prisma = {
      jabatan: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new JabatanService(prisma);
    await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    await expect(service.update('unknown', { nama: 'Test' })).rejects.toThrow(NotFoundException);
  });
});

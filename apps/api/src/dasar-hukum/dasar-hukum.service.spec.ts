import { describe, expect, it, vi } from 'vitest';
import { DasarHukumService } from './dasar-hukum.service';
import { NotFoundException } from '@nestjs/common';

describe('DasarHukumService', () => {
  const mockDasarHukum = {
    id: 'dh1',
    judul: 'Perbup No. 12 Tahun 2024',
    isi: 'Tentang Standar Biaya Masukan',
    urutan: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('filters legal bases by search query and sorts by urutan', async () => {
    const findMany = vi.fn().mockResolvedValue([mockDasarHukum]);
    const prisma = { dasarHukum: { findMany } } as any;

    const service = new DasarHukumService(prisma);
    const result = await service.findAll('Standar Biaya');

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { judul: { contains: 'Standar Biaya' } },
            { isi: { contains: 'Standar Biaya' } },
          ],
        }),
        orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('creates and updates dasar hukum entries', async () => {
    const prisma = {
      dasarHukum: {
        findUnique: vi.fn().mockResolvedValue(mockDasarHukum),
        create: vi.fn(async ({ data }) => ({ ...mockDasarHukum, ...data })),
        update: vi.fn(async ({ data }) => ({ ...mockDasarHukum, ...data })),
      },
    } as any;

    const service = new DasarHukumService(prisma);
    const created = await service.create({
      judul: '  UU No. 23 Tahun 2014  ',
      isi: '  Pemerintahan Daerah  ',
      urutan: 2,
    });
    expect(created.judul).toBe('UU No. 23 Tahun 2014');

    const updated = await service.update('dh1', {
      judul: 'Updated Title',
    });
    expect(updated.judul).toBe('Updated Title');
  });

  it('throws NotFoundException when entry does not exist', async () => {
    const prisma = {
      dasarHukum: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new DasarHukumService(prisma);
    await expect(service.findById('unknown')).rejects.toThrow(NotFoundException);
    await expect(service.remove('unknown')).rejects.toThrow(NotFoundException);
  });
});

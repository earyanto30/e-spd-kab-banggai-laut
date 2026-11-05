import { describe, expect, it, vi } from 'vitest';
import { KopSuratService } from './kop-surat.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('KopSuratService', () => {
  const mockKop = {
    id: 'kop-1',
    nama: 'Kop Sekda',
    keterangan: 'Resmi Setda',
    fileName: 'kop.pdf',
    storedFileName: 'kop_stored.pdf',
    fileSize: '10 KB',
    paperSize: 'A4',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('retrieves all kop surat records and finds by id', async () => {
    const prisma = {
      kopSurat: {
        findMany: vi.fn().mockResolvedValue([mockKop]),
        findUnique: vi.fn().mockResolvedValue(mockKop),
      },
    } as any;

    const service = new KopSuratService(prisma);
    const all = await service.findAll();
    expect(all).toHaveLength(1);

    const single = await service.findById('kop-1');
    expect(single.nama).toBe('Kop Sekda');

    // Missing ID
    prisma.kopSurat.findUnique.mockResolvedValueOnce(null);
    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('sets a kop surat as default and clears others', async () => {
    const prisma = {
      kopSurat: {
        findUnique: vi.fn().mockResolvedValue(mockKop),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        update: vi.fn().mockResolvedValue({ ...mockKop, isDefault: true }),
      },
    } as any;

    const service = new KopSuratService(prisma);
    const updated = await service.setDefault('kop-1');

    expect(updated.isDefault).toBe(true);
    expect(prisma.kopSurat.updateMany).toHaveBeenCalledWith({
      data: { isDefault: false },
    });
  });

  it('prevents deleting when only 1 kop surat exists', async () => {
    const prisma = {
      kopSurat: {
        count: vi.fn().mockResolvedValue(1),
      },
    } as any;

    const service = new KopSuratService(prisma);
    await expect(service.delete('kop-1')).rejects.toThrow(BadRequestException);
  });
});

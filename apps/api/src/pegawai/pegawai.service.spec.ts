import { describe, expect, it, vi } from 'vitest';
import { PegawaiService } from './pegawai.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PegawaiService', () => {
  const mockPegawai = {
    id: 'p1',
    nip: '198501012010011001',
    nama: 'Ahmad Dahlan',
    pangkat: 'Penata Tk. I',
    golongan: 'III/d',
    jabatan: 'Kepala Bagian Umum',
    jabatanId: 'j1',
    unitKerja: 'Bagian Umum',
    isASN: true,
    isPenandatangan: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('filters employees by keyword, isASN, and isPenandatangan', async () => {
    const findMany = vi.fn().mockResolvedValue([mockPegawai]);
    const prisma = { pegawai: { findMany } } as any;

    const service = new PegawaiService(prisma);
    const result = await service.findAll('Ahmad', 'true', 'true');

    expect(result).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isASN: true,
          isPenandatangan: true,
          OR: expect.arrayContaining([
            { nama: { contains: 'Ahmad' } },
            { nip: { contains: 'Ahmad' } },
          ]),
        }),
      }),
    );
  });

  it('creates employee, auto-resolving jabatanId from matching jabatan name', async () => {
    const prisma = {
      pegawai: {
        findUnique: vi.fn().mockResolvedValueOnce(null),
        create: vi.fn(async ({ data }) => ({ ...mockPegawai, ...data })),
      },
      jabatan: {
        findUnique: vi.fn().mockResolvedValueOnce({ id: 'j1', nama: 'Kepala Bagian Umum' }),
      },
    } as any;

    const service = new PegawaiService(prisma);
    const created = await service.create({
      nip: '198501012010011001',
      nama: 'Ahmad Dahlan',
      pangkat: 'Penata Tk. I',
      golongan: 'III/d',
      jabatan: 'Kepala Bagian Umum',
    });

    expect(created.nip).toBe('198501012010011001');
    expect(prisma.pegawai.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jabatanId: 'j1',
        }),
      }),
    );
  });

  it('throws ConflictException when creating employee with duplicate NIP', async () => {
    const prisma = {
      pegawai: {
        findUnique: vi.fn().mockResolvedValueOnce(mockPegawai),
      },
    } as any;

    const service = new PegawaiService(prisma);
    await expect(
      service.create({
        nip: '198501012010011001',
        nama: 'Ahmad Duplicate',
        pangkat: 'Penata',
        golongan: 'III/c',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates employee fields and handles employee deletion', async () => {
    const prisma = {
      pegawai: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(mockPegawai) // findById for update
          .mockResolvedValueOnce(mockPegawai), // findById for delete
        findFirst: vi.fn().mockResolvedValue(null), // NIP check
        update: vi.fn().mockResolvedValue({ ...mockPegawai, nama: 'Ahmad Updated' }),
        delete: vi.fn().mockResolvedValue(mockPegawai),
      },
    } as any;

    const service = new PegawaiService(prisma);
    const updated = await service.update('p1', { nama: 'Ahmad Updated', nip: '198501012010011002' });
    expect(updated.nama).toBe('Ahmad Updated');

    const deleted = await service.delete('p1');
    expect(deleted.message).toBeDefined();
  });
});

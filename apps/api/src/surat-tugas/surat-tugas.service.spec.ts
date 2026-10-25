import { describe, expect, it, vi } from 'vitest';
import { SuratTugasService } from './surat-tugas.service';

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
    } as any;

    const result = await new SuratTugasService(prisma).create({
      dalamRangka: 'Dinas',
      pegawaiIds: ['p1'],
    });

    expect(created.mock.calls[0][0].data.nomorSurat).toMatch(/^000\.1\.2\.3\/001\/Bag\.Umum\/\d{4}$/);
    expect(created.mock.calls[0][0].data.pegawaiIds).toBe('["p1"]');
    expect(result.id).toBe('st1');
  });
});

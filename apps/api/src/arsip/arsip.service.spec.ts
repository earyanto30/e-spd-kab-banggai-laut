import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ArsipService } from './arsip.service';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasPdfService } from '../surat-tugas/surat-tugas-pdf.service';
import { SpdPdfService } from '../spd/spd-pdf.service';
import { PDFDocument } from 'pdf-lib';

describe('ArsipService', () => {
  let service: ArsipService;
  let prisma: any;
  let suratTugasPdfService: any;
  let spdPdfService: any;

  beforeEach(() => {
    prisma = {
      suratTugas: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      spd: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    suratTugasPdfService = {
      generatePdf: vi.fn(),
    };

    spdPdfService = {
      generatePdf: vi.fn(),
      generateLaporanPdf: vi.fn(),
    };

    service = new ArsipService(prisma, suratTugasPdfService, spdPdfService);
  });

  it('archiveSuratTugas archives Surat Tugas and its active SPDs', async () => {
    prisma.suratTugas.findUnique.mockResolvedValue({
      id: 'st-1',
      nomorSurat: '090/01/ST/2026',
      spdList: [
        { id: 'spd-1', status: 'SELESAI' },
        { id: 'spd-2', status: 'BATAL' },
      ],
    });
    prisma.suratTugas.update.mockResolvedValue({ id: 'st-1', status: 'ARSIP' });
    prisma.spd.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.archiveSuratTugas('st-1');
    expect(result.success).toBe(true);
    expect(result.archivedSpdCount).toBe(1);
    expect(prisma.spd.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['spd-1'] } },
      data: { status: 'ARSIP' },
    });
  });

  it('archiveSpd archives SPD and auto-archives Surat Tugas when all others are ARSIP/BATAL', async () => {
    prisma.spd.findUnique.mockResolvedValue({
      id: 'spd-1',
      nomorSpd: '090/01/SPD/2026',
      suratTugas: {
        id: 'st-1',
        status: 'SELESAI',
        spdList: [
          { id: 'spd-1', status: 'SELESAI' },
          { id: 'spd-2', status: 'ARSIP' },
        ],
      },
    });
    prisma.spd.update.mockResolvedValue({ id: 'spd-1', status: 'ARSIP' });
    prisma.suratTugas.update.mockResolvedValue({ id: 'st-1', status: 'ARSIP' });

    const result = await service.archiveSpd('spd-1');
    expect(result.success).toBe(true);
    expect(result.autoArchivedSuratTugas).toBe(true);
    expect(prisma.suratTugas.update).toHaveBeenCalledWith({
      where: { id: 'st-1' },
      data: { status: 'ARSIP' },
    });
  });

  it('bulkArchive updates multiple Surat Tugas and SPDs', async () => {
    prisma.suratTugas.updateMany.mockResolvedValue({ count: 2 });
    prisma.spd.updateMany
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 1 });

    const result = await service.bulkArchive({
      suratTugasIds: ['st-1', 'st-2'],
      spdIds: ['spd-4'],
    });

    expect(result.success).toBe(true);
    expect(result.archivedSuratTugasCount).toBe(2);
    expect(result.archivedSpdCount).toBe(4);
  });

  it('getSiapArsip returns completed items', async () => {
    prisma.suratTugas.findMany.mockResolvedValue([{ id: 'st-1', status: 'SELESAI' }]);
    prisma.spd.findMany.mockResolvedValue([{ id: 'spd-1', status: 'SELESAI' }]);

    const result = await service.getSiapArsip();
    expect(result.totalSiapArsip).toBe(2);
    expect(result.suratTugas.length).toBe(1);
    expect(result.spd.length).toBe(1);
  });

  it('generateBundlePdf merges Cover, Surat Tugas, SPD, and Laporan', async () => {
    const dummyDoc = await PDFDocument.create();
    dummyDoc.addPage([612, 1008]);
    const dummyBytes = await dummyDoc.save();
    const dummyBuffer = Buffer.from(dummyBytes);

    prisma.suratTugas.findUnique.mockResolvedValue({
      id: 'st-1',
      nomorSurat: '090/01/ST/2026',
      tanggalSurat: new Date('2026-03-29'),
      dalamRangka: 'Konsultasi Perencanaan Anggaran',
      tempatDikeluarkan: 'Banggai',
      penandatanganNama: 'Drs. H. Ruslan',
      penandatanganJabatan: 'Sekretaris Daerah',
      spdList: [
        {
          id: 'spd-1',
          nomorSpd: '090/01/SPD/2026',
          tempatTujuan: 'Palu',
          pegawai: { nama: 'Budi Santoso' },
          laporan: {
            hasilPerjalanan: 'Rapat koordinasi berjalan lancar',
            penandatangan: 'Sekertaris Daerah',
            tanggalLaporan: new Date('2026-04-02'),
          },
        },
      ],
    });

    suratTugasPdfService.generatePdf.mockResolvedValue({ buffer: dummyBuffer });
    spdPdfService.generatePdf.mockResolvedValue({ buffer: dummyBuffer });
    spdPdfService.generateLaporanPdf.mockResolvedValue({ buffer: dummyBuffer });

    const result = await service.generateBundlePdf('st-1');
    expect(result.fileName).toContain('BUNDEL_ARSIP_090_01_ST_2026.pdf');
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify it's a valid PDF with multiple pages (Cover + ST + SPD + Laporan = 4 pages)
    const loadedDoc = await PDFDocument.load(result.buffer);
    expect(loadedDoc.getPageCount()).toBeGreaterThanOrEqual(4);
  });

  it('generateSpdBundlePdf handles standalone SPD', async () => {
    const dummyDoc = await PDFDocument.create();
    dummyDoc.addPage([612, 1008]);
    const dummyBytes = await dummyDoc.save();
    const dummyBuffer = Buffer.from(dummyBytes);

    prisma.spd.findUnique
      .mockResolvedValueOnce({ id: 'spd-1', suratTugasId: null, nomorSpd: '090/01/SPD/2026' })
      .mockResolvedValueOnce({ id: 'spd-1', laporan: null });

    spdPdfService.generatePdf.mockResolvedValue({ buffer: dummyBuffer });

    const result = await service.generateSpdBundlePdf('spd-1');
    expect(result.fileName).toContain('BUNDEL_ARSIP_090_01_SPD_2026.pdf');
    expect(result.buffer).toBeInstanceOf(Buffer);
  });
});

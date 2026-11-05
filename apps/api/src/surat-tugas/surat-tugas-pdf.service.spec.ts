import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { SuratTugasPdfService } from './surat-tugas-pdf.service';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NotFoundException } from '@nestjs/common';

describe('SuratTugasPdfService', () => {
  let tempPdfPath: string;

  beforeAll(async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const bytes = await doc.save();
    tempPdfPath = path.join(os.tmpdir(), `test-st-kop-${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, bytes);
  });

  afterAll(() => {
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try {
        fs.unlinkSync(tempPdfPath);
      } catch {
        // ignore
      }
    }
  });

  const sampleSuratTugas = {
    id: 'st-1',
    nomorSurat: '090/001/SETDA-2026',
    dalamRangka: 'Perjalanan Dinas Konsultasi Teknis',
    tempatBerangkat: 'Banggai',
    tempatTujuan: 'Palu',
    tanggalSurat: new Date('2026-10-20'),
    tanggalBerangkat: new Date('2026-10-21'),
    tanggalKembali: new Date('2026-10-23'),
    dasarHukum: JSON.stringify(['Perbup No. 12 Tahun 2024']),
    penandatanganNama: 'Drs. SAIFUL A. USITA, MM',
    penandatanganJabatan: 'Sekretaris Daerah',
    penandatanganPangkat: 'Pembina Utama Madya, IV/d',
    penandatanganNip: '19680514 199303 1 005',
    spdList: [
      {
        id: 'spd-1',
        nomorSpd: '001/SPD/2026',
        pegawai: {
          id: 'p1',
          nama: 'Ahmad, S.Kom',
          nip: '19850101 201001 1 001',
          pangkat: 'Penata',
          golongan: 'III/c',
          jabatan: 'Pranata Komputer',
        },
      },
    ],
  };

  const prismaMock = {
    suratTugas: {
      findUnique: ({ where }: any) => {
        if (where.id === 'st-1') return sampleSuratTugas;
        return null;
      },
    },
    kopSurat: {
      findUnique: () => null,
      findFirst: () => null,
    },
    pegawai: {
      findMany: () => [],
    },
  } as any;

  const kopSuratMock = {
    getFilePath: () => tempPdfPath,
  } as any;

  it('generates Surat Tugas PDF buffer and valid filename', async () => {
    const service = new SuratTugasPdfService(prismaMock, kopSuratMock);
    const result = await service.generatePdf('st-1');

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.fileName).toContain('Surat_Tugas');

    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('throws NotFoundException when Surat Tugas is not found', async () => {
    const service = new SuratTugasPdfService(prismaMock, kopSuratMock);
    await expect(service.generatePdf('non-existent')).rejects.toThrow(NotFoundException);
  });
});

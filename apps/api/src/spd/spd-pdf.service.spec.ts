import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { SpdPdfService } from './spd-pdf.service';
import { PDFDocument, PDFName } from 'pdf-lib';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { PrismaService } from '../prisma/prisma.service';
import { KopSuratService } from '../kop-surat/kop-surat.service';

async function extractAllTextFromPdfBuffer(buf: Buffer): Promise<string> {
  const doc = await PDFDocument.load(buf);
  let text = '';
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const raw = (obj as unknown as { contents?: Uint8Array }).contents;
    if (raw) {
      try {
        const decomp = zlib.inflateSync(Buffer.from(raw)).toString('latin1');
        text += '\n' + decomp;
      } catch {
        text += '\n' + Buffer.from(raw).toString('latin1');
      }
    }
  }
  return text.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    try {
      return Buffer.from(hex, 'hex').toString('latin1');
    } catch {
      return _;
    }
  });
}

describe('SpdPdfService', () => {
  const prismaMock = {
    spd: {
      findUnique: ({ where }: { where: { id: string } }) => {
        if (where.id === 'spd-pa-1') return samplePaSpd;
        if (where.id === 'spd-kpa-1') return sampleKpaSpd;
        return null;
      },
    },
    kopSurat: {
      findUnique: () => null,
      findFirst: () => null,
    },
    pegawai: {
      findUnique: () => null,
      findFirst: () => null,
    },
  } as unknown as PrismaService;

  const samplePaSpd = {
    id: 'spd-pa-1',
    nomorSpd: '001/SPD/2026',
    pemberiPerintah: 'Pengguna Anggaran (PA)',
    dalamRangka: 'Konsultasi Perencanaan Anggaran',
    alatAngkut: 'Kendaraan Dinas',
    tempatBerangkat: 'Banggai',
    tempatTujuan: 'Palu',
    lamaHari: 3,
    tanggalBerangkat: new Date('2026-10-20'),
    tanggalKembali: new Date('2026-10-22'),
    penandatanganNama: 'Drs. SAIFUL A. USITA, MM',
    penandatanganJabatan: 'Sekretaris Daerah',
    penandatanganPangkat: 'Pembina Utama Madya, IV/d',
    penandatanganNip: '19680514 199303 1 005',
    pegawai: {
      nama: 'Ahmad, S.Kom',
      nip: '19850101 201001 1 001',
      pangkat: 'Penata',
      golongan: 'III/c',
      jabatan: 'Pranata Komputer',
    },
  };

  const sampleKpaSpd = {
    id: 'spd-kpa-1',
    nomorSpd: 'KPA/002/SPD/2026',
    pemberiPerintah: 'Kuasa Pengguna Anggaran (KPA)',
    dalamRangka: 'Rapat Koordinasi Umum',
    alatAngkut: 'Kendaraan Umum',
    tempatBerangkat: 'Banggai',
    tempatTujuan: 'Luwuk',
    lamaHari: 2,
    tanggalBerangkat: new Date('2026-10-25'),
    tanggalKembali: new Date('2026-10-26'),
    penandatanganNama: 'Dedy Kurniawan, S.STP',
    penandatanganJabatan: 'Kepala Bagian Umum',
    penandatanganPangkat: 'Pembina, IV/a',
    penandatanganNip: '19820412 200112 1 002',
    pegawai: {
      nama: 'Budi Santoso',
      nip: '19900202 201502 1 002',
      pangkat: 'Pengatur',
      golongan: 'II/c',
      jabatan: 'Pengadministrasi Umum',
    },
  };

  let tempPdfPath: string;

  beforeAll(async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const bytes = await doc.save();
    tempPdfPath = path.join(os.tmpdir(), `test-kop-${Date.now()}.pdf`);
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

  const kopSuratMock = {
    findDefaultKop: () => null,
    getKopStream: () => null,
    getFilePath: () => tempPdfPath,
  } as unknown as KopSuratService;

  it('renders PENGGUNA ANGGARAN across all signature sections when PA is selected', async () => {
    const service = new SpdPdfService(prismaMock, kopSuratMock);
    const { buffer } = await service.generatePdf(samplePaSpd.id);

    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);

    const extractedText = await extractAllTextFromPdfBuffer(buffer);

    // Bottom sign section on Front Page & Back Page
    expect(extractedText).toContain('PENGGUNA ANGGARAN');
    // Visum table rows on Back Page
    expect(extractedText).toContain('Pengguna Anggaran');
  });

  it('renders KUASA PENGGUNA ANGGARAN across all signature sections when KPA is selected', async () => {
    const service = new SpdPdfService(prismaMock, kopSuratMock);
    const { buffer } = await service.generatePdf(sampleKpaSpd.id);

    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);

    const extractedText = await extractAllTextFromPdfBuffer(buffer);

    // Bottom sign section on Front Page & Back Page
    expect(extractedText).toContain('KUASA PENGGUNA ANGGARAN');
    // Visum table rows on Back Page
    expect(extractedText).toContain('Kuasa Pengguna Anggaran');
  });

  it('generates valid Laporan Perjalanan Dinas PDF matching official template with SPD font and justified text', async () => {
    const service = new SpdPdfService(prismaMock, kopSuratMock);
    const { buffer, fileName } = await service.generateLaporanPdf(samplePaSpd.id, {
      hasilPerjalanan: 'Pelaksanaan perjalanan dinas telah berjalan dengan lancar dan aman. Koordinasi menghasilkan kesepakatan bersama.\n\nAdapun rincian pertemuan meliputi koordinasi teknis bersama jajaran pimpinan dinas untuk menyelaraskan rencana program kerja tahun anggaran mendatang.',
      penandatangan: 'Kepala Bagian',
      tanggalLaporan: '2026-10-23',
    });

    expect(fileName).toBe('Laporan_SPD_001_SPD_2026.pdf');
    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

    // Verify font is Helvetica (same as SPD)
    const baseFonts: string[] = [];
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      const fontObj = obj as unknown as { get?: (name: PDFName) => { toString: () => string } };
      if (fontObj.get && fontObj.get(PDFName.of('BaseFont'))) {
        baseFonts.push(fontObj.get(PDFName.of('BaseFont')).toString());
      }
    }
    expect(baseFonts.some((f) => f.includes('Helvetica'))).toBe(true);

    const extractedText = await extractAllTextFromPdfBuffer(buffer);
    expect(extractedText).toContain('LAPORAN PERJALANAN DINAS');
    expect(extractedText).toContain('Perihal : Laporan Perjalanan Dinas');
    expect(extractedText).toContain('Kepada Yth,');
    expect(extractedText).toContain('Kepala Bagian Umum Setda Kab. Banggai Laut');
    expect(extractedText).toContain('Dasar');
    expect(extractedText).toContain('Maksud Perjalanan');
    expect(extractedText).toContain('Lama Perjalanan');
    expect(extractedText).toContain('Hasil Perjalanan');
    expect(extractedText).toContain('Demikian');
    expect(extractedText).toContain('Laporan Perjalanan Dinas ini dibuat');
    expect(extractedText).toContain('YANG MELAKUKAN PERJALANAN DINAS');
    expect(extractedText).toContain('Ahmad, S.Kom');
  });
});

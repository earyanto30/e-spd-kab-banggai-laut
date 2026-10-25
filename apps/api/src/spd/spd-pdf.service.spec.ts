import { describe, expect, it } from 'vitest';
import { SpdPdfService } from './spd-pdf.service';
import { PDFDocument } from 'pdf-lib';

import path from 'path';
import zlib from 'zlib';

async function extractAllTextFromPdfBuffer(buf: Buffer): Promise<string> {
  const doc = await PDFDocument.load(buf);
  let text = '';
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if ((obj as any).contents) {
      const raw = (obj as any).contents;
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
      findUnique: ({ where }: any) => {
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
  } as any;

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
    nomorSpd: 'KPA002/SPD/2026',
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

  const kopSuratMock = {
    findDefaultKop: () => null,
    getKopStream: () => null,
    getFilePath: () => path.resolve(__dirname, '../../uploads/kop-surat/kop_setda_default.pdf'),
  } as any;

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
});

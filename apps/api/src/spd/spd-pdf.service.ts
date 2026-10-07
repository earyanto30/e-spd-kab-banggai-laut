import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KopSuratService } from '../kop-surat/kop-surat.service';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface OfficialSignerDto {
  nama?: string;
  nip?: string;
  pangkat?: string;
  golongan?: string;
  jabatan?: string;
}

@Injectable()
export class SpdPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kopSuratService: KopSuratService,
  ) {}

  private splitTextToLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private formatIndonesianDate(dateStr?: string | Date | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private angkaTerbilang(n: number): string {
    const kata = [
      '',
      'satu',
      'dua',
      'tiga',
      'empat',
      'lima',
      'enam',
      'tujuh',
      'delapan',
      'sembilan',
      'sepuluh',
      'sebelas',
    ];
    if (n <= 0) return 'nol';
    if (n < 12) return kata[n];
    if (n < 20) return `${kata[n - 10]} belas`;
    if (n < 100) return `${kata[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + kata[n % 10] : ''}`;
    return String(n);
  }

  async generatePdf(spdId: string, customSigner?: OfficialSignerDto): Promise<{ buffer: Buffer; fileName: string }> {
    const spd = await this.prisma.spd.findUnique({
      where: { id: spdId },
      include: {
        pegawai: true,
        kopSurat: true,
      },
    });

    if (!spd) {
      throw new NotFoundException(`Surat Perjalanan Dinas dengan ID '${spdId}' tidak ditemukan`);
    }

    // Resolve Kop Surat PDF
    let kopStoredFileName = spd.kopSurat?.storedFileName;
    if (!kopStoredFileName) {
      const defaultKop = await this.prisma.kopSurat.findFirst({
        where: { isDefault: true },
      });
      kopStoredFileName = defaultKop?.storedFileName || 'kop_setda_default.pdf';
    }

    let kopFilePath: string;
    try {
      kopFilePath = this.kopSuratService.getFilePath(kopStoredFileName);
    } catch {
      // Fallback
      kopFilePath = this.kopSuratService.getFilePath('kop_setda_default.pdf');
    }

    const kopBytes = fs.readFileSync(kopFilePath);
    const pdfDoc = await PDFDocument.load(kopBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize(); // Legal 612 x 1008 or A4 595 x 842

    const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const black = rgb(0, 0, 0);

    // 1. Metadata Kanan Atas (Tepat di bawah garis ganda kop surat)
    const metaX = 410;
    // Pada kertas Legal (1008 pt), garis kop berada di Y ~879 pt. Jarak 15 pt di bawah garis = 864 pt
    const startY = height > 900 ? 864 : height - 140;
    let currentY = startY;
    const metaFontSize = 9.5;
    const lineSpacing = 13;

    page.drawText('Lembar ke', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 50, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    currentY -= lineSpacing;

    page.drawText('Kode No.', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 50, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    currentY -= lineSpacing;

    page.drawText('Nomor', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 50, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(spd.nomorSpd || '-', { x: metaX + 58, y: currentY, size: metaFontSize, font: fontBold, color: black });

    // 2. Judul Dokumen (SURAT PERJALANAN DINAS)
    currentY -= 22;
    const title1 = 'SURAT PERJALANAN DINAS';
    const title1Width = fontBold.widthOfTextAtSize(title1, 11);
    const title1X = (width - title1Width) / 2;
    page.drawText(title1, { x: title1X, y: currentY, size: 11, font: fontBold, color: black });
    page.drawLine({
      start: { x: title1X, y: currentY - 1.5 },
      end: { x: title1X + title1Width, y: currentY - 1.5 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 13;
    const title2 = '(SPD)';
    const title2Width = fontBold.widthOfTextAtSize(title2, 11);
    page.drawText(title2, { x: (width - title2Width) / 2, y: currentY, size: 11, font: fontBold, color: black });

    // 3. Tabel Standar 10 Poin
    currentY -= 14;
    const tableX = 45;
    const colWidths = [24, 196, 302]; // Total: 522 pt
    const col1X = tableX;
    const col2X = col1X + colWidths[0];
    const col3X = col2X + colWidths[1];
    const tableRightX = col3X + colWidths[2];

    const fontSize = 9;
    const rowLineHeight = 11.5;
    const cellPaddingY = 3.5;
    const cellPaddingX = 4.5;

    const maksudItems = (spd.dalamRangka || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+[\.\)]\s*/, ''));

    const rows: Array<{
      no: string;
      desc?: string[];
      val?: string[];
      valBold?: boolean;
      height?: number;
      minHeight?: number;
      valCustom?: (topY: number) => void;
      valMaksud?: boolean;
      isPengikut?: boolean;
    }> = [
      {
        no: '1.',
        desc: ['Pengguna Anggaran'],
        val: ['SEKRETARIAT DAERAH KAB. BANGGAI LAUT'],
        valBold: true,
      },
      {
        no: '2.',
        desc: ['Nama/Nip Pegawai yang melaksanakan', 'Perjalanan Dinas'],
        valCustom: (topY: number) => {
          let y = topY - cellPaddingY - fontSize;
          page.drawText(':', { x: col3X + cellPaddingX, y, size: fontSize, font: fontRegular, color: black });
          page.drawText((spd.pegawai?.nama || '-').toUpperCase(), {
            x: col3X + cellPaddingX + 8,
            y,
            size: fontSize,
            font: fontBold,
            color: black,
          });
          y -= rowLineHeight;
          page.drawText(':', { x: col3X + cellPaddingX, y, size: fontSize, font: fontRegular, color: black });
          page.drawText(spd.pegawai?.nip || '-', {
            x: col3X + cellPaddingX + 8,
            y,
            size: fontSize,
            font: fontRegular,
            color: black,
          });
        },
        height: 30,
      },
      {
        no: '3.',
        desc: ['a. Pangkat dan Golongan', 'b. Jabatan/Instansi', 'c. Tingkat Biaya Perjalanan'],
        val: [
          `a. ${spd.pegawai?.pangkat || '-'} ${spd.pegawai?.golongan || ''}`.trim(),
          `b. ${spd.pegawai?.jabatan || '-'}`,
          `c. ${spd.tingkatBiaya || ''}`,
        ],
      },
      {
        no: '4.',
        desc: ['Maksud Perjalanan Dinas'],
        valMaksud: true,
      },
      {
        no: '5.',
        desc: ['Alat angkut yang dipergunakan'],
        val: [spd.alatAngkut || '-'],
      },
      {
        no: '6.',
        desc: ['a. Tempat Berangkat', 'b. Tempat Tujuan'],
        val: [`a. ${spd.tempatBerangkat || 'Banggai'}`, `b. ${spd.tempatTujuan || '-'}`],
      },
      {
        no: '7.',
        desc: [
          'a. Lamanya Perjalanan dinas',
          'b. Tanggal Berangkat',
          'c. Tanggal harus kembali/tiba ditempat',
          '    yang baru',
        ],
        val: [
          `a. ${spd.lamaHari} ( ${this.angkaTerbilang(spd.lamaHari)} ) Hari`,
          `b. ${this.formatIndonesianDate(spd.tanggalBerangkat)}`,
          `c. ${this.formatIndonesianDate(spd.tanggalKembali || spd.tanggalBerangkat)}`,
        ],
      },
      {
        no: '8.',
        desc: ['Pengikut : Nama'],
        isPengikut: true,
        height: 48,
      },
      {
        no: '9.',
        desc: ['Pembebanan Anggaran', 'a. SKPD', 'b. Kode Rekening'],
        val: ['', `a. ${spd.skpd || 'Bagian Umum Setda Kab. Banggai Laut'}`, `b. ${spd.kodeRekening || ''}`],
      },
      {
        no: '10.',
        desc: ['Keterangan Lain – lain'],
        val: [spd.keterangan || ''],
        minHeight: 18,
      },
    ];

    // Render each row
    for (const row of rows) {
      let rowH = 0;
      if (row.height) {
        rowH = row.height;
      } else if (row.valMaksud) {
        let totalLines = 0;
        const contentWidth = colWidths[2] - cellPaddingX * 2 - (maksudItems.length > 1 ? 24 : 10);
        for (const item of maksudItems) {
          const itemLines = this.splitTextToLines(item, fontRegular, fontSize, contentWidth);
          totalLines += Math.max(1, itemLines.length);
        }
        rowH = Math.max(28, cellPaddingY * 2 + totalLines * rowLineHeight + (maksudItems.length - 1) * 3);
      } else {
        const descLinesCount = row.desc ? row.desc.length : 1;
        let valLinesCount = 1;
        if (row.val) {
          valLinesCount = 0;
          for (const v of row.val) {
            const lns = this.splitTextToLines(
              v,
              row.valBold ? fontBold : fontRegular,
              fontSize,
              colWidths[2] - cellPaddingX * 2,
            );
            valLinesCount += Math.max(1, lns.length);
          }
        }
        const maxLines = Math.max(descLinesCount, valLinesCount);
        rowH = Math.max(row.minHeight || 20, cellPaddingY * 2 + maxLines * rowLineHeight);
      }

      const rowBottomY = currentY - rowH;

      // Draw borders
      page.drawLine({ start: { x: tableX, y: currentY }, end: { x: tableRightX, y: currentY }, thickness: 0.5, color: black });
      page.drawLine({ start: { x: col1X, y: currentY }, end: { x: col1X, y: rowBottomY }, thickness: 0.5, color: black });
      page.drawLine({ start: { x: col2X, y: currentY }, end: { x: col2X, y: rowBottomY }, thickness: 0.5, color: black });
      page.drawLine({ start: { x: col3X, y: currentY }, end: { x: col3X, y: rowBottomY }, thickness: 0.5, color: black });
      page.drawLine({ start: { x: tableRightX, y: currentY }, end: { x: tableRightX, y: rowBottomY }, thickness: 0.5, color: black });

      // Col 1 (No)
      page.drawText(row.no, {
        x: col1X + (colWidths[0] - fontRegular.widthOfTextAtSize(row.no, fontSize)) / 2,
        y: currentY - cellPaddingY - fontSize,
        size: fontSize,
        font: fontRegular,
        color: black,
      });

      // Col 2 (Uraian)
      let descY = currentY - cellPaddingY - fontSize;
      for (const dLine of row.desc || []) {
        page.drawText(dLine, { x: col2X + cellPaddingX, y: descY, size: fontSize, font: fontRegular, color: black });
        descY -= rowLineHeight;
      }

      // Col 3 (Nilai)
      if (row.valCustom) {
        row.valCustom(currentY);
      } else if (row.isPengikut) {
        const subMidX = col3X + colWidths[2] / 2;
        const subHeaderY = currentY - 14;
        page.drawLine({ start: { x: col3X, y: subHeaderY }, end: { x: tableRightX, y: subHeaderY }, thickness: 0.5, color: black });
        page.drawLine({ start: { x: subMidX, y: currentY }, end: { x: subMidX, y: rowBottomY }, thickness: 0.5, color: black });

        page.drawText('Tanggal Lahir', {
          x: col3X + (colWidths[2] / 2 - fontRegular.widthOfTextAtSize('Tanggal Lahir', fontSize)) / 2,
          y: currentY - cellPaddingY - fontSize,
          size: fontSize,
          font: fontRegular,
          color: black,
        });
        page.drawText('Keterangan', {
          x: subMidX + (colWidths[2] / 2 - fontRegular.widthOfTextAtSize('Keterangan', fontSize)) / 2,
          y: currentY - cellPaddingY - fontSize,
          size: fontSize,
          font: fontRegular,
          color: black,
        });
        const subRow1Y = subHeaderY - 11;
        const subRow2Y = subRow1Y - 11;
        page.drawLine({ start: { x: col3X, y: subRow1Y }, end: { x: tableRightX, y: subRow1Y }, thickness: 0.5, color: black });
        page.drawLine({ start: { x: col3X, y: subRow2Y }, end: { x: tableRightX, y: subRow2Y }, thickness: 0.5, color: black });
      } else if (row.valMaksud) {
        let valY = currentY - cellPaddingY - fontSize;
        const colonX = col3X + cellPaddingX;
        page.drawText(':', { x: colonX, y: valY, size: fontSize, font: fontRegular, color: black });

        const textStartX = colonX + 8;
        const hasMultiple = maksudItems.length > 1;

        for (let i = 0; i < maksudItems.length; i++) {
          const item = maksudItems[i];
          const numPrefix = hasMultiple ? `${i + 1}. ` : '';
          const numWidth = hasMultiple ? 14 : 0;
          const itemLines = this.splitTextToLines(item, fontRegular, fontSize, colWidths[2] - cellPaddingX * 2 - 8 - numWidth);

          if (hasMultiple) {
            page.drawText(numPrefix, { x: textStartX, y: valY, size: fontSize, font: fontRegular, color: black });
          }

          for (let l = 0; l < itemLines.length; l++) {
            page.drawText(itemLines[l], {
              x: textStartX + numWidth,
              y: valY,
              size: fontSize,
              font: fontRegular,
              color: black,
            });
            valY -= rowLineHeight;
          }
          valY -= 2;
        }
      } else if (row.val) {
        let valY = currentY - cellPaddingY - fontSize;
        for (const v of row.val) {
          if (!v) {
            valY -= rowLineHeight;
            continue;
          }
          const valLines = this.splitTextToLines(v, row.valBold ? fontBold : fontRegular, fontSize, colWidths[2] - cellPaddingX * 2);
          for (const vLine of valLines) {
            page.drawText(vLine, {
              x: col3X + cellPaddingX,
              y: valY,
              size: fontSize,
              font: row.valBold ? fontBold : fontRegular,
              color: black,
            });
            valY -= rowLineHeight;
          }
        }
      }

      currentY = rowBottomY;
    }

    // Bottom border of table
    page.drawLine({ start: { x: tableX, y: currentY }, end: { x: tableRightX, y: currentY }, thickness: 0.5, color: black });

    // 4. Blok Tanda Tangan
    currentY -= 24;
    const signX = 350;
    const signFontSize = 9.5;
    const signLineSpacing = 13;

    page.drawText('Dikeluarkan di', { x: signX, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 68, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText('Banggai', { x: signX + 76, y: currentY, size: signFontSize, font: fontRegular, color: black });
    currentY -= signLineSpacing;

    page.drawText('Pada Tanggal', { x: signX, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 68, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText(this.formatIndonesianDate(spd.createdAt || new Date()), {
      x: signX + 76,
      y: currentY,
      size: signFontSize,
      font: fontRegular,
      color: black,
    });
    currentY -= signLineSpacing + 6;

    const signerTitle = (spd.pemberiPerintah || '').toLowerCase().includes('kuasa')
      ? 'KUASA PENGGUNA ANGGARAN'
      : 'PENGGUNA ANGGARAN';

    page.drawText(signerTitle, { x: signX, y: currentY, size: 10, font: fontBold, color: black });

    currentY -= 58;

    const sNama = customSigner?.nama || 'Saiful U. Usuria, SE., M.Si';
    const sPangkat = customSigner?.pangkat
      ? `${customSigner.pangkat}${customSigner.golongan ? ', ' + customSigner.golongan : ''}`
      : 'Pembina Utama Muda, IV/c';
    const sNip = customSigner?.nip || '19750510 200012 1 004';

    page.drawText(sNama, { x: signX, y: currentY, size: 9.5, font: fontBold, color: black });
    const namaWidth = fontBold.widthOfTextAtSize(sNama, 9.5);
    page.drawLine({
      start: { x: signX, y: currentY - 1 },
      end: { x: signX + namaWidth, y: currentY - 1 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 12;
    page.drawText(sPangkat, { x: signX, y: currentY, size: 9, font: fontRegular, color: black });

    currentY -= 12;
    page.drawText(`NIP. ${sNip}`, { x: signX, y: currentY, size: 9, font: fontRegular, color: black });

    const pdfBytes = await pdfDoc.save();
    const cleanNum = (spd.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
    return {
      buffer: Buffer.from(pdfBytes),
      fileName: `SPD_${cleanNum}.pdf`,
    };
  }
}

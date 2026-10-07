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

  private drawJustifiedText(
    page: PDFPage,
    line: string,
    x: number,
    y: number,
    fontSize: number,
    font: PDFFont,
    color: any,
    targetWidth: number,
    isLastLine: boolean = false,
  ): void {
    const trimmed = line.trim();
    const words = trimmed.split(/\s+/);

    if (isLastLine || words.length <= 1) {
      page.drawText(trimmed, { x, y, size: fontSize, font, color });
      return;
    }

    const wordsTotalWidth = words.reduce((acc, w) => acc + font.widthOfTextAtSize(w, fontSize), 0);
    const spaceToDistribute = targetWidth - wordsTotalWidth;
    const gapWidth = spaceToDistribute / (words.length - 1);
    const normalSpaceWidth = font.widthOfTextAtSize(' ', fontSize);

    // Safeguard: if spacing is distorted beyond reasonable limits, fallback to standard text
    if (gapWidth > normalSpaceWidth * 3.5 || gapWidth < normalSpaceWidth * 0.5) {
      page.drawText(trimmed, { x, y, size: fontSize, font, color });
      return;
    }

    let curX = x;
    for (let i = 0; i < words.length; i++) {
      page.drawText(words[i], { x: curX, y, size: fontSize, font, color });
      curX += font.widthOfTextAtSize(words[i], fontSize) + gapWidth;
    }
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

  async generatePdf(
    spdId: string,
    customSigner?: OfficialSignerDto,
    fontFamily?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
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

    const isTimes = fontFamily?.toLowerCase() === 'times';
    const fontRegular = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);

    // 1. Metadata Kanan Atas (Tepat di bawah garis ganda kop surat)
    const metaX = 390;
    // Pada kertas Legal (1008 pt), garis kop berada di Y ~879 pt. Jarak 15 pt di bawah garis = 864 pt
    const startY = height > 900 ? 864 : height - 140;
    let currentY = startY;
    const metaFontSize = 11;
    const lineSpacing = 15;

    page.drawText('Lembar ke', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 62, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    currentY -= lineSpacing;

    page.drawText('Kode No.', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 62, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    currentY -= lineSpacing;

    page.drawText('Nomor', { x: metaX, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: metaX + 62, y: currentY, size: metaFontSize, font: fontRegular, color: black });
    page.drawText(spd.nomorSpd || '-', { x: metaX + 70, y: currentY, size: metaFontSize, font: fontBold, color: black });

    // 2. Judul Dokumen (SURAT PERJALANAN DINAS)
    currentY -= 20;
    const title1 = 'SURAT PERJALANAN DINAS';
    const title1Width = fontBold.widthOfTextAtSize(title1, 12);
    const title1X = (width - title1Width) / 2;
    page.drawText(title1, { x: title1X, y: currentY, size: 12, font: fontBold, color: black });
    page.drawLine({
      start: { x: title1X, y: currentY - 1.5 },
      end: { x: title1X + title1Width, y: currentY - 1.5 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 14;
    const title2 = '(SPD)';
    const title2Width = fontBold.widthOfTextAtSize(title2, 12);
    page.drawText(title2, { x: (width - title2Width) / 2, y: currentY, size: 12, font: fontBold, color: black });

    // 3. Tabel Standar 10 Poin
    currentY -= 15;
    const tableX = 45;
    const colWidths = [24, 184, 314]; // Total: 522 pt
    const col1X = tableX;
    const col2X = col1X + colWidths[0];
    const col3X = col2X + colWidths[1];
    const tableRightX = col3X + colWidths[2];

    const fontSize = 12;
    const rowLineHeight = 15;
    const cellPaddingY = 3.5;
    const cellPaddingX = 4.5;

    const isKpa =
      (customSigner?.jabatan || '').toLowerCase().includes('kpa') ||
      (customSigner?.jabatan || '').toLowerCase().includes('kuasa') ||
      (spd.pemberiPerintah || '').toLowerCase().includes('kuasa') ||
      (customSigner?.nama || '').toLowerCase().includes('dedy kurniawan');

    const row1Desc = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
    const row1Val = isKpa
      ? 'KEPALA BAGIAN UMUM SETDA KAB.  BANGGAI LAUT'
      : 'SEKRETARIS DAERAH KAB.  BANGGAI LAUT';

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
        desc: [row1Desc],
        val: [row1Val],
        valBold: false,
      },
      {
        no: '2.',
        desc: ['Nama/Nip Pegawai yang', 'melaksanakan Perjalanan Dinas'],
        valCustom: (topY: number) => {
          let y = topY - cellPaddingY - fontSize;
          page.drawText(':', { x: col3X + cellPaddingX, y, size: fontSize, font: fontRegular, color: black });
          page.drawText((spd.pegawai?.nama || '-').toUpperCase(), {
            x: col3X + cellPaddingX + 10,
            y,
            size: fontSize,
            font: fontBold,
            color: black,
          });
          y -= rowLineHeight;
          page.drawText(':', { x: col3X + cellPaddingX, y, size: fontSize, font: fontRegular, color: black });
          page.drawText(spd.pegawai?.nip || '-', {
            x: col3X + cellPaddingX + 10,
            y,
            size: fontSize,
            font: fontRegular,
            color: black,
          });
        },
        height: 38,
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
          'c. Tanggal harus kembali/tiba',
          '    ditempat yang baru',
        ],
        val: [
          `a. ${spd.lamaHari} ( ${this.angkaTerbilang(spd.lamaHari)} ) Hari`,
          `b. ${this.formatIndonesianDate(spd.tanggalBerangkat)}`,
          `c. ${this.formatIndonesianDate(spd.tanggalKembali || spd.tanggalBerangkat)}`,
        ],
      },
      {
        no: '8.',
        desc: ['Nama Pengikut'],
        isPengikut: true,
        height: 96,
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
      // Vertical line after number (col2X) is omitted on all rows to merge number & description
      page.drawLine({ start: { x: col3X, y: currentY }, end: { x: col3X, y: rowBottomY }, thickness: 0.5, color: black });
      page.drawLine({ start: { x: tableRightX, y: currentY }, end: { x: tableRightX, y: rowBottomY }, thickness: 0.5, color: black });

      if (!row.isPengikut) {
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
        const maxDescWidth = colWidths[1] - cellPaddingX * 2;
        for (const dLine of row.desc || []) {
          const splitLines = this.splitTextToLines(dLine, fontRegular, fontSize, maxDescWidth);
          for (const sLine of splitLines) {
            page.drawText(sLine, { x: col2X + cellPaddingX, y: descY, size: fontSize, font: fontRegular, color: black });
            descY -= rowLineHeight;
          }
        }
      }

      // Col 3 (Nilai)
      if (row.valCustom) {
        row.valCustom(currentY);
      } else if (row.isPengikut) {
        // Row 8 has height: 96
        // Title banner: 21 pt (leaves ample space below "8. Nama Pengikut")
        // Sub-header row: 19 pt (clean spacing for No, Nama, Umur, Keterangan)
        // Body area: 96 - 21 - 19 = 56 pt (each item ~15 pt, leaving ~11 pt safe clearance from row bottom line)
        const titleHeight = 21;
        const subHeight = 19;
        const line1Y = currentY - titleHeight;
        const line2Y = line1Y - subHeight;
        const subMidX = col3X + colWidths[2] / 2;

        // 1. Horizontal divider under "8. Nama Pengikut"
        page.drawLine({ start: { x: tableX, y: line1Y }, end: { x: tableRightX, y: line1Y }, thickness: 0.5, color: black });

        // 2. Horizontal divider under sub-header "No / Nama / Umur / Keterangan"
        page.drawLine({ start: { x: tableX, y: line2Y }, end: { x: tableRightX, y: line2Y }, thickness: 0.5, color: black });

        // 3. Vertical divider between Umur and Keterangan (from line1Y to rowBottomY)
        page.drawLine({ start: { x: subMidX, y: line1Y }, end: { x: subMidX, y: rowBottomY }, thickness: 0.5, color: black });

        // Text Part 1: "8.    Nama Pengikut" (centered nicely in 21 pt header)
        const titleY = currentY - 4.5 - fontSize;
        page.drawText('8.', { x: col1X + 8, y: titleY, size: fontSize, font: fontRegular, color: black });
        page.drawText('Nama Pengikut', { x: col1X + 32, y: titleY, size: fontSize, font: fontRegular, color: black });

        // Text Part 2: Sub-headers (centered nicely in 19 pt header)
        const subTextY = line1Y - 3.5 - fontSize;
        page.drawText('No', { x: col1X + 10, y: subTextY, size: fontSize, font: fontRegular, color: black });
        const namaCenterX = col1X + 32 + (colWidths[1] - fontRegular.widthOfTextAtSize('Nama', fontSize)) / 2;
        page.drawText('Nama', { x: namaCenterX, y: subTextY, size: fontSize, font: fontRegular, color: black });

        const umurCenterX = col3X + (colWidths[2] / 2 - fontRegular.widthOfTextAtSize('Umur', fontSize)) / 2;
        page.drawText('Umur', { x: umurCenterX, y: subTextY, size: fontSize, font: fontRegular, color: black });

        const ketCenterX = subMidX + (colWidths[2] / 2 - fontRegular.widthOfTextAtSize('Keterangan', fontSize)) / 2;
        page.drawText('Keterangan', { x: ketCenterX, y: subTextY, size: fontSize, font: fontRegular, color: black });

        // Text Part 3: Body items "1.", "2.", "3."
        let itemY = line2Y - 4 - fontSize;
        const pengikutArr = (spd.pengikut || '')
          .split(/\r?\n|,/)
          .map((s) => s.trim().replace(/^\d+[\.\)]\s*/, ''))
          .filter(Boolean);

        for (let idx = 0; idx < 3; idx++) {
          const numStr = `${idx + 1}.`;
          page.drawText(numStr, { x: col1X + 12, y: itemY, size: fontSize, font: fontRegular, color: black });
          if (pengikutArr[idx]) {
            page.drawText(pengikutArr[idx], { x: col1X + 34, y: itemY, size: fontSize, font: fontRegular, color: black });
          }
          itemY -= rowLineHeight;
        }
      } else if (row.valMaksud) {
        let valY = currentY - cellPaddingY - fontSize;
        const colonX = col3X + cellPaddingX;
        page.drawText(':', { x: colonX, y: valY, size: fontSize, font: fontRegular, color: black });

        const textStartX = colonX + 10;
        const hasMultiple = maksudItems.length > 1;

        for (let i = 0; i < maksudItems.length; i++) {
          const item = maksudItems[i];
          const numPrefix = hasMultiple ? `${i + 1}. ` : '';
          const numWidth = hasMultiple ? 16 : 0;
          const itemLines = this.splitTextToLines(item, fontRegular, fontSize, colWidths[2] - cellPaddingX * 2 - 10 - numWidth);

          if (hasMultiple) {
            page.drawText(numPrefix, { x: textStartX, y: valY, size: fontSize, font: fontRegular, color: black });
          }

          const targetWidth = colWidths[2] - cellPaddingX * 2 - 10 - numWidth;
          for (let l = 0; l < itemLines.length; l++) {
            const isLast = l === itemLines.length - 1;
            this.drawJustifiedText(
              page,
              itemLines[l],
              textStartX + numWidth,
              valY,
              fontSize,
              fontRegular,
              black,
              targetWidth,
              isLast,
            );
            valY -= rowLineHeight;
          }
          valY -= 2;
        }
      } else if (row.val) {
        let valY = currentY - cellPaddingY - fontSize;
        const targetWidth = colWidths[2] - cellPaddingX * 2;
        for (const v of row.val) {
          if (!v) {
            valY -= rowLineHeight;
            continue;
          }
          const valFont = row.valBold ? fontBold : fontRegular;
          const valLines = this.splitTextToLines(v, valFont, fontSize, targetWidth);
          for (let l = 0; l < valLines.length; l++) {
            const isLast = l === valLines.length - 1;
            this.drawJustifiedText(
              page,
              valLines[l],
              col3X + cellPaddingX,
              valY,
              fontSize,
              valFont,
              black,
              targetWidth,
              isLast,
            );
            valY -= rowLineHeight;
          }
        }
      }

      currentY = rowBottomY;
    }

    // Bottom border of table
    page.drawLine({ start: { x: tableX, y: currentY }, end: { x: tableRightX, y: currentY }, thickness: 0.5, color: black });

    // 4. Blok Tanda Tangan
    currentY -= 20;
    const signX = 330;
    const signFontSize = 11;
    const signLineSpacing = 15;

    page.drawText('Dikeluarkan di', { x: signX, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 78, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText('Banggai', { x: signX + 88, y: currentY, size: signFontSize, font: fontRegular, color: black });
    currentY -= signLineSpacing;

    page.drawText('Pada Tanggal', { x: signX, y: currentY, size: signFontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 78, y: currentY, size: signFontSize, font: fontRegular, color: black });
    const dateText = this.formatIndonesianDate(spd.createdAt || new Date());
    page.drawText(dateText, {
      x: signX + 88,
      y: currentY,
      size: signFontSize,
      font: fontRegular,
      color: black,
    });
    // Garis bawah horizontal di bawah "Pada Tanggal : [Tanggal]"
    const dateLineWidth = 88 + fontRegular.widthOfTextAtSize(dateText, signFontSize);
    page.drawLine({
      start: { x: signX, y: currentY - 2 },
      end: { x: signX + dateLineWidth, y: currentY - 2 },
      thickness: 0.8,
      color: black,
    });
    currentY -= signLineSpacing + 6;

    const signerTitle = (spd.pemberiPerintah || '').toLowerCase().includes('kuasa')
      ? 'KUASA PENGGUNA ANGGARAN'
      : 'PENGGUNA ANGGARAN';

    page.drawText(signerTitle, { x: signX, y: currentY, size: 11, font: fontBold, color: black });

    currentY -= 50;

    const sNama = customSigner?.nama || 'Saiful U. Usuria, SE., M.Si';
    const sPangkat = customSigner?.pangkat
      ? `${customSigner.pangkat}${customSigner.golongan ? ', ' + customSigner.golongan : ''}`
      : 'Pembina Utama Muda, IV/c';
    const sNip = customSigner?.nip || '19750510 200012 1 004';

    page.drawText(sNama, { x: signX, y: currentY, size: 11, font: fontBold, color: black });
    const namaWidth = fontBold.widthOfTextAtSize(sNama, 11);
    page.drawLine({
      start: { x: signX, y: currentY - 1 },
      end: { x: signX + namaWidth, y: currentY - 1 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 14;
    page.drawText(sPangkat, { x: signX, y: currentY, size: 11, font: fontRegular, color: black });

    currentY -= 14;
    page.drawText(`NIP. ${sNip}`, { x: signX, y: currentY, size: 11, font: fontRegular, color: black });

    const pdfBytes = await pdfDoc.save();
    const cleanNum = (spd.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
    return {
      buffer: Buffer.from(pdfBytes),
      fileName: `SPD_${cleanNum}.pdf`,
    };
  }
}

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
export class SuratTugasPdfService {
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

  private resolveSignaturePath(fileName: string): string | null {
    if (!fileName) return null;
    const candidates = [
      process.env.SIGNATURE_UPLOAD_DIR ? path.resolve(process.env.SIGNATURE_UPLOAD_DIR, fileName) : null,
      path.resolve(process.cwd(), 'apps/api/uploads/signatures', fileName),
      path.resolve(process.cwd(), 'uploads/signatures', fileName),
      path.resolve(__dirname, '../../uploads/signatures', fileName),
      path.resolve(__dirname, '../../../uploads/signatures', fileName),
      path.resolve(__dirname, '../../../../uploads/signatures', fileName),
      path.resolve('/home/evan/projects/e-spd/apps/api/uploads/signatures', fileName),
    ].filter(Boolean) as string[];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return null;
  }

  async generatePdf(
    id: string,
    customSigner?: OfficialSignerDto,
    fontFamily?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const st = await this.prisma.suratTugas.findUnique({
      where: { id },
      include: {
        penandatangan: true,
        spdList: {
          include: {
            pegawai: true,
          },
        },
      },
    });

    if (!st) {
      throw new NotFoundException(`Surat Tugas dengan ID '${id}' tidak ditemukan`);
    }

    // Penandatangan resolution with fallback
    let p = st.penandatangan;
    if (!p && st.penandatanganId) {
      p = await this.prisma.pegawai.findUnique({ where: { id: st.penandatanganId } });
    }
    const signerNama = customSigner?.nama || p?.nama || st.penandatanganNama || '';
    const signerJabatan = customSigner?.jabatan || p?.jabatan || st.penandatanganJabatan || '';
    const signerPangkat = customSigner?.pangkat
      ? `${customSigner.pangkat}${customSigner.golongan ? ', ' + customSigner.golongan : ''}`
      : (p ? (p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat) : st.penandatanganPangkat || '');
    const signerNip = customSigner?.nip || p?.nip || st.penandatanganNip || '';

    if ((!p || !p.tandaTangan) && (signerNip || signerNama)) {
      const matched = await this.prisma.pegawai.findFirst({
        where: {
          OR: [
            signerNip ? { nip: signerNip } : undefined,
            signerNama ? { nama: signerNama } : undefined,
          ].filter(Boolean) as any,
          tandaTangan: { not: null },
        },
      });
      if (matched) {
        p = matched;
      }
    }

    // Resolve Kop Surat PDF
    let kopStoredFileName: string | undefined;
    if (st.kopSuratId) {
      const kop = await this.prisma.kopSurat.findUnique({ where: { id: st.kopSuratId } });
      kopStoredFileName = kop?.storedFileName;
    }
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
      kopFilePath = this.kopSuratService.getFilePath('kop_setda_default.pdf');
    }

    const kopBytes = fs.readFileSync(kopFilePath);
    const pdfDoc = await PDFDocument.load(kopBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    // Word Scale: Font Size 12 Everywhere (Default font: Arial / Helvetica)
    const isTimes = fontFamily?.toLowerCase() === 'times';
    const fontRegular = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const fontSize = 12;
    const lineHeight = 15;

    // Margin setup
    const leftMargin = 54; // ~0.75 in
    const rightMargin = width - 54;
    const contentWidth = rightMargin - leftMargin;

    // Start under Kop Surat header line (around Y = 864 on Legal or height - 145)
    let currentY = height > 900 ? 864 : height - 145;

    // 1. JUDUL: SURAT TUGAS & NOMOR (Centered, Font 12, Bold)
    const titleText = 'SURAT TUGAS';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, fontSize);
    const titleX = (width - titleWidth) / 2;
    page.drawText(titleText, { x: titleX, y: currentY, size: fontSize, font: fontBold, color: black });
    page.drawLine({
      start: { x: titleX, y: currentY - 1.5 },
      end: { x: titleX + titleWidth, y: currentY - 1.5 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 15;
    const nomorText = `Nomor : ${st.nomorSurat || '000.1.2.3/ / Bag.Umum/' + new Date().getFullYear()}`;
    const nomorWidth = fontRegular.widthOfTextAtSize(nomorText, fontSize);
    page.drawText(nomorText, {
      x: (width - nomorWidth) / 2,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    currentY -= 24;

    // 2. DASAR HUKUM (Hardcoded statutory basis)
    page.drawText('Dasar  :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });
    const dasarNumberX = leftMargin + 50;
    page.drawText('1.', { x: dasarNumberX, y: currentY, size: fontSize, font: fontRegular, color: black });

    const dasarTextX = dasarNumberX + 16;
    const dasarWidth = rightMargin - dasarTextX;
    const dasarLines = this.splitTextToLines(st.dasarHukum, fontRegular, fontSize, dasarWidth);

    for (let i = 0; i < dasarLines.length; i++) {
      const isLast = i === dasarLines.length - 1;
      this.drawJustifiedText(
        page,
        dasarLines[i],
        dasarTextX,
        currentY,
        fontSize,
        fontRegular,
        black,
        dasarWidth,
        isLast,
      );
      currentY -= lineHeight;
    }

    currentY -= 14;

    // 3. MEMERINTAHKAN : (Centered Bold)
    const memText = 'MEMERINTAHKAN :';
    const memWidth = fontBold.widthOfTextAtSize(memText, fontSize);
    page.drawText(memText, {
      x: (width - memWidth) / 2,
      y: currentY,
      size: fontSize,
      font: fontBold,
      color: black,
    });

    currentY -= 20;

    // 4. KEPADA : (Daftar Pegawai Pelaksana 1, 2, 3...)
    page.drawText('Kepada :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });

    const kepadaNumX = leftMargin + 85;
    const labelX = kepadaNumX + 18;
    const colonX = labelX + 85;
    const valX = colonX + 10;
    const valMaxWidth = rightMargin - valX;

    let pegawaiItems = st.spdList.map((s) => s.pegawai).filter(Boolean);
    if (pegawaiItems.length === 0 && st.pegawaiIds) {
      try {
        const ids: string[] = JSON.parse(st.pegawaiIds);
        if (Array.isArray(ids) && ids.length > 0) {
          const dbPegawai = await this.prisma.pegawai.findMany({
            where: { id: { in: ids } },
          });
          pegawaiItems = ids.map((id) => dbPegawai.find((p) => p.id === id)).filter(Boolean) as any;
        }
      } catch {}
    }

    for (let idx = 0; idx < pegawaiItems.length; idx++) {
      const p = pegawaiItems[idx];
      const numPrefix = `${idx + 1}.`;

      // Nama Row
      page.drawText(numPrefix, { x: kepadaNumX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText('Nama', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText((p.nama || '-').toUpperCase(), {
        x: valX,
        y: currentY,
        size: fontSize,
        font: fontBold,
        color: black,
      });
      currentY -= lineHeight;

      // Pangkat/Gol
      const pktGol = p.pangkat ? `${p.pangkat}${p.golongan ? ', ' + p.golongan : ''}` : '-';
      page.drawText('Pangkat/Gol', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(pktGol, { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentY -= lineHeight;

      // NIP
      const nipLabel = p.golongan && !isNaN(Number(p.golongan)) ? 'NI PPPK' : 'NIP';
      page.drawText(nipLabel, { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(p.nip || '-', { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentY -= lineHeight;

      // Jabatan
      const jabLines = this.splitTextToLines(p.jabatan || '-', fontRegular, fontSize, valMaxWidth);
      page.drawText('Jabatan', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      page.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      for (let j = 0; j < jabLines.length; j++) {
        page.drawText(jabLines[j], { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
        currentY -= lineHeight;
      }

      currentY -= 6; // Spacing antar personil
    }

    currentY -= 10;

    // 5. UNTUK : (Dalam Rangka Multi Agenda)
    page.drawText('Untuk   :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });

    const untukPrefixX = leftMargin + 50;
    const agendaLines = (st.dalamRangka || '')
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
      .filter(Boolean);

    const isMultiAgenda = agendaLines.length > 1;

    if (!isMultiAgenda) {
      // Single paragraph
      const textX = untukPrefixX;
      const targetW = rightMargin - textX;
      const lines = this.splitTextToLines(st.dalamRangka || '-', fontRegular, fontSize, targetW);
      for (let i = 0; i < lines.length; i++) {
        const isLast = i === lines.length - 1;
        this.drawJustifiedText(page, lines[i], textX, currentY, fontSize, fontRegular, black, targetW, isLast);
        currentY -= lineHeight;
      }
    } else {
      for (let idx = 0; idx < agendaLines.length; idx++) {
        const numStr = `${idx + 1}.`;
        page.drawText(numStr, { x: untukPrefixX, y: currentY, size: fontSize, font: fontRegular, color: black });

        const itemTextX = untukPrefixX + 16;
        const itemWidth = rightMargin - itemTextX;
        const subLines = this.splitTextToLines(agendaLines[idx], fontRegular, fontSize, itemWidth);

        for (let i = 0; i < subLines.length; i++) {
          const isLast = i === subLines.length - 1;
          this.drawJustifiedText(
            page,
            subLines[i],
            itemTextX,
            currentY,
            fontSize,
            fontRegular,
            black,
            itemWidth,
            isLast,
          );
          currentY -= lineHeight;
        }
        currentY -= 3;
      }
    }

    currentY -= 20;

    // 6. BLOK TANDA TANGAN (Kanan Bawah)
    const signX = 330;
    const signLineSpacing = 16;

    page.drawText('Dikeluarkan di', { x: signX, y: currentY, size: fontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 80, y: currentY, size: fontSize, font: fontRegular, color: black });
    page.drawText(st.tempatDikeluarkan || 'Banggai', {
      x: signX + 92,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });
    currentY -= signLineSpacing;

    page.drawText('Pada Tanggal', { x: signX, y: currentY, size: fontSize, font: fontRegular, color: black });
    page.drawText(':', { x: signX + 80, y: currentY, size: fontSize, font: fontRegular, color: black });
    const formattedDate = this.formatIndonesianDate(st.tanggalSurat);
    page.drawText(formattedDate, {
      x: signX + 92,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    // Underline below date
    const dateLineWidth = 92 + fontRegular.widthOfTextAtSize(formattedDate, fontSize);
    page.drawLine({
      start: { x: signX, y: currentY - 2 },
      end: { x: signX + dateLineWidth, y: currentY - 2 },
      thickness: 0.8,
      color: black,
    });

    currentY -= signLineSpacing + 8;

    // Jabatan Pejabat (Multi lines split if needed)
    const titleLines = this.splitTextToLines(signerJabatan, fontBold, fontSize, rightMargin - signX);
    for (const tLine of titleLines) {
      page.drawText(tLine, { x: signX, y: currentY, size: fontSize, font: fontBold, color: black });
      currentY -= lineHeight;
    }

    // Space for physical signature / stempel (extra spacious room for official signature and stamp)
    const signSpaceTopY = currentY;
    currentY -= 95;

    // Jika dokumen sudah ditandatangani (DISETUJUI) dan pejabat memiliki file tanda tangan PNG
    if (st.status === 'DISETUJUI' && p?.tandaTangan) {
      try {
        const targetPath = this.resolveSignaturePath(p.tandaTangan);
        if (targetPath) {
          const sigBytes = fs.readFileSync(targetPath);
          const sigImage = await pdfDoc.embedPng(sigBytes);
          // Standarisasi ukuran: batas maksimal lebar 140 pt, tinggi 70 pt.
          // scaleToFit menjaga rasio asli gambar tetap proporsional tanpa memotong/mentrim gambar
          const sigDims = sigImage.scaleToFit(140, 70);
          // Posisikan tanda tangan tepat di atas nama penandatangan (jarak 12 pt dari baseline nama)
          page.drawImage(sigImage, {
            x: signX + 5,
            y: currentY + 12,
            width: sigDims.width,
            height: sigDims.height,
          });
        } else {
          console.warn(`[SuratTugasPdfService] File tanda tangan "${p.tandaTangan}" tidak ditemukan di disk.`);
        }
      } catch (err) {
        // Fallback gracefully jika gagal embed gambar
        console.warn('Gagal memuat tanda tangan digital penandatangan:', err);
      }
    }

    // Nama Pejabat
    page.drawText(signerNama, { x: signX, y: currentY, size: fontSize, font: fontBold, color: black });
    const sNamaWidth = fontBold.widthOfTextAtSize(signerNama, fontSize);
    page.drawLine({
      start: { x: signX, y: currentY - 1 },
      end: { x: signX + sNamaWidth, y: currentY - 1 },
      thickness: 0.8,
      color: black,
    });
    currentY -= 15;

    // Pangkat
    page.drawText(signerPangkat, { x: signX, y: currentY, size: fontSize, font: fontRegular, color: black });
    currentY -= 15;

    // NIP
    page.drawText(`NIP. ${signerNip}`, {
      x: signX,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    const pdfBytes = await pdfDoc.save();
    const cleanNum = (st.nomorSurat || 'Surat_Tugas').replace(/[\/\\]/g, '_');
    return {
      buffer: Buffer.from(pdfBytes),
      fileName: `Surat_Tugas_${cleanNum}.pdf`,
    };
  }
}

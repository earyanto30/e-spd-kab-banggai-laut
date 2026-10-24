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
    let currentPage = pdfDoc.getPages()[0];
    const { width, height } = currentPage.getSize();

    // Word Scale: Font Size 12 Everywhere (Default font: Arial / Helvetica)
    const isTimes = fontFamily?.toLowerCase() === 'times';
    const fontRegular = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(isTimes ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
    const black = rgb(0, 0, 0);
    const fontSize = 12;
    const lineHeight = 15;
    const marginBottom = 25;

    // Helper: Buat halaman baru jika konten teks panjang melampaui batas margin bawah
    const ensureSpaceOrNewPage = (neededHeight: number) => {
      if (currentY - neededHeight < marginBottom) {
        currentPage = pdfDoc.addPage([width, height]);
        const pageNumText = `- ${pdfDoc.getPageCount()} -`;
        const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 10);
        currentPage.drawText(pageNumText, {
          x: (width - pageNumWidth) / 2,
          y: height - 40,
          size: 10,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });
        currentY = height - 70;
      }
    };

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
    currentPage.drawText(titleText, { x: titleX, y: currentY, size: fontSize, font: fontBold, color: black });
    currentPage.drawLine({
      start: { x: titleX, y: currentY - 1.5 },
      end: { x: titleX + titleWidth, y: currentY - 1.5 },
      thickness: 0.8,
      color: black,
    });

    currentY -= 15;
    const nomorText = `Nomor : ${st.nomorSurat || '000.1.2.3/ / Bag.Umum/' + new Date().getFullYear()}`;
    const nomorWidth = fontRegular.widthOfTextAtSize(nomorText, fontSize);
    currentPage.drawText(nomorText, {
      x: (width - nomorWidth) / 2,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    currentY -= 24;

    // 2. DASAR HUKUM (Dapat memilih lebih dari satu dasar hukum)
    currentPage.drawText('Dasar  :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });
    const dasarNumberX = leftMargin + 50;
    const dasarTextX = dasarNumberX + 16;
    const dasarWidth = rightMargin - dasarTextX;

    // Parse multi-item dasar hukum: split by double newline or numbered items
    const rawDasar = (st.dasarHukum || '').trim();
    const itemsDasar = rawDasar
      .split(/\n\s*\n|\r?\n(?=\d+[\.\)]\s+)/)
      .map((item) => item.trim().replace(/^\d+[\.\)]\s*/, ''))
      .filter(Boolean);

    const listDasar = itemsDasar.length > 0 ? itemsDasar : [rawDasar];

    for (let dIdx = 0; dIdx < listDasar.length; dIdx++) {
      const numLabel = `${dIdx + 1}.`;
      ensureSpaceOrNewPage(lineHeight);
      currentPage.drawText(numLabel, { x: dasarNumberX, y: currentY, size: fontSize, font: fontRegular, color: black });

      const dLines = this.splitTextToLines(listDasar[dIdx], fontRegular, fontSize, dasarWidth);
      for (let i = 0; i < dLines.length; i++) {
        ensureSpaceOrNewPage(lineHeight);
        const isLast = i === dLines.length - 1;
        this.drawJustifiedText(
          currentPage,
          dLines[i],
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
      currentY -= 4; // Spacing antar dasar hukum
    }

    currentY -= 10;

    // 3. MEMERINTAHKAN : (Centered Bold)
    ensureSpaceOrNewPage(20);
    const memText = 'MEMERINTAHKAN :';
    const memWidth = fontBold.widthOfTextAtSize(memText, fontSize);
    currentPage.drawText(memText, {
      x: (width - memWidth) / 2,
      y: currentY,
      size: fontSize,
      font: fontBold,
      color: black,
    });

    currentY -= 20;

    // 4. KEPADA : (Daftar Pegawai Pelaksana 1, 2, 3...)
    ensureSpaceOrNewPage(20);
    currentPage.drawText('Kepada :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });

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
      const jabLines = this.splitTextToLines(p.jabatan || '-', fontRegular, fontSize, valMaxWidth);
      const personilHeight = lineHeight * 3 + jabLines.length * lineHeight + 6;

      ensureSpaceOrNewPage(personilHeight);

      // Nama Row
      currentPage.drawText(numPrefix, { x: kepadaNumX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText('Nama', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText((p.nama || '-').toUpperCase(), {
        x: valX,
        y: currentY,
        size: fontSize,
        font: fontBold,
        color: black,
      });
      currentY -= lineHeight;

      // Pangkat/Gol
      const pktGol = p.pangkat ? `${p.pangkat}${p.golongan ? ', ' + p.golongan : ''}` : '-';
      currentPage.drawText('Pangkat/Gol', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(pktGol, { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentY -= lineHeight;

      // NIP
      const nipLabel = p.golongan && !isNaN(Number(p.golongan)) ? 'NI PPPK' : 'NIP';
      currentPage.drawText(nipLabel, { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(p.nip || '-', { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentY -= lineHeight;

      // Jabatan
      currentPage.drawText('Jabatan', { x: labelX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentPage.drawText(':', { x: colonX, y: currentY, size: fontSize, font: fontRegular, color: black });
      for (let j = 0; j < jabLines.length; j++) {
        currentPage.drawText(jabLines[j], { x: valX, y: currentY, size: fontSize, font: fontRegular, color: black });
        currentY -= lineHeight;
      }

      currentY -= 6; // Spacing antar personil
    }

    currentY -= 10;

    // 5. UNTUK : (Dalam Rangka Multi Agenda)
    ensureSpaceOrNewPage(20);
    currentPage.drawText('Untuk   :', { x: leftMargin, y: currentY, size: fontSize, font: fontRegular, color: black });

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
        ensureSpaceOrNewPage(lineHeight);
        const isLast = i === lines.length - 1;
        this.drawJustifiedText(currentPage, lines[i], textX, currentY, fontSize, fontRegular, black, targetW, isLast);
        currentY -= lineHeight;
      }
    } else {
      for (let idx = 0; idx < agendaLines.length; idx++) {
        const numStr = `${idx + 1}.`;
        const itemTextX = untukPrefixX + 16;
        const itemWidth = rightMargin - itemTextX;
        const subLines = this.splitTextToLines(agendaLines[idx], fontRegular, fontSize, itemWidth);

        ensureSpaceOrNewPage(subLines.length * lineHeight + 5);

        currentPage.drawText(numStr, { x: untukPrefixX, y: currentY, size: fontSize, font: fontRegular, color: black });

        for (let i = 0; i < subLines.length; i++) {
          const isLast = i === subLines.length - 1;
          this.drawJustifiedText(
            currentPage,
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

    // 6. BLOK TANDA TANGAN (Kanan Bawah - Atomic Unit / Satu Kesatuan Utuh)
    const signBlockWidth = 230;
    const signX = rightMargin - signBlockWidth;
    const signLineSpacing = 16;
    const gapBeforeSign = 12;

    // Format judul jabatan resmi 2 baris terpusat: KEPALA BAGIAN UMUM / SETDA KAB. BANGGAI LAUT
    let titleLines: string[] = [];
    const upperJabatan = (signerJabatan || '').toUpperCase().trim();
    if (upperJabatan.includes('KEPALA BAGIAN UMUM') || upperJabatan.includes('KABAG UMUM') || !upperJabatan) {
      const prefix = upperJabatan.startsWith('PLT') ? 'Plt. ' : (upperJabatan.startsWith('PLH') ? 'Plh. ' : '');
      titleLines = [
        `${prefix}KEPALA BAGIAN UMUM`,
        'SETDA KAB. BANGGAI LAUT',
      ];
    } else {
      titleLines = this.splitTextToLines(upperJabatan, fontBold, fontSize, signBlockWidth);
      if (!upperJabatan.includes('BANGGAI LAUT')) {
        titleLines.push('SETDA KAB. BANGGAI LAUT');
      }
    }

    // Hitung total tinggi blok tanda tangan secara utuh:
    const totalSignBlockHeight =
      signLineSpacing +
      (signLineSpacing + 8) +
      titleLines.length * lineHeight +
      55 +
      15 +
      (signerPangkat ? 15 : 0) +
      15;

    // Jika blok tanda tangan tidak muat di halaman saat ini:
    // Pindahkan SELURUH komponen tanda tangan ke halaman berikutnya sebagai SATU KESATUAN UTUH (Atomic Unit)
    if (currentY - gapBeforeSign - totalSignBlockHeight < marginBottom) {
      currentPage = pdfDoc.addPage([width, height]);

      // Nomor halaman di bagian atas halaman lanjutan
      const pageNumText = `- ${pdfDoc.getPageCount()} -`;
      const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 10);
      currentPage.drawText(pageNumText, {
        x: (width - pageNumWidth) / 2,
        y: height - 40,
        size: 10,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });

      currentY = height - 70;
    } else {
      currentY -= gapBeforeSign;
    }

    // Header Dikeluarkan di & Pada Tanggal
    currentPage.drawText('Dikeluarkan di', { x: signX, y: currentY, size: fontSize, font: fontRegular, color: black });
    currentPage.drawText(':', { x: signX + 80, y: currentY, size: fontSize, font: fontRegular, color: black });
    currentPage.drawText(st.tempatDikeluarkan || 'Banggai', {
      x: signX + 92,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });
    currentY -= signLineSpacing;

    currentPage.drawText('Pada Tanggal', { x: signX, y: currentY, size: fontSize, font: fontRegular, color: black });
    currentPage.drawText(':', { x: signX + 80, y: currentY, size: fontSize, font: fontRegular, color: black });
    const formattedDate = this.formatIndonesianDate(st.tanggalSurat);
    currentPage.drawText(formattedDate, {
      x: signX + 92,
      y: currentY,
      size: fontSize,
      font: fontRegular,
      color: black,
    });

    // Underline below date
    const dateLineWidth = 92 + fontRegular.widthOfTextAtSize(formattedDate, fontSize);
    currentPage.drawLine({
      start: { x: signX, y: currentY - 2 },
      end: { x: signX + dateLineWidth, y: currentY - 2 },
      thickness: 0.8,
      color: black,
    });

    currentY -= signLineSpacing + 8;

    // Jabatan Pejabat (Center-aligned in sign block)
    for (const tLine of titleLines) {
      const tW = fontBold.widthOfTextAtSize(tLine, fontSize);
      const tX = signX + (signBlockWidth - tW) / 2;
      currentPage.drawText(tLine, { x: tX, y: currentY, size: fontSize, font: fontBold, color: black });
      currentY -= lineHeight;
    }

    // Space for physical signature / stempel
    currentY -= (55 - lineHeight);

    // Nama Pejabat (Center-aligned with underline)
    const sNamaWidth = fontBold.widthOfTextAtSize(signerNama, fontSize);
    const sNamaX = signX + (signBlockWidth - sNamaWidth) / 2;
    currentPage.drawText(signerNama, { x: sNamaX, y: currentY, size: fontSize, font: fontBold, color: black });
    currentPage.drawLine({
      start: { x: sNamaX, y: currentY - 1 },
      end: { x: sNamaX + sNamaWidth, y: currentY - 1 },
      thickness: 0.8,
      color: black,
    });
    currentY -= 15;

    // Pangkat (Center-aligned)
    if (signerPangkat) {
      const sPangkatWidth = fontRegular.widthOfTextAtSize(signerPangkat, fontSize);
      const sPangkatX = signX + (signBlockWidth - sPangkatWidth) / 2;
      currentPage.drawText(signerPangkat, { x: sPangkatX, y: currentY, size: fontSize, font: fontRegular, color: black });
      currentY -= 15;
    }

    // NIP (Center-aligned)
    const nipText = `NIP. ${signerNip}`;
    const nipWidth = fontRegular.widthOfTextAtSize(nipText, fontSize);
    const nipX = signX + (signBlockWidth - nipWidth) / 2;
    currentPage.drawText(nipText, {
      x: nipX,
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

  async generateBulkPdf(ids: string[], fontFamily?: string): Promise<{ buffer: Buffer; fileName: string }> {
    if (!ids || ids.length === 0) {
      throw new NotFoundException('Daftar ID Surat Tugas wajib disertakan');
    }

    const mergedDoc = await PDFDocument.create();

    for (const id of ids) {
      try {
        const { buffer } = await this.generatePdf(id, undefined, fontFamily);
        const subDoc = await PDFDocument.load(buffer);
        const copiedPages = await mergedDoc.copyPages(subDoc, subDoc.getPageIndices());
        for (const p of copiedPages) {
          mergedDoc.addPage(p);
        }
      } catch (err) {
        console.warn(`[SuratTugasPdfService] Gagal memuat Surat Tugas ID '${id}' saat bulk print:`, err);
      }
    }

    if (mergedDoc.getPageCount() === 0) {
      throw new NotFoundException('Tidak ada dokumen Surat Tugas yang berhasil dimuat untuk digabungkan');
    }

    const mergedBytes = await mergedDoc.save();
    return {
      buffer: Buffer.from(mergedBytes),
      fileName: `Surat_Tugas_Gabungan_${ids.length}_Dokumen.pdf`,
    };
  }
}

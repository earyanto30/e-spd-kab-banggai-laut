import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasPdfService } from '../surat-tugas/surat-tugas-pdf.service';
import { SpdPdfService } from '../spd/spd-pdf.service';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

export interface BulkArchiveDto {
  suratTugasIds?: string[];
  spdIds?: string[];
}

@Injectable()
export class ArsipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suratTugasPdfService: SuratTugasPdfService,
    private readonly spdPdfService: SpdPdfService,
  ) {}

  private formatDateIndo(dateInput?: Date | string | null): string {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /**
   * Mengarsipkan Surat Tugas dan seluruh SPD terkait secara 1-klik
   */
  async archiveSuratTugas(id: string) {
    const st = await this.prisma.suratTugas.findUnique({
      where: { id },
      include: {
        spdList: true,
      },
    });

    if (!st) {
      throw new NotFoundException(`Surat Tugas dengan ID '${id}' tidak ditemukan`);
    }

    // Update Surat Tugas ke ARSIP
    const updatedSt = await this.prisma.suratTugas.update({
      where: { id },
      data: { status: 'ARSIP' },
    });

    // Update seluruh SPD yang terhubung (kecuali yang BATAL) ke ARSIP
    const eligibleSpdIds = st.spdList.filter((s) => s.status !== 'BATAL').map((s) => s.id);
    if (eligibleSpdIds.length > 0) {
      await this.prisma.spd.updateMany({
        where: { id: { in: eligibleSpdIds } },
        data: { status: 'ARSIP' },
      });
    }

    return {
      success: true,
      message: `Surat Tugas nomor ${st.nomorSurat} dan ${eligibleSpdIds.length} dokumen SPD terhubung berhasil diarsipkan.`,
      suratTugas: updatedSt,
      archivedSpdCount: eligibleSpdIds.length,
    };
  }

  /**
   * Mengarsipkan sebuah SPD secara 1-klik
   */
  async archiveSpd(id: string) {
    const spd = await this.prisma.spd.findUnique({
      where: { id },
      include: {
        suratTugas: {
          include: {
            spdList: true,
          },
        },
      },
    });

    if (!spd) {
      throw new NotFoundException(`Dokumen SPD dengan ID '${id}' tidak ditemukan`);
    }

    const updatedSpd = await this.prisma.spd.update({
      where: { id },
      data: { status: 'ARSIP' },
    });

    let autoArchivedSt = false;
    // Jika terhubung ke Surat Tugas, cek apakah seluruh SPD saudara sudah berstatus ARSIP / BATAL
    if (spd.suratTugas) {
      const remainingSpds = spd.suratTugas.spdList.filter((s) => s.id !== id);
      const allDoneOrArchived = remainingSpds.every((s) => s.status === 'ARSIP' || s.status === 'BATAL');
      if (allDoneOrArchived && spd.suratTugas.status !== 'ARSIP') {
        await this.prisma.suratTugas.update({
          where: { id: spd.suratTugas.id },
          data: { status: 'ARSIP' },
        });
        autoArchivedSt = true;
      }
    }

    return {
      success: true,
      message: `Dokumen SPD nomor ${spd.nomorSpd} berhasil diarsipkan.${
        autoArchivedSt ? ' Surat Tugas terkait juga otomatis diarsipkan.' : ''
      }`,
      spd: updatedSpd,
      autoArchivedSuratTugas: autoArchivedSt,
    };
  }

  /**
   * Pengarsipan massal Surat Tugas dan/atau SPD
   */
  async bulkArchive(dto: BulkArchiveDto) {
    const stIds = dto.suratTugasIds || [];
    const spdIds = dto.spdIds || [];

    let stCount = 0;
    let spdCount = 0;

    if (stIds.length > 0) {
      const resSt = await this.prisma.suratTugas.updateMany({
        where: { id: { in: stIds } },
        data: { status: 'ARSIP' },
      });
      stCount = resSt.count;

      // Update seluruh SPD yang terhubung dengan Surat Tugas tersebut
      const resLinkedSpd = await this.prisma.spd.updateMany({
        where: { suratTugasId: { in: stIds }, status: { not: 'BATAL' } },
        data: { status: 'ARSIP' },
      });
      spdCount += resLinkedSpd.count;
    }

    if (spdIds.length > 0) {
      const resSpd = await this.prisma.spd.updateMany({
        where: { id: { in: spdIds } },
        data: { status: 'ARSIP' },
      });
      spdCount += resSpd.count;
    }

    return {
      success: true,
      message: `Berhasil mengarsipkan ${stCount} Surat Tugas dan ${spdCount} dokumen SPD.`,
      archivedSuratTugasCount: stCount,
      archivedSpdCount: spdCount,
    };
  }

  /**
   * Mendapatkan daftar dokumen yang berstatus SELESAI (siap diarsipkan)
   */
  async getSiapArsip() {
    const [suratTugas, spd] = await Promise.all([
      this.prisma.suratTugas.findMany({
        where: { status: 'SELESAI' },
        include: {
          spdList: {
            include: {
              pegawai: true,
              laporan: true,
            },
          },
          penandatangan: true,
        },
        orderBy: { tanggalSurat: 'desc' },
      }),
      this.prisma.spd.findMany({
        where: { status: 'SELESAI' },
        include: {
          pegawai: true,
          laporan: true,
          suratTugas: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      suratTugas,
      spd,
      totalSiapArsip: suratTugas.length + spd.length,
    };
  }

  /**
   * Membuat halaman sampul (Cover Sheet) bundel arsip resmi
   */
  private createCoverPage(
    pdfDoc: PDFDocument,
    fontRegular: PDFFont,
    fontBold: PDFFont,
    st: any,
  ): PDFPage {
    const page = pdfDoc.addPage([612, 1008]); // Ukuran Legal
    const { width, height } = page.getSize();
    const margin = 45;
    const printWidth = width - margin * 2;
    const darkBlue = rgb(0.06, 0.30, 0.51); // #0F4C81
    const darkGray = rgb(0.2, 0.2, 0.2);

    let y = height - 55;

    // Kop Surat Teks
    const drawCentered = (text: string, font: PDFFont, size: number, color = rgb(0, 0, 0)) => {
      const textW = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textW) / 2,
        y,
        size,
        font,
        color,
      });
      y -= size + 5;
    };

    drawCentered('PEMERINTAH KABUPATEN BANGGAI LAUT', fontBold, 13);
    drawCentered('SEKRETARIAT DAERAH', fontBold, 16, darkBlue);
    drawCentered('BAGIAN UMUM', fontBold, 12);
    drawCentered('Jalan Mayor Haji Pelita No. 1, Banggai - Provinsi Sulawesi Tengah 94791', fontRegular, 8.5, darkGray);

    y -= 3;
    // Garis Kop Ganda
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: darkBlue,
    });
    y -= 3;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.75,
      color: darkBlue,
    });
    y -= 25;

    // Judul Berkas Arsip
    const year = st.tanggalSurat ? new Date(st.tanggalSurat).getFullYear() : new Date().getFullYear();
    drawCentered('BERKAS ARSIP RESMI PERJALANAN DINAS', fontBold, 14, darkBlue);
    drawCentered(`TAHUN ANGGARAN ${year}`, fontBold, 11);
    y -= 15;

    // Kotak Ringkasan Penugasan (Dossier Header Box)
    const boxX = margin;
    const boxY = y - 135;
    const boxW = printWidth;
    const boxH = 135;

    // Background fill & border
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.8, 0.85, 0.92),
      borderWidth: 1,
    });

    const labelX = boxX + 14;
    const colonX = labelX + 130;
    const valX = colonX + 12;
    let rowY = boxY + boxH - 22;

    const drawRow = (label: string, val: string, isBold = false) => {
      page.drawText(label, { x: labelX, y: rowY, size: 9.5, font: fontRegular, color: darkGray });
      page.drawText(':', { x: colonX, y: rowY, size: 9.5, font: fontRegular, color: darkGray });
      const maxValW = boxW - 170;
      let displayVal = val || '-';
      if (fontRegular.widthOfTextAtSize(displayVal, 9.5) > maxValW) {
        displayVal = displayVal.substring(0, 75) + '...';
      }
      page.drawText(displayVal, {
        x: valX,
        y: rowY,
        size: 9.5,
        font: isBold ? fontBold : fontRegular,
        color: isBold ? darkBlue : rgb(0, 0, 0),
      });
      rowY -= 19;
    };

    drawRow('Nomor Surat Tugas', st.nomorSurat, true);
    drawRow('Tanggal Surat Tugas', this.formatDateIndo(st.tanggalSurat));
    drawRow('Maksud Penugasan', st.dalamRangka);
    drawRow('Tempat Dikeluarkan', st.tempatDikeluarkan || 'Banggai');
    drawRow('Pejabat Penandatangan', `${st.penandatanganNama || '-'} (${st.penandatanganJabatan || '-'})`);
    drawRow('Status Kearsipan', 'ARSIP ELEKTRONIK TERPADU', true);

    y = boxY - 25;

    // Header Tabel Kelengkapan Berkas
    page.drawText('DAFTAR ISI KELENGKAPAN BERKAS ARSIP (DOSSIER INDEX)', {
      x: margin,
      y,
      size: 10.5,
      font: fontBold,
      color: darkBlue,
    });
    y -= 14;

    // Table Header
    const colNoW = 30;
    const colJenisW = 110;
    const colNomorW = 150;
    const colKeteranganW = printWidth - colNoW - colJenisW - colNomorW;

    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: printWidth,
      height: 20,
      color: rgb(0.92, 0.94, 0.98),
      borderColor: rgb(0.75, 0.8, 0.88),
      borderWidth: 1,
    });

    const thY = y - 14;
    page.drawText('No.', { x: margin + 8, y: thY, size: 8.5, font: fontBold, color: darkBlue });
    page.drawText('Jenis Dokumen', { x: margin + colNoW + 8, y: thY, size: 8.5, font: fontBold, color: darkBlue });
    page.drawText('Nomor / Identitas', { x: margin + colNoW + colJenisW + 8, y: thY, size: 8.5, font: fontBold, color: darkBlue });
    page.drawText('Personil / Pelaksana / Status', { x: margin + colNoW + colJenisW + colNomorW + 8, y: thY, size: 8.5, font: fontBold, color: darkBlue });
    y -= 20;

    // Baris 1: Surat Tugas
    let itemIdx = 1;
    const drawTableRow = (jenis: string, nomor: string, ket: string) => {
      const rowHeight = 22;
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: printWidth,
        height: rowHeight,
        color: itemIdx % 2 === 0 ? rgb(0.98, 0.99, 1.0) : rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 0.5,
      });

      const cellY = y - 15;
      page.drawText(String(itemIdx++), { x: margin + 10, y: cellY, size: 8.5, font: fontRegular });
      page.drawText(jenis, { x: margin + colNoW + 8, y: cellY, size: 8.5, font: fontBold });
      page.drawText(nomor, { x: margin + colNoW + colJenisW + 8, y: cellY, size: 8.5, font: fontRegular });
      page.drawText(ket.substring(0, 48), { x: margin + colNoW + colJenisW + colNomorW + 8, y: cellY, size: 8.5, font: fontRegular });
      y -= rowHeight;
    };

    drawTableRow('Surat Tugas', st.nomorSurat, `Penandatangan: ${st.penandatanganNama || '-'}`);

    // Baris SPD
    const spdList = st.spdList || [];
    for (const spd of spdList) {
      const namaPegawai = spd.pegawai?.nama || 'Pelaksana';
      drawTableRow('Lembar SPD', spd.nomorSpd, `${namaPegawai} (${spd.tempatTujuan || '-'})`);
    }

    // Baris Laporan
    const laporanCount = spdList.filter((s: any) => !!s.laporan).length;
    drawTableRow(
      'Laporan Hasil',
      laporanCount > 0 ? `${laporanCount} Dokumen Laporan` : 'Belum Ada Laporan',
      laporanCount > 0 ? 'Laporan Perjalanan Terlampir' : 'Laporan belum diunggah/dibuat',
    );

    y -= 30;

    // Lembar Tanda Verifikasi Arsip
    const signBoxW = 220;
    const signBoxX = width - margin - signBoxW;
    page.drawText(`Banggai, ${this.formatDateIndo(new Date())}`, {
      x: signBoxX,
      y,
      size: 9.5,
      font: fontRegular,
    });
    y -= 14;
    page.drawText('Unit Pengelola Kearsipan / Bagian Umum,', {
      x: signBoxX,
      y,
      size: 9.5,
      font: fontBold,
    });
    y -= 55;
    page.drawText('PENGELOLA ARSIP DIGITAL', {
      x: signBoxX,
      y,
      size: 9.5,
      font: fontBold,
      color: darkBlue,
    });
    y -= 12;
    page.drawText('SI-SPD Setda Kab. Banggai Laut', {
      x: signBoxX,
      y,
      size: 8.5,
      font: fontRegular,
      color: darkGray,
    });

    // Footer Catatan Resmi
    const footY = margin + 20;
    page.drawLine({
      start: { x: margin, y: footY + 15 },
      end: { x: width - margin, y: footY + 15 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText(
      'Dokumen ini adalah Bundel Berkas Arsip Digital Resmi yang digabungkan secara elektronik melalui SI-SPD Banggai Laut.',
      {
        x: margin,
        y: footY + 4,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      },
    );
    page.drawText(
      `Dicetak pada: ${new Date().toISOString()} • Keaslian arsip terverifikasi dalam basis data sistem.`,
      {
        x: margin,
        y: footY - 6,
        size: 7,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      },
    );

    return page;
  }

  /**
   * Menghasilkan Bundel Berkas Digital Lengkap (PDF 1-Pintu)
   * Berisi Cover Berkas Arsip + Surat Tugas PDF + Semua SPD PDF + Laporan Hasil PDF
   */
  async generateBundlePdf(suratTugasId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const st = await this.prisma.suratTugas.findUnique({
      where: { id: suratTugasId },
      include: {
        penandatangan: true,
        spdList: {
          include: {
            pegawai: true,
            laporan: true,
          },
        },
      },
    });

    if (!st) {
      throw new NotFoundException(`Surat Tugas dengan ID '${suratTugasId}' tidak ditemukan.`);
    }

    const mergedDoc = await PDFDocument.create();
    const fontRegular = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

    // 1. Buat Halaman Sampul (Cover Lembar Berkas Arsip)
    this.createCoverPage(mergedDoc, fontRegular, fontBold, st);

    // 2. Render dan gabungkan PDF Surat Tugas
    try {
      const { buffer: stBuffer } = await this.suratTugasPdfService.generatePdf(suratTugasId);
      const stSubDoc = await PDFDocument.load(stBuffer);
      const stPages = await mergedDoc.copyPages(stSubDoc, stSubDoc.getPageIndices());
      for (const p of stPages) {
        mergedDoc.addPage(p);
      }
    } catch (err) {
      console.warn(`[ArsipService] Gagal memuat Surat Tugas PDF untuk bundel ${suratTugasId}:`, err);
    }

    // 3. Render dan gabungkan setiap lembar SPD personil
    for (const spd of st.spdList) {
      try {
        const { buffer: spdBuffer } = await this.spdPdfService.generatePdf(spd.id);
        const spdSubDoc = await PDFDocument.load(spdBuffer);
        const spdPages = await mergedDoc.copyPages(spdSubDoc, spdSubDoc.getPageIndices());
        for (const p of spdPages) {
          mergedDoc.addPage(p);
        }
      } catch (err) {
        console.warn(`[ArsipService] Gagal memuat SPD PDF ${spd.id} untuk bundel:`, err);
      }
    }

    // 4. Render dan gabungkan Laporan Perjalanan Dinas (jika ada)
    for (const spd of st.spdList) {
      if (spd.laporan) {
        try {
          const body = {
            hasilPerjalanan: spd.laporan.hasilPerjalanan,
            penandatangan: spd.laporan.penandatangan as any,
            tanggalLaporan: spd.laporan.tanggalLaporan
              ? new Date(spd.laporan.tanggalLaporan).toISOString()
              : undefined,
          };
          const { buffer: lapBuffer } = await this.spdPdfService.generateLaporanPdf(spd.id, body);
          const lapSubDoc = await PDFDocument.load(lapBuffer);
          const lapPages = await mergedDoc.copyPages(lapSubDoc, lapSubDoc.getPageIndices());
          for (const p of lapPages) {
            mergedDoc.addPage(p);
          }
        } catch (err) {
          console.warn(`[ArsipService] Gagal memuat Laporan PDF untuk SPD ${spd.id}:`, err);
        }
      }
    }

    const mergedBytes = await mergedDoc.save();
    const cleanNomor = (st.nomorSurat || 'SuratTugas').replace(/[\/\\]/g, '_');
    return {
      buffer: Buffer.from(mergedBytes),
      fileName: `BUNDEL_ARSIP_${cleanNomor}.pdf`,
    };
  }

  /**
   * Menghasilkan Bundel Berkas dari sebuah SPD
   */
  async generateSpdBundlePdf(spdId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const spd = await this.prisma.spd.findUnique({
      where: { id: spdId },
      select: { suratTugasId: true, nomorSpd: true },
    });

    if (!spd) {
      throw new NotFoundException(`Dokumen SPD dengan ID '${spdId}' tidak ditemukan.`);
    }

    if (spd.suratTugasId) {
      return this.generateBundlePdf(spd.suratTugasId);
    }

    // Jika berdiri sendiri tanpa Surat Tugas: buat bundel SPD + Laporan
    const mergedDoc = await PDFDocument.create();
    const { buffer: spdBuffer } = await this.spdPdfService.generatePdf(spdId);
    const spdSubDoc = await PDFDocument.load(spdBuffer);
    const spdPages = await mergedDoc.copyPages(spdSubDoc, spdSubDoc.getPageIndices());
    for (const p of spdPages) {
      mergedDoc.addPage(p);
    }

    const fullSpd = await this.prisma.spd.findUnique({
      where: { id: spdId },
      include: { laporan: true },
    });

    if (fullSpd?.laporan) {
      try {
        const body = {
          hasilPerjalanan: fullSpd.laporan.hasilPerjalanan,
          penandatangan: fullSpd.laporan.penandatangan as any,
          tanggalLaporan: fullSpd.laporan.tanggalLaporan
            ? new Date(fullSpd.laporan.tanggalLaporan).toISOString()
            : undefined,
        };
        const { buffer: lapBuffer } = await this.spdPdfService.generateLaporanPdf(spdId, body);
        const lapSubDoc = await PDFDocument.load(lapBuffer);
        const lapPages = await mergedDoc.copyPages(lapSubDoc, lapSubDoc.getPageIndices());
        for (const p of lapPages) {
          mergedDoc.addPage(p);
        }
      } catch (err) {
        console.warn(`[ArsipService] Gagal memuat Laporan PDF untuk SPD standalone ${spdId}:`, err);
      }
    }

    const mergedBytes = await mergedDoc.save();
    const cleanNomor = (spd.nomorSpd || 'SPD').replace(/[\/\\]/g, '_');
    return {
      buffer: Buffer.from(mergedBytes),
      fileName: `BUNDEL_ARSIP_${cleanNomor}.pdf`,
    };
  }
}

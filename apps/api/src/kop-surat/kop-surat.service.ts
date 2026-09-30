import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { detectPdfPaperSize } from './pdf-size.util';
import * as fs from 'fs';
import * as path from 'path';

export interface KopSuratItem {
  id: string;
  nama: string;
  keterangan: string | null;
  fileName: string;
  storedFileName: string;
  fileSize: string;
  paperSize: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class KopSuratService implements OnModuleInit {
  private readonly uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'kop-surat');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDirectoryAndSeed();
  }

  private async ensureDirectoryAndSeed() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // Clean up any legacy metadata.json so only PDF files exist in the folder
    const legacyMetadataFile = path.join(this.uploadDir, 'metadata.json');
    if (fs.existsSync(legacyMetadataFile)) {
      try {
        fs.unlinkSync(legacyMetadataFile);
      } catch {
        // ignore
      }
    }

    const defaultFileName = 'kop_setda_default.pdf';
    const defaultFilePath = path.join(this.uploadDir, defaultFileName);

    if (!fs.existsSync(defaultFilePath)) {
      const samplePdfContent = this.generateSamplePdfBuffer();
      fs.writeFileSync(defaultFilePath, samplePdfContent);
    }

    const count = await this.prisma.kopSurat.count();
    if (count === 0) {
      await this.prisma.kopSurat.create({
        data: {
          id: 'kop-1',
          nama: 'Kop 1 (Sekda Kab. Banggai Laut)',
          keterangan: 'Kop surat dinas resmi Sekretariat Daerah Kabupaten Banggai Laut untuk SPD',
          fileName: 'kop_sekda_banggai_laut.pdf',
          storedFileName: defaultFileName,
          fileSize: '1.2 KB',
          paperSize: 'A4',
          isDefault: true,
        },
      });
    }
  }

  private generateSamplePdfBuffer(): Buffer {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 260 >>
stream
BT
/F1 16 Tf
50 790 Td
(PEMERINTAH KABUPATEN BANGGAI LAUT) Tj
/F1 18 Tf
0 -24 Td
(SEKRETARIAT DAERAH) Tj
/F1 10 Tf
0 -18 Td
(Jl. Jogugu Sopamena No. 01, Banggai - Kode Pos 94791) Tj
0 -14 Td
(Telepon: (0453) 21101  -  Email: setda@banggailautkab.go.id) Tj
ET
0 0 0 RG
2.5 w
50 715 m 545 715 l S
0.7 w
50 710 m 545 710 l S
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000556 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
631
%%EOF
`;
    return Buffer.from(rawPdf, 'utf-8');
  }

  async findAll() {
    return this.prisma.kopSurat.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.kopSurat.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Kop Surat dengan ID '${id}' tidak ditemukan`);
    }
    return item;
  }

  getFilePath(storedFileName: string): string {
    const fullPath = path.join(this.uploadDir, storedFileName);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Berkas PDF tidak ditemukan pada folder server');
    }
    return fullPath;
  }

  async saveUploadedPdf(
    file: { originalname: string; buffer: Buffer; size: number },
    nama: string,
    keterangan?: string,
    isDefault = false,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Berkas PDF wajib diunggah');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      throw new BadRequestException('Hanya format PDF yang diperbolehkan');
    }

    const id = `kop-${Date.now()}`;
    const storedFileName = `${id}.pdf`;
    const destPath = path.join(this.uploadDir, storedFileName);

    // Store physical PDF file on disk folder
    fs.writeFileSync(destPath, file.buffer);

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const count = await this.prisma.kopSurat.count();
    const shouldBeDefault = isDefault || count === 0;

    if (shouldBeDefault) {
      await this.prisma.kopSurat.updateMany({
        data: { isDefault: false },
      });
    }

    // Detect paper size from PDF buffer
    const { paperSize } = detectPdfPaperSize(file.buffer);

    // Store metadata to SQLite database via Prisma
    return this.prisma.kopSurat.create({
      data: {
        id,
        nama: nama || `Kop Surat ${count + 1}`,
        keterangan: keterangan || null,
        fileName: file.originalname,
        storedFileName,
        fileSize: formatBytes(file.size),
        paperSize,
        isDefault: shouldBeDefault,
      },
    });
  }

  async setDefault(id: string) {
    const item = await this.prisma.kopSurat.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Kop Surat dengan ID '${id}' tidak ditemukan`);
    }

    await this.prisma.kopSurat.updateMany({
      data: { isDefault: false },
    });

    return this.prisma.kopSurat.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async delete(id: string) {
    const count = await this.prisma.kopSurat.count();
    if (count <= 1) {
      throw new BadRequestException('Minimal harus ada 1 kop surat tersimpan di database');
    }

    const target = await this.prisma.kopSurat.findUnique({
      where: { id },
    });
    if (!target) {
      throw new NotFoundException(`Kop Surat dengan ID '${id}' tidak ditemukan`);
    }

    // Delete physical PDF from folder
    const fullPath = path.join(this.uploadDir, target.storedFileName);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error('Error deleting PDF file:', err);
      }
    }

    // Delete metadata row from database
    await this.prisma.kopSurat.delete({
      where: { id },
    });

    if (target.isDefault) {
      const firstRemaining = await this.prisma.kopSurat.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (firstRemaining) {
        await this.prisma.kopSurat.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }
  }
}

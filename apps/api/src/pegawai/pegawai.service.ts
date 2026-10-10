import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface CreatePegawaiDto {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja?: string;
  isASN?: boolean;
  isPenandatangan?: boolean;
}

export interface UpdatePegawaiDto {
  nip?: string;
  nama?: string;
  pangkat?: string;
  golongan?: string;
  jabatan?: string;
  unitKerja?: string;
  isASN?: boolean;
  isPenandatangan?: boolean;
}

@Injectable()
export class PegawaiService {
  private readonly uploadDir = process.env.SIGNATURE_UPLOAD_DIR || (
    fs.existsSync(path.join(process.cwd(), 'apps', 'api', 'uploads', 'signatures'))
      ? path.join(process.cwd(), 'apps', 'api', 'uploads', 'signatures')
      : path.join(process.cwd(), 'uploads', 'signatures')
  );

  constructor(private readonly prisma: PrismaService) {}

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll(query?: string, isASN?: string | boolean, isPenandatangan?: string | boolean) {
    const where: any = {};

    if (isASN !== undefined && isASN !== 'SEMUA' && isASN !== '') {
      where.isASN = isASN === true || isASN === 'true' || isASN === '1';
    }

    if (isPenandatangan !== undefined && isPenandatangan !== 'SEMUA' && isPenandatangan !== '') {
      where.isPenandatangan = isPenandatangan === true || isPenandatangan === 'true' || isPenandatangan === '1';
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { nama: { contains: q } },
        { nip: { contains: q } },
        { jabatan: { contains: q } },
        { unitKerja: { contains: q } },
      ];
    }

    return this.prisma.pegawai.findMany({
      where,
      orderBy: [{ golongan: 'desc' }, { nama: 'asc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.pegawai.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Pegawai dengan ID '${id}' tidak ditemukan`);
    }
    return item;
  }

  async create(dto: CreatePegawaiDto) {
    const existing = await this.prisma.pegawai.findUnique({
      where: { nip: dto.nip.trim() },
    });
    if (existing) {
      throw new ConflictException(`Pegawai dengan NIP '${dto.nip}' sudah terdaftar`);
    }

    return this.prisma.pegawai.create({
      data: {
        nip: dto.nip.trim(),
        nama: dto.nama.trim(),
        pangkat: dto.pangkat.trim(),
        golongan: dto.golongan.trim(),
        jabatan: dto.jabatan.trim(),
        unitKerja: dto.unitKerja?.trim() || 'Sekretariat Daerah',
        isASN: dto.isASN !== undefined ? Boolean(dto.isASN) : true,
        isPenandatangan: dto.isPenandatangan !== undefined ? Boolean(dto.isPenandatangan) : false,
      },
    });
  }

  async update(id: string, dto: UpdatePegawaiDto) {
    await this.findById(id);

    if (dto.nip) {
      const existing = await this.prisma.pegawai.findFirst({
        where: {
          nip: dto.nip.trim(),
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`NIP '${dto.nip}' sudah digunakan oleh pegawai lain`);
      }
    }

    return this.prisma.pegawai.update({
      where: { id },
      data: {
        ...(dto.nip && { nip: dto.nip.trim() }),
        ...(dto.nama && { nama: dto.nama.trim() }),
        ...(dto.pangkat && { pangkat: dto.pangkat.trim() }),
        ...(dto.golongan && { golongan: dto.golongan.trim() }),
        ...(dto.jabatan && { jabatan: dto.jabatan.trim() }),
        ...(dto.unitKerja && { unitKerja: dto.unitKerja.trim() }),
        ...(dto.isASN !== undefined && { isASN: Boolean(dto.isASN) }),
        ...(dto.isPenandatangan !== undefined && { isPenandatangan: Boolean(dto.isPenandatangan) }),
      },
    });
  }

  async delete(id: string) {
    const item = await this.findById(id);
    if (item.tandaTangan) {
      const filePath = path.join(this.uploadDir, item.tandaTangan);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    await this.prisma.pegawai.delete({
      where: { id },
    });
    return { success: true, message: 'Pegawai berhasil dihapus' };
  }

  async saveSignature(id: string, file: any) {
    if (!file) {
      throw new BadRequestException('Berkas tanda tangan belum diunggah.');
    }
    const isPng = file.mimetype === 'image/png' || (file.originalname && file.originalname.toLowerCase().endsWith('.png'));
    if (!isPng) {
      throw new BadRequestException('Format berkas harus gambar PNG (.png).');
    }

    // Maksimal ukuran 2 MB
    if (file.size && file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Ukuran berkas tanda tangan maksimal 2 MB.');
    }

    // Validasi magic number PNG (89 50 4E 47)
    if (
      !file.buffer ||
      file.buffer.length < 24 ||
      file.buffer[0] !== 0x89 ||
      file.buffer[1] !== 0x50 ||
      file.buffer[2] !== 0x4E ||
      file.buffer[3] !== 0x47
    ) {
      throw new BadRequestException('Berkas yang diunggah bukan format PNG yang valid.');
    }

    // Baca dimensi asli gambar PNG (IHDR chunk)
    const width = file.buffer.readUInt32BE(16);
    const height = file.buffer.readUInt32BE(20);
    if (width < 100 || height < 40) {
      throw new BadRequestException(`Dimensi tanda tangan terlalu kecil (${width}x${height} px). Minimal lebar 100 px.`);
    }

    const pegawai = await this.findById(id);
    this.ensureUploadDir();

    if (pegawai.tandaTangan) {
      const oldPath = path.join(this.uploadDir, pegawai.tandaTangan);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    // Simpan file asli secara utuh (tidak dipotong / untrimmed)
    const fileName = `${id}_${Date.now()}.png`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.pegawai.update({
      where: { id },
      data: { tandaTangan: fileName },
    });
  }

  async getSignaturePath(id: string): Promise<string> {
    const pegawai = await this.findById(id);
    if (!pegawai.tandaTangan) {
      throw new NotFoundException('Pegawai belum memiliki berkas tanda tangan.');
    }
    const filePath = path.join(this.uploadDir, pegawai.tandaTangan);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Berkas tanda tangan tidak ditemukan di server.');
    }
    return filePath;
  }

  async deleteSignature(id: string) {
    const pegawai = await this.findById(id);
    if (pegawai.tandaTangan) {
      const filePath = path.join(this.uploadDir, pegawai.tandaTangan);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      return this.prisma.pegawai.update({
        where: { id },
        data: { tandaTangan: null },
      });
    }
    return pegawai;
  }
}

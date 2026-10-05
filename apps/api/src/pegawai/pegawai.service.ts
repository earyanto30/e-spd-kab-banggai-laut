import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePegawaiDto {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja?: string;
  isASN?: boolean;
}

export interface UpdatePegawaiDto {
  nip?: string;
  nama?: string;
  pangkat?: string;
  golongan?: string;
  jabatan?: string;
  unitKerja?: string;
  isASN?: boolean;
}

@Injectable()
export class PegawaiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string, isASN?: string | boolean) {
    const where: any = {};

    if (isASN !== undefined && isASN !== 'SEMUA' && isASN !== '') {
      where.isASN = isASN === true || isASN === 'true' || isASN === '1';
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
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.pegawai.delete({
      where: { id },
    });
    return { success: true, message: 'Pegawai berhasil dihapus' };
  }
}

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePegawaiDto {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan?: string;
  jabatanId?: string | null;
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
  jabatanId?: string | null;
  unitKerja?: string;
  isASN?: boolean;
  isPenandatangan?: boolean;
}

@Injectable()
export class PegawaiService {
  constructor(private readonly prisma: PrismaService) {}

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
        { jabatanRef: { is: { nama: { contains: q } } } },
        { unitKerja: { contains: q } },
      ];
    }

    return this.prisma.pegawai.findMany({
      where,
      include: {
        jabatanRef: true,
      },
      orderBy: [{ golongan: 'desc' }, { nama: 'asc' }],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.pegawai.findUnique({
      where: { id },
      include: {
        jabatanRef: true,
      },
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

    let finalJabatan = dto.jabatan?.trim() || '';
    let finalJabatanId = dto.jabatanId || null;

    if (finalJabatanId) {
      const jb = await this.prisma.jabatan.findUnique({
        where: { id: finalJabatanId },
      });
      if (jb) {
        if (!finalJabatan) finalJabatan = jb.nama;
      } else {
        finalJabatanId = null;
      }
    } else if (finalJabatan) {
      // Auto-match by name if jabatanId not explicitly provided
      const jb = await this.prisma.jabatan.findUnique({
        where: { nama: finalJabatan },
      });
      if (jb) {
        finalJabatanId = jb.id;
      }
    }

    return this.prisma.pegawai.create({
      data: {
        nip: dto.nip.trim(),
        nama: dto.nama.trim(),
        pangkat: dto.pangkat.trim(),
        golongan: dto.golongan.trim(),
        jabatan: finalJabatan,
        jabatanId: finalJabatanId,
        unitKerja: dto.unitKerja?.trim() || 'Sekretariat Daerah',
        isASN: dto.isASN !== undefined ? Boolean(dto.isASN) : true,
        isPenandatangan: dto.isPenandatangan !== undefined ? Boolean(dto.isPenandatangan) : false,
      },
      include: {
        jabatanRef: true,
      },
    });
  }

  async update(id: string, dto: UpdatePegawaiDto) {
    const current = await this.findById(id);

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

    let finalJabatan = dto.jabatan !== undefined ? dto.jabatan.trim() : undefined;
    let finalJabatanId = dto.jabatanId !== undefined ? dto.jabatanId : undefined;

    if (finalJabatanId) {
      const jb = await this.prisma.jabatan.findUnique({
        where: { id: finalJabatanId },
      });
      if (jb) {
        if (finalJabatan === undefined) finalJabatan = jb.nama;
      } else {
        finalJabatanId = null;
      }
    } else if (finalJabatan && finalJabatanId === undefined) {
      const jb = await this.prisma.jabatan.findUnique({
        where: { nama: finalJabatan },
      });
      if (jb) {
        finalJabatanId = jb.id;
      }
    }

    return this.prisma.pegawai.update({
      where: { id },
      data: {
        ...(dto.nip && { nip: dto.nip.trim() }),
        ...(dto.nama && { nama: dto.nama.trim() }),
        ...(dto.pangkat && { pangkat: dto.pangkat.trim() }),
        ...(dto.golongan && { golongan: dto.golongan.trim() }),
        ...(finalJabatan !== undefined && { jabatan: finalJabatan }),
        ...(finalJabatanId !== undefined && { jabatanId: finalJabatanId }),
        ...(dto.unitKerja && { unitKerja: dto.unitKerja.trim() }),
        ...(dto.isASN !== undefined && { isASN: Boolean(dto.isASN) }),
        ...(dto.isPenandatangan !== undefined && { isPenandatangan: Boolean(dto.isPenandatangan) }),
      },
      include: {
        jabatanRef: true,
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

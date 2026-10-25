import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJabatanDto, UpdateJabatanDto } from '@si-setda/shared-types';

@Injectable()
export class JabatanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string) {
    const where: any = {};
    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { nama: { contains: q } },
        { keterangan: { contains: q } },
      ];
    }

    return this.prisma.jabatan.findMany({
      where,
      include: {
        _count: {
          select: { pegawaiList: true },
        },
      },
      orderBy: [
        { urutan: 'asc' },
        { nama: 'asc' },
      ],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.jabatan.findUnique({
      where: { id },
      include: {
        pegawaiList: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Jabatan dengan ID '${id}' tidak ditemukan`);
    }

    return item;
  }

  async create(dto: CreateJabatanDto) {
    const existing = await this.prisma.jabatan.findUnique({
      where: { nama: dto.nama.trim() },
    });
    if (existing) {
      throw new ConflictException(`Jabatan dengan nama '${dto.nama}' sudah terdaftar`);
    }

    return this.prisma.jabatan.create({
      data: {
        nama: dto.nama.trim(),
        keterangan: dto.keterangan?.trim() || null,
        urutan: dto.urutan !== undefined ? Number(dto.urutan) : 0,
      },
    });
  }

  async update(id: string, dto: UpdateJabatanDto) {
    await this.findById(id);

    if (dto.nama) {
      const existing = await this.prisma.jabatan.findFirst({
        where: {
          nama: dto.nama.trim(),
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`Jabatan dengan nama '${dto.nama}' sudah digunakan`);
      }
    }

    const updated = await this.prisma.jabatan.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined && { nama: dto.nama.trim() }),
        ...(dto.keterangan !== undefined && { keterangan: dto.keterangan?.trim() || null }),
        ...(dto.urutan !== undefined && { urutan: Number(dto.urutan) }),
      },
    });

    // If jabatan name changed, sync with linked pegawai
    if (dto.nama) {
      await this.prisma.pegawai.updateMany({
        where: { jabatanId: id },
        data: { jabatan: dto.nama.trim() },
      });
    }

    return updated;
  }

  async remove(id: string) {
    await this.findById(id);

    // Unlink any pegawai referencing this jabatan
    await this.prisma.pegawai.updateMany({
      where: { jabatanId: id },
      data: { jabatanId: null },
    });

    await this.prisma.jabatan.delete({
      where: { id },
    });

    return { success: true, message: 'Jabatan berhasil dihapus' };
  }
}

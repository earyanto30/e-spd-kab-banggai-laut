import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDasarHukumDto, UpdateDasarHukumDto } from '@si-setda/shared-types';

@Injectable()
export class DasarHukumService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string) {
    const where: any = {};
    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { judul: { contains: q } },
        { isi: { contains: q } },
      ];
    }

    return this.prisma.dasarHukum.findMany({
      where,
      orderBy: [
        { urutan: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findById(id: string) {
    const item = await this.prisma.dasarHukum.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Dasar Hukum dengan ID '${id}' tidak ditemukan`);
    }

    return item;
  }

  async create(dto: CreateDasarHukumDto) {
    return this.prisma.dasarHukum.create({
      data: {
        judul: dto.judul.trim(),
        isi: dto.isi.trim(),
        urutan: dto.urutan !== undefined ? Number(dto.urutan) : 0,
      },
    });
  }

  async update(id: string, dto: UpdateDasarHukumDto) {
    await this.findById(id);

    return this.prisma.dasarHukum.update({
      where: { id },
      data: {
        ...(dto.judul !== undefined && { judul: dto.judul.trim() }),
        ...(dto.isi !== undefined && { isi: dto.isi.trim() }),
        ...(dto.urutan !== undefined && { urutan: Number(dto.urutan) }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.dasarHukum.delete({
      where: { id },
    });
  }
}

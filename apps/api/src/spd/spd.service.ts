import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpdDto, UpdateSpdDto } from '@si-setda/shared-types';

@Injectable()
export class SpdService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string, status?: string, startDate?: string, endDate?: string) {
    const where: any = {};

    if (status && status.trim() && status.trim() !== 'SEMUA') {
      where.status = status.trim();
    }

    if (startDate || endDate) {
      where.tanggalBerangkat = {};
      if (startDate) {
        where.tanggalBerangkat.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.tanggalBerangkat.lte = end;
      }
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { nomorSpd: { contains: q } },
        { dalamRangka: { contains: q } },
        { tempatTujuan: { contains: q } },
        { tempatBerangkat: { contains: q } },
        {
          pegawai: {
            OR: [
              { nama: { contains: q } },
              { nip: { contains: q } },
              { jabatan: { contains: q } },
            ],
          },
        },
      ];
    }

    return this.prisma.spd.findMany({
      where,
      include: {
        pegawai: true,
        kopSurat: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findById(id);
    return this.prisma.spd.update({
      where: { id },
      data: { status: status.trim() },
      include: {
        pegawai: true,
        kopSurat: true,
      },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.spd.findUnique({
      where: { id },
      include: {
        pegawai: true,
        kopSurat: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Surat Perjalanan Dinas dengan ID '${id}' tidak ditemukan`);
    }

    return item;
  }

  async create(dto: CreateSpdDto) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id: dto.pegawaiId },
    });
    if (!pegawai) {
      throw new NotFoundException(`Pegawai dengan ID '${dto.pegawaiId}' tidak ditemukan`);
    }

    // Auto-generate nomor SPD if not supplied
    let nomorSpd = dto.nomorSpd?.trim();
    if (!nomorSpd) {
      const year = new Date().getFullYear();
      const count = await this.prisma.spd.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      });
      const seq = String(count + 1).padStart(3, '0');
      nomorSpd = `${seq}/SPD/SETDA/${year}`;

      // Check collision
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        nomorSpd = `${String(count + 2).padStart(3, '0')}/SPD/SETDA/${year}`;
      }
    } else {
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        throw new ConflictException(`Nomor SPD '${nomorSpd}' sudah digunakan`);
      }
    }

    const tglBerangkat = new Date(dto.tanggalBerangkat);
    let tglKembali = dto.tanggalKembali ? new Date(dto.tanggalKembali) : new Date(tglBerangkat);
    if (!dto.tanggalKembali) {
      tglKembali.setDate(tglKembali.getDate() + Math.max(0, dto.lamaHari - 1));
    }

    return this.prisma.spd.create({
      data: {
        nomorSpd,
        pemberiPerintah: dto.pemberiPerintah.trim(),
        pegawaiId: dto.pegawaiId,
        dalamRangka: dto.dalamRangka.trim(),
        alatAngkut: dto.alatAngkut.trim(),
        tempatBerangkat: dto.tempatBerangkat.trim(),
        tempatTujuan: dto.tempatTujuan.trim(),
        lamaHari: Number(dto.lamaHari),
        tanggalBerangkat: tglBerangkat,
        tanggalKembali: tglKembali,
        skpd: dto.skpd?.trim() || 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
        kodeRekening: dto.kodeRekening?.trim() || null,
        tingkatBiaya: dto.tingkatBiaya?.trim() || null,
        pengikut: dto.pengikut?.trim() || null,
        keterangan: dto.keterangan?.trim() || null,
        kopSuratId: dto.kopSuratId || null,
        status: dto.status?.trim() || 'DRAFT',
      },
      include: {
        pegawai: true,
        kopSurat: true,
      },
    });
  }

  async update(id: string, dto: UpdateSpdDto) {
    const existing = await this.findById(id);

    if (dto.nomorSpd && dto.nomorSpd.trim() !== existing.nomorSpd) {
      const dup = await this.prisma.spd.findFirst({
        where: {
          nomorSpd: dto.nomorSpd.trim(),
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException(`Nomor SPD '${dto.nomorSpd}' sudah digunakan`);
      }
    }

    if (dto.pegawaiId && dto.pegawaiId !== existing.pegawaiId) {
      const pegawai = await this.prisma.pegawai.findUnique({
        where: { id: dto.pegawaiId },
      });
      if (!pegawai) {
        throw new NotFoundException(`Pegawai dengan ID '${dto.pegawaiId}' tidak ditemukan`);
      }
    }

    const data: any = {
      ...(dto.nomorSpd && { nomorSpd: dto.nomorSpd.trim() }),
      ...(dto.pemberiPerintah && { pemberiPerintah: dto.pemberiPerintah.trim() }),
      ...(dto.pegawaiId && { pegawaiId: dto.pegawaiId }),
      ...(dto.dalamRangka && { dalamRangka: dto.dalamRangka.trim() }),
      ...(dto.alatAngkut && { alatAngkut: dto.alatAngkut.trim() }),
      ...(dto.tempatBerangkat && { tempatBerangkat: dto.tempatBerangkat.trim() }),
      ...(dto.tempatTujuan && { tempatTujuan: dto.tempatTujuan.trim() }),
      ...(dto.lamaHari !== undefined && { lamaHari: Number(dto.lamaHari) }),
      ...(dto.skpd && { skpd: dto.skpd.trim() }),
      ...(dto.kodeRekening !== undefined && { kodeRekening: dto.kodeRekening?.trim() || null }),
      ...(dto.tingkatBiaya !== undefined && { tingkatBiaya: dto.tingkatBiaya?.trim() || null }),
      ...(dto.pengikut !== undefined && { pengikut: dto.pengikut?.trim() || null }),
      ...(dto.keterangan !== undefined && { keterangan: dto.keterangan?.trim() || null }),
      ...(dto.kopSuratId !== undefined && { kopSuratId: dto.kopSuratId || null }),
      ...(dto.status && { status: dto.status.trim() }),
    };

    if (dto.tanggalBerangkat) {
      data.tanggalBerangkat = new Date(dto.tanggalBerangkat);
    }

    if (dto.tanggalKembali) {
      data.tanggalKembali = new Date(dto.tanggalKembali);
    } else if (dto.tanggalBerangkat || dto.lamaHari !== undefined) {
      const tglBerangkat = data.tanggalBerangkat || existing.tanggalBerangkat;
      const lamaHari = data.lamaHari !== undefined ? data.lamaHari : existing.lamaHari;
      const tglKembali = new Date(tglBerangkat);
      tglKembali.setDate(tglKembali.getDate() + Math.max(0, lamaHari - 1));
      data.tanggalKembali = tglKembali;
    }

    return this.prisma.spd.update({
      where: { id },
      data,
      include: {
        pegawai: true,
        kopSurat: true,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.spd.delete({
      where: { id },
    });
    return { success: true, message: 'Surat Perjalanan Dinas berhasil dihapus' };
  }
}

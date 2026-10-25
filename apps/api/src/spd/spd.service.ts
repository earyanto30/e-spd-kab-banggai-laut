import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpdDto, UpdateSpdDto } from '@si-setda/shared-types';

@Injectable()
export class SpdService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
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
        suratTugas: true,
        penandatangan: true,
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
        suratTugas: true,
        penandatangan: true,
      },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.spd.findUnique({
      where: { id },
      include: {
        pegawai: true,
        kopSurat: true,
        suratTugas: true,
        penandatangan: true,
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

    // Auto-generate nomor SPD if not supplied or handle dynamic format [Prefix][Number]/SPD/[Year]
    let nomorSpd = dto.nomorSpd;
    if (nomorSpd) {
      if (nomorSpd.includes('/SPD/')) {
        // If nomor sequence before /SPD/ is empty or spaces, format as 4 spaces
        nomorSpd = nomorSpd
          .replace(/^([A-Za-z]*)\s*\/SPD\//i, '$1    /SPD/')
          .replace(/\s+$/, '');
      } else {
        nomorSpd = nomorSpd.trim();
      }
    }
    const isKpa = (dto.pemberiPerintah || '').toLowerCase().includes('kuasa');

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
      // Format standard: [Number]/SPD/[Year] or KPA[Number]/SPD/[Year]
      const prefix = isKpa ? 'KPA' : '';
      nomorSpd = `${prefix}${seq}/SPD/${year}`;

      // Check collision
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        nomorSpd = `${prefix}${String(count + 2).padStart(3, '0')}/SPD/${year}`;
      }
    } else {
      // Manual / custom nomorSpd: respect user prefix (do not force KPA if user left prefix empty)
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        throw new ConflictException(`Nomor SPD '${nomorSpd}' sudah digunakan`);
      }
    }

    const tglBerangkat = dto.tanggalBerangkat ? new Date(dto.tanggalBerangkat) : null;
    let tglKembali: Date | null = dto.tanggalKembali ? new Date(dto.tanggalKembali) : null;
    if (tglBerangkat && !tglKembali) {
      if (dto.lamaHari && Number(dto.lamaHari) > 0) {
        tglKembali = new Date(tglBerangkat);
        tglKembali.setDate(tglKembali.getDate() + Math.max(0, Number(dto.lamaHari) - 1));
      } else {
        tglKembali = new Date(tglBerangkat);
      }
    }

    let penandatanganId = dto.penandatanganId || null;
    let penandatanganNama = dto.penandatanganNama?.trim() || null;
    let penandatanganJabatan = dto.penandatanganJabatan?.trim() || null;
    let penandatanganPangkat = dto.penandatanganPangkat?.trim() || null;
    let penandatanganNip = dto.penandatanganNip?.trim() || null;

    if (penandatanganId) {
      const p = await this.prisma.pegawai.findUnique({ where: { id: penandatanganId } });
      if (p) {
        penandatanganNama = p.nama;
        penandatanganJabatan = p.jabatan;
        penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
        penandatanganNip = p.nip;
      }
    } else if (dto.suratTugasId) {
      const st = await this.prisma.suratTugas.findUnique({ where: { id: dto.suratTugasId } });
      if (st) {
        penandatanganId = st.penandatanganId || null;
        if (!penandatanganNama) penandatanganNama = st.penandatanganNama;
        if (!penandatanganJabatan) penandatanganJabatan = st.penandatanganJabatan;
        if (!penandatanganPangkat) penandatanganPangkat = st.penandatanganPangkat;
        if (!penandatanganNip) penandatanganNip = st.penandatanganNip;
      }
    }

    return this.prisma.spd.create({
      data: {
        nomorSpd,
        pemberiPerintah: dto.pemberiPerintah.trim(),
        pegawaiId: dto.pegawaiId,
        suratTugasId: dto.suratTugasId || null,
        dalamRangka: dto.dalamRangka.trim(),
        alatAngkut: dto.alatAngkut.trim(),
        tempatBerangkat: dto.tempatBerangkat.trim(),
        tempatTujuan: dto.tempatTujuan.trim(),
        lamaHari: dto.lamaHari !== undefined && dto.lamaHari !== null ? Number(dto.lamaHari) : null,
        tanggalBerangkat: tglBerangkat,
        tanggalKembali: tglKembali,
        skpd: dto.skpd?.trim() || 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
        kodeRekening: dto.kodeRekening?.trim() || null,
        tingkatBiaya: dto.tingkatBiaya?.trim() || null,
        pengikut: dto.pengikut?.trim() || null,
        keterangan: dto.keterangan?.trim() || null,
        kopSuratId: dto.kopSuratId || null,
        penandatanganId,
        penandatanganNama,
        penandatanganJabatan,
        penandatanganPangkat,
        penandatanganNip,
        status: dto.status?.trim() || 'DRAFT',
      },
      include: {
        pegawai: true,
        kopSurat: true,
        suratTugas: true,
        penandatangan: true,
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
      ...(dto.nomorSpd && {
        nomorSpd: dto.nomorSpd.includes('/SPD/')
          ? dto.nomorSpd.replace(/^([A-Za-z]*)\s*\/SPD\//i, '$1    /SPD/').replace(/\s+$/, '')
          : dto.nomorSpd.trim(),
      }),
      ...(dto.pemberiPerintah && { pemberiPerintah: dto.pemberiPerintah.trim() }),
      ...(dto.pegawaiId && { pegawaiId: dto.pegawaiId }),
      ...(dto.suratTugasId !== undefined && { suratTugasId: dto.suratTugasId || null }),
      ...(dto.dalamRangka && { dalamRangka: dto.dalamRangka.trim() }),
      ...(dto.alatAngkut && { alatAngkut: dto.alatAngkut.trim() }),
      ...(dto.tempatBerangkat && { tempatBerangkat: dto.tempatBerangkat.trim() }),
      ...(dto.tempatTujuan && { tempatTujuan: dto.tempatTujuan.trim() }),
      ...(dto.lamaHari !== undefined && { lamaHari: dto.lamaHari !== null ? Number(dto.lamaHari) : null }),
      ...(dto.tanggalBerangkat !== undefined && {
        tanggalBerangkat: dto.tanggalBerangkat ? new Date(dto.tanggalBerangkat) : null,
      }),
      ...(dto.tanggalKembali !== undefined && {
        tanggalKembali: dto.tanggalKembali ? new Date(dto.tanggalKembali) : null,
      }),
      ...(dto.skpd && { skpd: dto.skpd.trim() }),
      ...(dto.kodeRekening !== undefined && { kodeRekening: dto.kodeRekening?.trim() || null }),
      ...(dto.tingkatBiaya !== undefined && { tingkatBiaya: dto.tingkatBiaya?.trim() || null }),
      ...(dto.pengikut !== undefined && { pengikut: dto.pengikut?.trim() || null }),
      ...(dto.keterangan !== undefined && { keterangan: dto.keterangan?.trim() || null }),
      ...(dto.kopSuratId !== undefined && { kopSuratId: dto.kopSuratId || null }),
      ...(dto.status && { status: dto.status.trim() }),
    };

    if (dto.penandatanganId !== undefined) {
      data.penandatanganId = dto.penandatanganId || null;
      if (dto.penandatanganId) {
        const p = await this.prisma.pegawai.findUnique({ where: { id: dto.penandatanganId } });
        if (p) {
          data.penandatanganNama = p.nama;
          data.penandatanganJabatan = p.jabatan;
          data.penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
          data.penandatanganNip = p.nip;
        }
      }
    }
    if (dto.penandatanganNama !== undefined && !data.penandatanganNama) data.penandatanganNama = dto.penandatanganNama?.trim() || null;
    if (dto.penandatanganJabatan !== undefined && !data.penandatanganJabatan) data.penandatanganJabatan = dto.penandatanganJabatan?.trim() || null;
    if (dto.penandatanganPangkat !== undefined && !data.penandatanganPangkat) data.penandatanganPangkat = dto.penandatanganPangkat?.trim() || null;
    if (dto.penandatanganNip !== undefined && !data.penandatanganNip) data.penandatanganNip = dto.penandatanganNip?.trim() || null;

    if (dto.tanggalBerangkat) {
      data.tanggalBerangkat = new Date(dto.tanggalBerangkat);
    }

    if (dto.tanggalKembali !== undefined) {
      data.tanggalKembali = dto.tanggalKembali ? new Date(dto.tanggalKembali) : null;
    } else if (dto.tanggalBerangkat || dto.lamaHari !== undefined) {
      const tglBerangkat = data.tanggalBerangkat || existing.tanggalBerangkat;
      const lamaHari = data.lamaHari !== undefined ? data.lamaHari : existing.lamaHari;
      if (lamaHari && Number(lamaHari) > 0) {
        const tglKembali = new Date(tglBerangkat);
        tglKembali.setDate(tglKembali.getDate() + Math.max(0, Number(lamaHari) - 1));
        data.tanggalKembali = tglKembali;
      } else {
        data.tanggalKembali = tglBerangkat ? new Date(tglBerangkat) : null;
      }
    }

    const updatedSpd = await this.prisma.spd.update({
      where: { id },
      data,
      include: {
        pegawai: true,
        kopSurat: true,
        suratTugas: true,
        penandatangan: true,
      },
    });

    // Mekanisme Sinkronisasi 2 Arah: Jika SPD terkait dengan Surat Tugas, sinkronkan data penugasan
    if (existing.suratTugasId) {
      const stUpdateData: any = {};
      if (dto.dalamRangka) {
        const cleanStLines = dto.dalamRangka
          .split(/\r?\n/)
          .map((l) => l.trim().replace(/^\d+[\.\)]\s*/, ''))
          .filter(Boolean)
          .join('\n');
        stUpdateData.dalamRangka = cleanStLines || dto.dalamRangka.trim();
      }
      if (dto.tempatBerangkat) stUpdateData.tempatDikeluarkan = dto.tempatBerangkat.trim();

      if (Object.keys(stUpdateData).length > 0) {
        await this.prisma.suratTugas.update({
          where: { id: existing.suratTugasId },
          data: stUpdateData,
        });

        // Sinkronkan juga perubahan penugasan ke seluruh dokumen SPD turunan lainnya di bawah Surat Tugas ini
        const siblingSpdSyncData: any = {};
        if (dto.dalamRangka) siblingSpdSyncData.dalamRangka = dto.dalamRangka.trim();
        if (dto.tempatTujuan) siblingSpdSyncData.tempatTujuan = dto.tempatTujuan.trim();
        if (dto.tempatBerangkat) siblingSpdSyncData.tempatBerangkat = dto.tempatBerangkat.trim();
        if (dto.alatAngkut) siblingSpdSyncData.alatAngkut = dto.alatAngkut.trim();
        if (dto.lamaHari !== undefined) siblingSpdSyncData.lamaHari = dto.lamaHari !== null ? Number(dto.lamaHari) : null;
        if (dto.tanggalBerangkat !== undefined) {
          siblingSpdSyncData.tanggalBerangkat = dto.tanggalBerangkat ? new Date(dto.tanggalBerangkat) : null;
          siblingSpdSyncData.tanggalKembali = data.tanggalKembali;
        }

        if (Object.keys(siblingSpdSyncData).length > 0) {
          await this.prisma.spd.updateMany({
            where: {
              suratTugasId: existing.suratTugasId,
              NOT: { id },
            },
            data: siblingSpdSyncData,
          });
        }
      }
    }

    return updatedSpd;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.spd.delete({
      where: { id },
    });
    return { success: true, message: 'Surat Perjalanan Dinas berhasil dihapus' };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada SPD yang dipilih.' };
    }
    const result = await this.prisma.spd.deleteMany({
      where: { id: { in: ids } },
    });
    return {
      success: true,
      count: result.count,
      message: `Berhasil menghapus ${result.count} data Surat Perjalanan Dinas.`,
    };
  }
}

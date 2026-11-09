import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
    laporanStatus?: string,
  ) {
    const where: any = {};

    if (status && status.trim() && status.trim() !== 'SEMUA') {
      where.status = status.trim();
    }

    if (laporanStatus === 'sudah') {
      where.laporan = { isNot: null };
    } else if (laporanStatus === 'belum') {
      where.laporan = null;
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
        laporan: true,
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
        laporan: true,
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
        laporan: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Surat Perjalanan Dinas dengan ID '${id}' tidak ditemukan`);
    }

    return item;
  }

  async checkNumberAvailability(nomor: string, excludeId?: string, count: number = 1) {
    if (!nomor || !nomor.trim()) {
      return { available: true, isPlaceholder: true, message: 'Nomor belum diisi' };
    }
    const cleanNomor = nomor.trim();
    if (
      nomor.includes('  ') ||
      cleanNomor.includes('[') ||
      cleanNomor.includes(']') ||
      cleanNomor.includes('//') ||
      cleanNomor.startsWith('/') ||
      cleanNomor.includes('  ')
    ) {
      return { available: true, isPlaceholder: true, message: 'Nomor otomatis / belum lengkap' };
    }

    if (count > 1) {
      const parts = cleanNomor.split('/SPD/');
      if (parts.length === 2) {
        const left = parts[0];
        const right = parts[1];
        const leftParts = left.split('/');
        const rawSeq = leftParts[leftParts.length - 1];
        const prefix = leftParts.slice(0, leftParts.length - 1).join('/');
        const startSeqNum = parseInt(rawSeq, 10);

        if (!isNaN(startSeqNum)) {
          const padLen = rawSeq.length;
          const numbersToCheck: string[] = [];
          for (let i = 0; i < count; i++) {
            const nextSeq = String(startSeqNum + i).padStart(padLen, '0');
            const fullNum = prefix ? `${prefix}/${nextSeq}/SPD/${right}` : `${nextSeq}/SPD/${right}`;
            numbersToCheck.push(fullNum);
          }

          const existingList = await this.prisma.spd.findMany({
            where: {
              nomorSpd: { in: numbersToCheck },
              ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true, nomorSpd: true },
          });

          if (existingList.length > 0) {
            const conflicted = existingList.map((e) => e.nomorSpd).join(', ');
            return {
              available: false,
              nomor: cleanNomor,
              conflictNomor: conflicted,
              message: `Nomor SPD '${conflicted}' sudah digunakan`,
            };
          }

          return {
            available: true,
            nomor: cleanNomor,
            message: `Seluruh ${count} nomor SPD tersedia`,
          };
        }
      }
    }

    const existing = await this.prisma.spd.findFirst({
      where: {
        nomorSpd: cleanNomor,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, nomorSpd: true },
    });

    if (existing) {
      return {
        available: false,
        nomor: cleanNomor,
        conflictNomor: cleanNomor,
        message: `Nomor SPD '${cleanNomor}' sudah digunakan`,
      };
    }

    return {
      available: true,
      nomor: cleanNomor,
      message: 'Nomor SPD tersedia',
    };
  }

  async saveLaporan(id: string, dto: { hasilPerjalanan: string; penandatangan: string; tanggalLaporan?: string }) {
    const spd = await this.findById(id);
    const laporan = await this.prisma.laporanPerjalanan.upsert({
      where: { spdId: id },
      create: {
        spdId: id,
        suratTugasId: spd.suratTugasId || null,
        hasilPerjalanan: dto.hasilPerjalanan.trim(),
        penandatangan: dto.penandatangan.trim(),
        tanggalLaporan: dto.tanggalLaporan ? new Date(dto.tanggalLaporan) : new Date(),
      },
      update: {
        suratTugasId: spd.suratTugasId || null,
        hasilPerjalanan: dto.hasilPerjalanan.trim(),
        penandatangan: dto.penandatangan.trim(),
        tanggalLaporan: dto.tanggalLaporan ? new Date(dto.tanggalLaporan) : new Date(),
      },
      include: {
        spd: {
          include: {
            pegawai: true,
          },
        },
        suratTugas: true,
      },
    });

    // Automatically update SPD status to SELESAI upon report creation
    await this.prisma.spd.update({
      where: { id },
      data: { status: 'SELESAI' },
    });

    // If linked to a Surat Tugas, check if all associated SPDs are SELESAI or have reports
    if (spd.suratTugasId) {
      const remainingSpds = await this.prisma.spd.findMany({
        where: {
          suratTugasId: spd.suratTugasId,
          NOT: { id },
        },
        select: { id: true, status: true, laporan: { select: { id: true } } },
      });
      const allFinished = remainingSpds.every((s) => s.status === 'SELESAI' || !!s.laporan);
      if (allFinished) {
        await this.prisma.suratTugas.update({
          where: { id: spd.suratTugasId },
          data: { status: 'SELESAI' },
        });
      }
    }

    return laporan;
  }

  async deleteLaporan(spdId: string) {
    const existing = await this.prisma.laporanPerjalanan.findUnique({
      where: { spdId },
    });
    if (!existing) {
      throw new NotFoundException(`Laporan perjalanan dinas untuk SPD '${spdId}' tidak ditemukan.`);
    }
    const result = await this.prisma.laporanPerjalanan.delete({
      where: { spdId },
    });

    // Revert SPD status back to DISETUJUI
    await this.prisma.spd.update({
      where: { id: spdId },
      data: { status: 'DISETUJUI' },
    });

    // If linked to a Surat Tugas, revert Surat Tugas status back to DISETUJUI
    if (existing.suratTugasId) {
      await this.prisma.suratTugas.update({
        where: { id: existing.suratTugasId },
        data: { status: 'DISETUJUI' },
      });
    }

    return result;
  }

  async create(dto: CreateSpdDto) {
    const pegawai = await this.prisma.pegawai.findUnique({
      where: { id: dto.pegawaiId },
    });
    if (!pegawai) {
      throw new NotFoundException(`Pegawai dengan ID '${dto.pegawaiId}' tidak ditemukan`);
    }

    // Auto-generate nomor SPD if not supplied or handle dynamic format [Prefix/][Number]/SPD/[Year]
    let nomorSpd = dto.nomorSpd;
    if (nomorSpd) {
      if (nomorSpd.includes('/SPD/')) {
        // If prefix with empty/spaces sequence: [prefix]/ /SPD/ -> [prefix]/    /SPD/
        nomorSpd = nomorSpd
          .replace(/^([A-Za-z0-9_-]+)\/\s*\/SPD\//i, '$1/    /SPD/')
          .replace(/^\s*\/SPD\//i, '    /SPD/')
          .trimEnd();
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
      // Format standard: [Number]/SPD/[Year] or [Prefix]/[Number]/SPD/[Year]
      const prefix = isKpa ? 'KPA' : '';
      const prefixPart = prefix ? `${prefix}/` : '';
      nomorSpd = `${prefixPart}${seq}/SPD/${year}`;

      // Check collision
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        nomorSpd = `${prefixPart}${String(count + 2).padStart(3, '0')}/SPD/${year}`;
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
        penandatanganJabatan = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
        penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
        penandatanganNip = p.nip;
      }
    } else if (dto.suratTugasId) {
      const st = await this.prisma.suratTugas.findUnique({ where: { id: dto.suratTugasId } });
      if (st) {
        if (st.status !== 'DISETUJUI') {
          throw new BadRequestException(
            'Surat Perjalanan Dinas (SPD) hanya dapat dibuat untuk Surat Tugas yang telah disetujui (status DISETUJUI).',
          );
        }
        penandatanganId = st.penandatanganId || null;
        if (!penandatanganNama) penandatanganNama = st.penandatanganNama;
        penandatanganJabatan = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
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
    if (existing.status === 'ARSIP') {
      throw new BadRequestException(
        `Dokumen SPD nomor '${existing.nomorSpd}' telah berstatus ARSIP dan terkunci. Harap pulihkan status dokumen terlebih dahulu sebelum melakukan perubahan.`
      );
    }
    const isKpa = (dto.pemberiPerintah || existing.pemberiPerintah || '').toLowerCase().includes('kuasa');

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
          ? dto.nomorSpd
              .replace(/^([A-Za-z0-9_-]+)\/\s*\/SPD\//i, '$1/    /SPD/')
              .replace(/^([A-Za-z0-9_-]*)\s*\/SPD\//i, '$1    /SPD/')
              .replace(/\s+$/, '')
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
          data.penandatanganJabatan = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
          data.penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
          data.penandatanganNip = p.nip;
        }
      }
    } else if (dto.pemberiPerintah) {
      data.penandatanganJabatan = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
    }
    if (dto.penandatanganNama !== undefined && !data.penandatanganNama) data.penandatanganNama = dto.penandatanganNama?.trim() || null;
    if (dto.penandatanganJabatan !== undefined && !data.penandatanganJabatan) data.penandatanganJabatan = isKpa ? 'Kuasa Pengguna Anggaran' : 'Pengguna Anggaran';
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
    const existing = await this.findById(id);
    if (existing.status === 'ARSIP') {
      throw new BadRequestException(
        `Dokumen SPD nomor '${existing.nomorSpd}' telah berstatus ARSIP dan terkunci. Harap pulihkan status dokumen terlebih dahulu sebelum menghapus.`
      );
    }
    await this.prisma.spd.delete({
      where: { id },
    });
    return { success: true, message: 'Surat Perjalanan Dinas berhasil dihapus' };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0, message: 'Tidak ada SPD yang dipilih.' };
    }
    const archivedItems = await this.prisma.spd.findMany({
      where: { id: { in: ids }, status: 'ARSIP' },
      select: { nomorSpd: true },
    });
    if (archivedItems.length > 0) {
      throw new BadRequestException(
        `Terdapat ${archivedItems.length} dokumen SPD yang telah berstatus ARSIP dan terkunci. Harap pulihkan statusnya terlebih dahulu sebelum menghapus.`
      );
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

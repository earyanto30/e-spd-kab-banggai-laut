import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpdDto, UpdateSpdDto, Role } from '@si-setda/shared-types';

@Injectable()
export class SpdService {
  constructor(private readonly prisma: PrismaService) {}

  private isPenandatanganOnly(currentUser?: any): boolean {
    if (!currentUser) return false;
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.ADMIN) {
      return false;
    }
    return currentUser.role === Role.PENANDATANGAN || currentUser.isPenandatangan === true;
  }

  private buildSpdSignerOrConditions(currentUser: any): any[] {
    const conditions: any[] = [];
    if (!currentUser) return conditions;

    if (currentUser.pegawaiId) {
      conditions.push({ penandatanganId: currentUser.pegawaiId });
      conditions.push({ suratTugas: { penandatanganId: currentUser.pegawaiId } });
    }

    const rawNip = (currentUser.nip || '').trim();
    const cleanNip = rawNip.replace(/[^0-9]/g, '');
    if (cleanNip.length >= 8) {
      conditions.push({ penandatanganNip: { contains: cleanNip } });
      conditions.push({ suratTugas: { penandatanganNip: { contains: cleanNip } } });
    }
    if (rawNip.length > 0) {
      conditions.push({ penandatanganNip: { contains: rawNip } });
      conditions.push({ suratTugas: { penandatanganNip: { contains: rawNip } } });
    }

    const username = (currentUser.username || '').trim();
    if (username && /^\d{8,}$/.test(username)) {
      conditions.push({ penandatanganNip: { contains: username } });
      conditions.push({ suratTugas: { penandatanganNip: { contains: username } } });
    }

    const name = (currentUser.name || '').trim();
    if (name.length > 0) {
      conditions.push({ penandatanganNama: { contains: name } });
      conditions.push({ suratTugas: { penandatanganNama: { contains: name } } });
      const cleanName = name
        .replace(/^(drs\.|dr\.|ir\.|h\.|hj\.)\s+/gi, '')
        .split(',')[0]
        .trim();
      if (cleanName.length >= 4 && cleanName !== name) {
        conditions.push({ penandatanganNama: { contains: cleanName } });
        conditions.push({ suratTugas: { penandatanganNama: { contains: cleanName } } });
      }
    }

    if (currentUser.jabatan && currentUser.jabatan.trim()) {
      conditions.push({ penandatanganJabatan: { contains: currentUser.jabatan.trim() } });
      conditions.push({ suratTugas: { penandatanganJabatan: { contains: currentUser.jabatan.trim() } } });

      const userJab = currentUser.jabatan.toLowerCase();
      if (userJab.includes('sekretaris daerah') || userJab.includes('sekda')) {
        conditions.push({ pemberiPerintah: { contains: 'Pengguna Anggaran' } });
      } else if (userJab.includes('bagian umum') || userJab.includes('kpa')) {
        conditions.push({ pemberiPerintah: { contains: 'Kuasa Pengguna Anggaran' } });
      }
    }

    return conditions;
  }

  private verifySignerAccess(currentUser: any, item: any) {
    if (!this.isPenandatanganOnly(currentUser)) return;

    if (currentUser.pegawaiId && item.penandatanganId && item.penandatanganId === currentUser.pegawaiId) {
      return;
    }
    if (currentUser.pegawaiId && item.suratTugas?.penandatanganId && item.suratTugas.penandatanganId === currentUser.pegawaiId) {
      return;
    }

    const rawNip = (currentUser.nip || '').trim();
    const cleanNip = rawNip.replace(/[^0-9]/g, '');
    const username = (currentUser.username || '').trim();
    const isUsernameNip = /^\d{8,}$/.test(username);
    const name = (currentUser.name || '').toLowerCase().trim();
    const cleanName = name
      .replace(/^(drs\.|dr\.|ir\.|h\.|hj\.)\s+/gi, '')
      .split(',')[0]
      .trim();

    // Direct SPD signer check
    const docNip = (item.penandatanganNip || '').replace(/[^0-9]/g, '');
    const docRawNip = (item.penandatanganNip || '').trim();
    const docNama = (item.penandatanganNama || '').toLowerCase().trim();
    const docJabatan = (item.penandatanganJabatan || '').toLowerCase().trim();

    if (cleanNip.length >= 8 && docNip.includes(cleanNip)) return;
    if (rawNip.length > 0 && docRawNip.includes(rawNip)) return;
    if (isUsernameNip && docNip.includes(username)) return;
    if (name.length > 0 && (docNama.includes(name) || name.includes(docNama))) return;
    if (cleanName.length >= 4 && (docNama.includes(cleanName) || cleanName.includes(docNama))) return;
    if (currentUser.jabatan && docJabatan.includes(currentUser.jabatan.toLowerCase().trim())) return;

    // Check connected Surat Tugas
    if (item.suratTugas) {
      const stNip = (item.suratTugas.penandatanganNip || '').replace(/[^0-9]/g, '');
      const stRawNip = (item.suratTugas.penandatanganNip || '').trim();
      const stNama = (item.suratTugas.penandatanganNama || '').toLowerCase().trim();
      const stJabatan = (item.suratTugas.penandatanganJabatan || '').toLowerCase().trim();

      if (cleanNip.length >= 8 && stNip.includes(cleanNip)) return;
      if (rawNip.length > 0 && stRawNip.includes(rawNip)) return;
      if (isUsernameNip && stNip.includes(username)) return;
      if (name.length > 0 && (stNama.includes(name) || name.includes(stNama))) return;
      if (cleanName.length >= 4 && (stNama.includes(cleanName) || cleanName.includes(stNama))) return;
      if (currentUser.jabatan && stJabatan.includes(currentUser.jabatan.toLowerCase().trim())) return;
    }

    // Check pemberiPerintah authority
    if (item.pemberiPerintah && currentUser.jabatan) {
      const userJab = currentUser.jabatan.toLowerCase();
      const pemberi = item.pemberiPerintah.toLowerCase();
      if ((userJab.includes('sekretaris daerah') || userJab.includes('sekda')) && pemberi.includes('pengguna anggaran')) {
        return;
      }
      if ((userJab.includes('bagian umum') || userJab.includes('kpa')) && pemberi.includes('kuasa pengguna anggaran')) {
        return;
      }
    }

    throw new ForbiddenException(
      'Anda tidak memiliki hak akses untuk melihat dokumen SPD ini karena dokumen ini ditugaskan untuk pejabat penandatangan lain.'
    );
  }

  async findAll(
    query?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    currentUser?: any,
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

    if (this.isPenandatanganOnly(currentUser)) {
      const signerOr = this.buildSpdSignerOrConditions(currentUser);
      const finalSignerCondition = signerOr.length > 0 ? signerOr : [{ id: '__NO_ACCESS__' }];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: finalSignerCondition },
        ];
        delete where.OR;
      } else {
        where.OR = finalSignerCondition;
      }
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

  async findById(id: string, currentUser?: any) {
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

    this.verifySignerAccess(currentUser, item);

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
        lamaHari: Number(dto.lamaHari),
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
      ...(dto.nomorSpd && { nomorSpd: dto.nomorSpd.trim() }),
      ...(dto.pemberiPerintah && { pemberiPerintah: dto.pemberiPerintah.trim() }),
      ...(dto.pegawaiId && { pegawaiId: dto.pegawaiId }),
      ...(dto.suratTugasId !== undefined && { suratTugasId: dto.suratTugasId || null }),
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
        suratTugas: true,
        penandatangan: true,
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

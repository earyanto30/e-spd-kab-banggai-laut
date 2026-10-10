import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSuratTugasDto, UpdateSuratTugasDto, GenerateSpdFromSuratTugasDto, DASAR_HUKUM_DEFAULT, Role } from '@si-setda/shared-types';

@Injectable()
export class SuratTugasService {
  constructor(private readonly prisma: PrismaService) {}

  private isPenandatanganOnly(currentUser?: any): boolean {
    if (!currentUser) return false;
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.ADMIN) {
      return false;
    }
    return currentUser.role === Role.PENANDATANGAN || currentUser.isPenandatangan === true;
  }

  private buildSignerOrConditions(currentUser: any): any[] {
    const conditions: any[] = [];
    if (!currentUser) return conditions;

    if (currentUser.pegawaiId) {
      conditions.push({ penandatanganId: currentUser.pegawaiId });
    }

    const rawNip = (currentUser.nip || '').trim();
    const cleanNip = rawNip.replace(/[^0-9]/g, '');
    if (cleanNip.length >= 8) {
      conditions.push({ penandatanganNip: { contains: cleanNip } });
    }
    if (rawNip.length > 0) {
      conditions.push({ penandatanganNip: { contains: rawNip } });
    }

    const username = (currentUser.username || '').trim();
    if (username && /^\d{8,}$/.test(username)) {
      conditions.push({ penandatanganNip: { contains: username } });
    }

    const name = (currentUser.name || '').trim();
    if (name.length > 0) {
      conditions.push({ penandatanganNama: { contains: name } });
      const cleanName = name
        .replace(/^(drs\.|dr\.|ir\.|h\.|hj\.)\s+/gi, '')
        .split(',')[0]
        .trim();
      if (cleanName.length >= 4 && cleanName !== name) {
        conditions.push({ penandatanganNama: { contains: cleanName } });
      }
    }

    if (currentUser.jabatan && currentUser.jabatan.trim()) {
      conditions.push({ penandatanganJabatan: { contains: currentUser.jabatan.trim() } });
    }

    return conditions;
  }

  private verifySignerAccess(currentUser: any, item: any) {
    if (!this.isPenandatanganOnly(currentUser)) return;

    if (currentUser.pegawaiId && item.penandatanganId && item.penandatanganId === currentUser.pegawaiId) {
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

    throw new ForbiddenException(
      'Anda tidak memiliki hak akses untuk melihat dokumen Surat Tugas ini karena dokumen ini ditugaskan untuk pejabat penandatangan lain.'
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
      where.tanggalSurat = {};
      if (startDate) {
        where.tanggalSurat.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.tanggalSurat.lte = end;
      }
    }

    if (query && query.trim()) {
      const q = query.trim();
      const matchedPegawai = await this.prisma.pegawai.findMany({
        where: {
          OR: [
            { nama: { contains: q } },
            { nip: { contains: q } },
            { jabatan: { contains: q } },
          ],
        },
        select: { id: true },
      });
      const matchedPegawaiIds = matchedPegawai.map((p) => p.id);

      const orConditions: any[] = [
        { nomorSurat: { contains: q } },
        { dalamRangka: { contains: q } },
        {
          spdList: {
            some: {
              pegawai: {
                OR: [
                  { nama: { contains: q } },
                  { nip: { contains: q } },
                  { jabatan: { contains: q } },
                ],
              },
            },
          },
        },
      ];

      for (const pId of matchedPegawaiIds) {
        orConditions.push({ pegawaiIds: { contains: pId } });
      }

      where.OR = orConditions;
    }

    if (this.isPenandatanganOnly(currentUser)) {
      const signerOr = this.buildSignerOrConditions(currentUser);
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

    const items = await this.prisma.suratTugas.findMany({
      where,
      include: {
        penandatangan: true,
        spdList: {
          include: {
            pegawai: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allMissingIds = new Set<string>();
    items.forEach((it) => {
      if (it.spdList.length === 0 && it.pegawaiIds) {
        try {
          const ids: string[] = JSON.parse(it.pegawaiIds);
          if (Array.isArray(ids)) {
            ids.forEach((id) => allMissingIds.add(id));
          }
        } catch {}
      }
    });

    const pegawaiMap = new Map<string, any>();
    if (allMissingIds.size > 0) {
      const fetched = await this.prisma.pegawai.findMany({
        where: { id: { in: Array.from(allMissingIds) } },
      });
      fetched.forEach((p) => pegawaiMap.set(p.id, p));
    }

    return items.map((it) => {
      let pegawaiList = it.spdList.map((s) => s.pegawai).filter(Boolean);
      if (pegawaiList.length === 0 && it.pegawaiIds) {
        try {
          const ids: string[] = JSON.parse(it.pegawaiIds);
          if (Array.isArray(ids)) {
            pegawaiList = ids.map((id) => pegawaiMap.get(id)).filter(Boolean);
          }
        } catch {}
      }
      return {
        ...it,
        pegawaiList,
      };
    });
  }

  async findById(id: string, currentUser?: any) {
    const item = await this.prisma.suratTugas.findUnique({
      where: { id },
      include: {
        penandatangan: true,
        spdList: {
          include: {
            pegawai: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Surat Tugas dengan ID '${id}' tidak ditemukan`);
    }

    this.verifySignerAccess(currentUser, item);

    let pegawaiList = item.spdList.map((s) => s.pegawai).filter(Boolean);
    if (pegawaiList.length === 0 && item.pegawaiIds) {
      try {
        const ids: string[] = JSON.parse(item.pegawaiIds);
        if (Array.isArray(ids) && ids.length > 0) {
          const fetched = await this.prisma.pegawai.findMany({
            where: { id: { in: ids } },
          });
          pegawaiList = ids.map((id) => fetched.find((p) => p.id === id)).filter(Boolean) as any;
        }
      } catch {}
    }

    return {
      ...item,
      pegawaiList,
    };
  }

  async create(dto: CreateSuratTugasDto) {
    const year = new Date().getFullYear();

    // Auto generate nomorSurat if not provided
    // Format: 000.1.2.3/{seq}/Bag.Umum/{year}
    let nomorSurat = dto.nomorSurat?.trim();
    if (!nomorSurat) {
      const count = await this.prisma.suratTugas.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      });
      const seq = String(count + 1).padStart(3, '0');
      nomorSurat = `000.1.2.3/${seq}/Bag.Umum/${year}`;

      // Check collision
      const existing = await this.prisma.suratTugas.findUnique({ where: { nomorSurat } });
      if (existing) {
        nomorSurat = `000.1.2.3/${String(count + 2).padStart(3, '0')}/Bag.Umum/${year}`;
      }
    } else {
      const existing = await this.prisma.suratTugas.findUnique({ where: { nomorSurat } });
      if (existing) {
        throw new ConflictException(`Nomor Surat '${nomorSurat}' sudah digunakan`);
      }
    }

    // Verify pegawai list
    const pegawaiList = await this.prisma.pegawai.findMany({
      where: { id: { in: dto.pegawaiIds } },
    });

    if (pegawaiList.length === 0) {
      throw new NotFoundException('Tidak ada data pegawai valid yang ditemukan');
    }

    const tglSurat = dto.tanggalSurat ? new Date(dto.tanggalSurat) : new Date();

    let penandatanganId = dto.penandatanganId || null;
    let penandatanganNama = dto.penandatanganNama?.trim();
    let penandatanganJabatan = dto.penandatanganJabatan?.trim();
    let penandatanganPangkat = dto.penandatanganPangkat?.trim();
    let penandatanganNip = dto.penandatanganNip?.trim();

    if (penandatanganId) {
      const p = await this.prisma.pegawai.findUnique({ where: { id: penandatanganId } });
      if (p) {
        penandatanganNama = p.nama;
        penandatanganJabatan = p.jabatan;
        penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
        penandatanganNip = p.nip;
      }
    } else if (penandatanganNip) {
      const cleanNip = penandatanganNip.replace(/[^0-9]/g, '');
      const match = await this.prisma.pegawai.findFirst({
        where: {
          isPenandatangan: true,
          nip: { contains: cleanNip },
        },
      });
      if (match) {
        penandatanganId = match.id;
        if (!penandatanganNama) penandatanganNama = match.nama;
        if (!penandatanganJabatan) penandatanganJabatan = match.jabatan;
        if (!penandatanganPangkat) penandatanganPangkat = match.golongan ? `${match.pangkat}, ${match.golongan}` : match.pangkat;
      }
    }

    // Create Surat Tugas as Parent with stored pegawaiIds
    const suratTugas = await this.prisma.suratTugas.create({
      data: {
        nomorSurat,
        dasarHukum: dto.dasarHukum?.trim() || DASAR_HUKUM_DEFAULT,
        dalamRangka: dto.dalamRangka.trim(),
        tempatDikeluarkan: dto.tempatDikeluarkan?.trim() || 'Banggai',
        tanggalSurat: tglSurat,
        penandatanganId,
        penandatanganNama: penandatanganNama || 'ARSID HAMIDI, SH',
        penandatanganJabatan: penandatanganJabatan || 'KEPALA BAGIAN UMUM SETDA KAB. BANGGAI LAUT',
        penandatanganPangkat: penandatanganPangkat || 'Pembina, IV/a',
        penandatanganNip: penandatanganNip || '19700830 200312 1 003',
        kopSuratId: dto.kopSuratId || null,
        status: dto.status?.trim() || 'DRAFT',
        pegawaiIds: JSON.stringify(dto.pegawaiIds),
        alatAngkut: dto.alatAngkut?.trim() || null,
        tempatTujuan: dto.tempatTujuan?.trim() || null,
        lamaHari: dto.lamaHari !== undefined ? Number(dto.lamaHari) : 1,
        tanggalBerangkat: dto.tanggalBerangkat ? new Date(dto.tanggalBerangkat) : null,
      },
    });

    // NOTE: SPDs are NOT created automatically here.
    // They will be generated on demand when user clicks "Terbitkan SPD".
    return this.findById(suratTugas.id);
  }

  async update(id: string, dto: UpdateSuratTugasDto) {
    const existingSt = await this.findById(id);

    const updateData: any = {};
    if (dto.nomorSurat) updateData.nomorSurat = dto.nomorSurat.trim();
    if (dto.dasarHukum) updateData.dasarHukum = dto.dasarHukum.trim();
    if (dto.dalamRangka) updateData.dalamRangka = dto.dalamRangka.trim();
    if (dto.tempatDikeluarkan) updateData.tempatDikeluarkan = dto.tempatDikeluarkan.trim();
    if (dto.tanggalSurat) updateData.tanggalSurat = new Date(dto.tanggalSurat);
    if (dto.penandatanganId !== undefined) {
      updateData.penandatanganId = dto.penandatanganId || null;
      if (dto.penandatanganId) {
        const p = await this.prisma.pegawai.findUnique({ where: { id: dto.penandatanganId } });
        if (p) {
          updateData.penandatanganNama = p.nama;
          updateData.penandatanganJabatan = p.jabatan;
          updateData.penandatanganPangkat = p.golongan ? `${p.pangkat}, ${p.golongan}` : p.pangkat;
          updateData.penandatanganNip = p.nip;
        }
      }
    }
    if (dto.penandatanganNama && !updateData.penandatanganNama) updateData.penandatanganNama = dto.penandatanganNama.trim();
    if (dto.penandatanganJabatan && !updateData.penandatanganJabatan) updateData.penandatanganJabatan = dto.penandatanganJabatan.trim();
    if (dto.penandatanganPangkat && !updateData.penandatanganPangkat) updateData.penandatanganPangkat = dto.penandatanganPangkat.trim();
    if (dto.penandatanganNip && !updateData.penandatanganNip) updateData.penandatanganNip = dto.penandatanganNip.trim();
    if (dto.kopSuratId !== undefined) updateData.kopSuratId = dto.kopSuratId;
    if (dto.status) updateData.status = dto.status.trim();
    if (dto.pegawaiIds && Array.isArray(dto.pegawaiIds)) {
      updateData.pegawaiIds = JSON.stringify(dto.pegawaiIds);
    }
    if (dto.alatAngkut !== undefined) updateData.alatAngkut = dto.alatAngkut?.trim() || null;
    if (dto.tempatTujuan !== undefined) updateData.tempatTujuan = dto.tempatTujuan?.trim() || null;
    if (dto.lamaHari !== undefined) updateData.lamaHari = Number(dto.lamaHari);
    if (dto.tanggalBerangkat !== undefined) {
      updateData.tanggalBerangkat = dto.tanggalBerangkat ? new Date(dto.tanggalBerangkat) : null;
    }

    const updatedSt = await this.prisma.suratTugas.update({
      where: { id },
      data: updateData,
      include: {
        penandatangan: true,
        spdList: {
          include: {
            pegawai: true,
          },
        },
      },
    });

    // Cek apakah SPD turunan sudah pernah diterbitkan
    const currentSpdList = await this.prisma.spd.findMany({
      where: { suratTugasId: id },
    });

    // HANYA SINKRONISASI JIKA SPD SUDAH ADA (TIDAK AUTOCREATE JIKA BELUM ADA)
    if (currentSpdList.length > 0) {
      // 1. Update properti SPD yang terkait
      const spdSyncData: any = {};
      if (dto.dalamRangka) spdSyncData.dalamRangka = dto.dalamRangka.trim();
      if (dto.tempatDikeluarkan) spdSyncData.tempatBerangkat = dto.tempatDikeluarkan.trim();
      if (dto.tanggalSurat) {
        const newDate = new Date(dto.tanggalSurat);
        spdSyncData.tanggalBerangkat = newDate;
        spdSyncData.tanggalKembali = newDate;
      }
      if (dto.kopSuratId !== undefined) {
        spdSyncData.kopSuratId = dto.kopSuratId;
      }
      if (updateData.penandatanganId !== undefined) spdSyncData.penandatanganId = updateData.penandatanganId;
      if (updateData.penandatanganNama !== undefined) spdSyncData.penandatanganNama = updateData.penandatanganNama;
      if (updateData.penandatanganJabatan !== undefined) spdSyncData.penandatanganJabatan = updateData.penandatanganJabatan;
      if (updateData.penandatanganPangkat !== undefined) spdSyncData.penandatanganPangkat = updateData.penandatanganPangkat;
      if (updateData.penandatanganNip !== undefined) spdSyncData.penandatanganNip = updateData.penandatanganNip;

      if (Object.keys(spdSyncData).length > 0) {
        await this.prisma.spd.updateMany({
          where: { suratTugasId: id },
          data: spdSyncData,
        });
      }

      // 2. Jika pegawaiIds dikirim, sinkronkan daftar personil SPD
      if (dto.pegawaiIds && Array.isArray(dto.pegawaiIds)) {
        const year = new Date(updatedSt.tanggalSurat || new Date()).getFullYear();
        const currentPegawaiIds = new Set(currentSpdList.map((s) => s.pegawaiId));
        const newPegawaiIds = new Set(dto.pegawaiIds);

        // Hapus SPD bagi pegawai yang dihilangkan
        const removedSpds = currentSpdList.filter((s) => !newPegawaiIds.has(s.pegawaiId));
        if (removedSpds.length > 0) {
          await this.prisma.spd.deleteMany({
            where: { id: { in: removedSpds.map((s) => s.id) } },
          });
        }

        // Tambah SPD bagi pegawai yang baru ditambahkan
        const addedPegawaiIds = dto.pegawaiIds.filter((pId) => !currentPegawaiIds.has(pId));
        for (const pId of addedPegawaiIds) {
          const spdCount = await this.prisma.spd.count({
            where: {
              createdAt: {
                gte: new Date(`${year}-01-01T00:00:00.000Z`),
                lte: new Date(`${year}-12-31T23:59:59.999Z`),
              },
            },
          });
          const spdSeq = String(spdCount + 1).padStart(3, '0');
          let nomorSpd = `${spdSeq}/SPD/SETDA/${year}`;
          const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
          if (existing) {
            nomorSpd = `${String(spdCount + 2).padStart(3, '0')}/SPD/SETDA/${year}`;
          }

          await this.prisma.spd.create({
            data: {
              nomorSpd,
              pemberiPerintah: 'Pengguna Anggaran (PA)',
              pegawaiId: pId,
              suratTugasId: id,
              dalamRangka: updatedSt.dalamRangka,
              alatAngkut: 'Kendaraan Dinas / Umum',
              tempatBerangkat: updatedSt.tempatDikeluarkan || 'Banggai',
              tempatTujuan: 'Sesuai Penugasan',
              lamaHari: 1,
              tanggalBerangkat: updatedSt.tanggalSurat,
              tanggalKembali: updatedSt.tanggalSurat,
              skpd: 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
              penandatanganNama: updatedSt.penandatanganNama || null,
              penandatanganJabatan: updatedSt.penandatanganJabatan || null,
              penandatanganPangkat: updatedSt.penandatanganPangkat || null,
              penandatanganNip: updatedSt.penandatanganNip || null,
              status: updatedSt.status || 'DRAFT',
            },
          });
        }
      }
    }

    return this.findById(id);
  }

  async updateStatus(id: string, status: string) {
    await this.findById(id);
    return this.prisma.suratTugas.update({
      where: { id },
      data: { status: status.trim() },
      include: {
        spdList: {
          include: {
            pegawai: true,
          },
        },
      },
    });
  }

  async generateSpd(id: string, dto?: GenerateSpdFromSuratTugasDto) {
    const suratTugas = await this.findById(id);
    const year = new Date(suratTugas.tanggalSurat || new Date()).getFullYear();

    // Resolving input parameters for SPD from dto -> suratTugas -> default
    const pemberiPerintah = dto?.pemberiPerintah?.trim() || 'Pengguna Anggaran (PA)';

    let alatAngkutStr = 'Kendaraan Dinas / Umum';
    if (dto?.alatAngkut) {
      alatAngkutStr = Array.isArray(dto.alatAngkut) ? dto.alatAngkut.join(', ') : dto.alatAngkut.trim();
    } else if (suratTugas.alatAngkut) {
      alatAngkutStr = suratTugas.alatAngkut;
    }

    const tempatBerangkat = dto?.tempatBerangkat?.trim() || suratTugas.tempatDikeluarkan || 'Banggai';
    const tempatTujuan = dto?.tempatTujuan?.trim() || suratTugas.tempatTujuan || 'Sesuai Penugasan';
    const lamaHari = Number(dto?.lamaHari) || suratTugas.lamaHari || 1;

    const tglBerangkat = dto?.tanggalBerangkat
      ? new Date(dto.tanggalBerangkat)
      : (suratTugas.tanggalBerangkat || suratTugas.tanggalSurat || new Date());

    const tglKembali = new Date(tglBerangkat);
    tglKembali.setDate(tglKembali.getDate() + Math.max(0, lamaHari - 1));

    // Persist travel values to suratTugas if provided
    await this.prisma.suratTugas.update({
      where: { id },
      data: {
        alatAngkut: alatAngkutStr,
        tempatTujuan,
        lamaHari,
        tanggalBerangkat: tglBerangkat,
      },
    });

    // Ambil daftar pegawai target dari suratTugas.pegawaiIds
    let targetPegawaiList: any[] = [];
    if (suratTugas.pegawaiIds) {
      try {
        const ids: string[] = JSON.parse(suratTugas.pegawaiIds);
        if (Array.isArray(ids) && ids.length > 0) {
          const dbPegawai = await this.prisma.pegawai.findMany({
            where: { id: { in: ids } },
          });
          targetPegawaiList = ids.map((pId) => dbPegawai.find((p) => p.id === pId)).filter(Boolean);
        }
      } catch {}
    }

    if (targetPegawaiList.length === 0) {
      // Fallback jika tidak tersimpan
      targetPegawaiList = await this.prisma.pegawai.findMany({ take: 10 });
    }

    // Cek SPD yang sudah ada
    const existingSpdList = await this.prisma.spd.findMany({
      where: { suratTugasId: id },
      include: { pegawai: true },
    });

    const existingPegawaiIds = new Set(existingSpdList.map((s) => s.pegawaiId));
    const missingPegawaiList = targetPegawaiList.filter((p) => !existingPegawaiIds.has(p.id));

    // Jika seluruh personil sudah memiliki dokumen SPD
    if (missingPegawaiList.length === 0 && existingSpdList.length > 0) {
      if (dto) {
        await this.prisma.spd.updateMany({
          where: { suratTugasId: id },
          data: {
            pemberiPerintah,
            alatAngkut: alatAngkutStr,
            tempatBerangkat,
            tempatTujuan,
            lamaHari,
            tanggalBerangkat: tglBerangkat,
            tanggalKembali: tglKembali,
            penandatanganId: suratTugas.penandatanganId || null,
            penandatanganNama: suratTugas.penandatanganNama || null,
            penandatanganJabatan: suratTugas.penandatanganJabatan || null,
            penandatanganPangkat: suratTugas.penandatanganPangkat || null,
            penandatanganNip: suratTugas.penandatanganNip || null,
          },
        });
        const updatedSpds = await this.prisma.spd.findMany({
          where: { suratTugasId: id },
          include: { pegawai: true, penandatangan: true },
        });
        return {
          message: `Berhasil memperbarui parameter perjalanan dinas untuk ${updatedSpds.length} dokumen SPD!`,
          count: updatedSpds.length,
          spdList: updatedSpds,
        };
      }
      return {
        message: `Surat Perjalanan Dinas (SPD) untuk seluruh personil Surat Tugas ${suratTugas.nomorSurat} sudah tersedia (${existingSpdList.length} dokumen).`,
        count: existingSpdList.length,
        spdList: existingSpdList,
      };
    }

    const createdSpds = [];

    for (const peg of missingPegawaiList) {
      const spdCount = await this.prisma.spd.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        },
      });
      const spdSeq = String(spdCount + 1).padStart(3, '0');
      let nomorSpd = `${spdSeq}/SPD/SETDA/${year}`;
      const existing = await this.prisma.spd.findUnique({ where: { nomorSpd } });
      if (existing) {
        nomorSpd = `${String(spdCount + 2).padStart(3, '0')}/SPD/SETDA/${year}`;
      }

      const spd = await this.prisma.spd.create({
        data: {
          nomorSpd,
          pemberiPerintah,
          pegawaiId: peg.id,
          suratTugasId: suratTugas.id,
          dalamRangka: suratTugas.dalamRangka,
          alatAngkut: alatAngkutStr,
          tempatBerangkat,
          tempatTujuan,
          lamaHari,
          tanggalBerangkat: tglBerangkat,
          tanggalKembali: tglKembali,
          kopSuratId: suratTugas.kopSuratId || null,
          skpd: 'Bagian Umum Sekretariat Daerah Kab. Banggai Laut',
          penandatanganId: suratTugas.penandatanganId || null,
          penandatanganNama: suratTugas.penandatanganNama || null,
          penandatanganJabatan: suratTugas.penandatanganJabatan || null,
          penandatanganPangkat: suratTugas.penandatanganPangkat || null,
          penandatanganNip: suratTugas.penandatanganNip || null,
          status: 'DRAFT',
        },
        include: {
          pegawai: true,
          penandatangan: true,
        },
      });
      createdSpds.push(spd);
    }

    const allSpds = await this.prisma.spd.findMany({
      where: { suratTugasId: id },
      include: { pegawai: true },
    });

    return {
      message: `Berhasil menerbitkan ${createdSpds.length} Surat Perjalanan Dinas (SPD) untuk Surat Tugas ${suratTugas.nomorSurat}.`,
      count: allSpds.length,
      spdList: allSpds,
    };
  }

  async deleteAllSpd(id: string) {
    const suratTugas = await this.findById(id);
    const count = await this.prisma.spd.count({ where: { suratTugasId: id } });
    if (count > 0) {
      await this.prisma.spd.deleteMany({
        where: { suratTugasId: id },
      });
    }
    return {
      success: true,
      message: `Berhasil menghapus seluruh (${count}) dokumen SPD yang terhubung dengan Surat Tugas ${suratTugas.nomorSurat}.`,
      count,
    };
  }

  async delete(id: string) {
    await this.findById(id);
    // Delete child SPD records created under this Surat Tugas first
    await this.prisma.spd.deleteMany({
      where: { suratTugasId: id },
    });
    return this.prisma.suratTugas.delete({
      where: { id },
    });
  }
}

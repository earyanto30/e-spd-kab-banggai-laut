import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePegawaiDto {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja?: string;
  status?: string;
  email?: string;
  noHp?: string;
}

export interface UpdatePegawaiDto {
  nip?: string;
  nama?: string;
  pangkat?: string;
  golongan?: string;
  jabatan?: string;
  unitKerja?: string;
  status?: string;
  email?: string;
  noHp?: string;
}

@Injectable()
export class PegawaiService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPegawai();
  }

  private async seedDefaultPegawai() {
    const count = await this.prisma.pegawai.count();
    if (count > 0) return;

    const initialAsn = [
      {
        nip: '19680512 199403 1 004',
        nama: 'Drs. H. Bambang Soeprapto, M.Si',
        pangkat: 'Pembina Utama Madya',
        golongan: 'IV/d',
        jabatan: 'Sekretaris Daerah',
        unitKerja: 'Sekretariat Daerah',
        status: 'PNS',
        email: 'bambang.soeprapto@setda.go.id',
        noHp: '081234567890',
      },
      {
        nip: '19740821 199903 2 002',
        nama: 'Ir. Hj. Siti Rahmawati, MT',
        pangkat: 'Pembina Utama Muda',
        golongan: 'IV/c',
        jabatan: 'Asisten Pemerintahan dan Kesra',
        unitKerja: 'Sekretariat Daerah - Asisten I',
        status: 'PNS',
        email: 'siti.rahmawati@setda.go.id',
        noHp: '081234567891',
      },
      {
        nip: '19850214 200412 1 001',
        nama: 'Dedy Kurniawan, S.STP, M.AP',
        pangkat: 'Pembina',
        golongan: 'IV/a',
        jabatan: 'Kepala Bagian Umum dan Protokol',
        unitKerja: 'Sekretariat Daerah - Bagian Umum',
        status: 'PNS',
        email: 'dedy.kurniawan@setda.go.id',
        noHp: '081234567892',
      },
      {
        nip: '19890610 201101 2 008',
        nama: 'Ratna Juwita, S.H., M.H.',
        pangkat: 'Penata Tingkat I',
        golongan: 'III/d',
        jabatan: 'Kepala Bagian Hukum',
        unitKerja: 'Sekretariat Daerah - Bagian Hukum',
        status: 'PNS',
        email: 'ratna.juwita@setda.go.id',
        noHp: '081234567893',
      },
      {
        nip: '19920315 201802 1 003',
        nama: 'Fajar Prasetyo, S.Kom',
        pangkat: 'Penata',
        golongan: 'III/c',
        jabatan: 'Pranata Komputer Ahli Muda',
        unitKerja: 'Sekretariat Daerah - Bagian Organisasi',
        status: 'PNS',
        email: 'fajar.prasetyo@setda.go.id',
        noHp: '081234567894',
      },
      {
        nip: '19951104 202012 2 011',
        nama: 'Nurul Aini, A.Md',
        pangkat: 'Pengatur',
        golongan: 'II/c',
        jabatan: 'Pengelola Administrasi Perjalanan Dinas',
        unitKerja: 'Sekretariat Daerah - Bagian Umum',
        status: 'PNS',
        email: 'nurul.aini@setda.go.id',
        noHp: '081234567895',
      },
      {
        nip: '19900720 202321 1 005',
        nama: 'Eko Wahyudi, S.AP',
        pangkat: 'Ahli Pertama',
        golongan: 'IX',
        jabatan: 'Analis Kebijakan',
        unitKerja: 'Sekretariat Daerah - Bagian Perekonomian',
        status: 'PPPK',
        email: 'eko.wahyudi@setda.go.id',
        noHp: '081234567896',
      },
    ];

    for (const data of initialAsn) {
      await this.prisma.pegawai.create({ data });
    }
  }

  async findAll(query?: string, status?: string) {
    const where: any = {};

    if (status && status !== 'SEMUA') {
      where.status = status;
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
        status: dto.status?.trim() || 'PNS',
        email: dto.email?.trim() || null,
        noHp: dto.noHp?.trim() || null,
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
        ...(dto.status && { status: dto.status.trim() }),
        email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
        noHp: dto.noHp !== undefined ? dto.noHp?.trim() || null : undefined,
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

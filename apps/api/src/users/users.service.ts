import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/crypto.util';
import { CreateUserDto, UpdateUserDto, Role } from '@si-setda/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private selectSafeFields = {
    id: true,
    username: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    pegawaiId: true,
    createdAt: true,
    updatedAt: true,
    pegawai: {
      select: {
        id: true,
        nip: true,
        nama: true,
        pangkat: true,
        golongan: true,
        jabatan: true,
        unitKerja: true,
      },
    },
  };

  async findAll(query?: string, role?: string, isActive?: string) {
    const where: any = {};

    if (role && role !== 'SEMUA') {
      where.role = role;
    }

    if (isActive !== undefined && isActive !== 'SEMUA' && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === '1';
    }

    if (query && query.trim()) {
      const q = query.trim();
      const strippedQ = q.replace(/\s+/g, '');
      where.OR = [
        { username: { contains: q } },
        { username: { contains: strippedQ } },
        { name: { contains: q } },
        { email: { contains: q } },
        {
          pegawai: {
            OR: [
              { nama: { contains: q } },
              { nip: { contains: q } },
              { nip: { contains: strippedQ } },
              { jabatan: { contains: q } },
            ],
          },
        },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: this.selectSafeFields,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.selectSafeFields,
    });
    if (!user) {
      throw new NotFoundException(`User dengan ID '${id}' tidak ditemukan`);
    }
    return user;
  }

  async getUnlinkedPegawai(currentUserId?: string) {
    // If currentUserId provided, include the pegawai currently linked to this user
    let currentPegawaiId: string | null = null;
    if (currentUserId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { pegawaiId: true },
      });
      currentPegawaiId = currentUser?.pegawaiId ?? null;
    }

    const unlinked = await this.prisma.pegawai.findMany({
      where: {
        OR: [
          { user: null },
          ...(currentPegawaiId ? [{ id: currentPegawaiId }] : []),
        ],
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        pangkat: true,
        golongan: true,
        jabatan: true,
        unitKerja: true,
        isASN: true,
      },
      orderBy: [{ golongan: 'desc' }, { nama: 'asc' }],
    });

    return unlinked;
  }

  async create(dto: CreateUserDto) {
    const cleanUsername = dto.username.trim();

    // Check username conflict
    const existing = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      throw new ConflictException(`Username / NIP '${cleanUsername}' sudah digunakan`);
    }

    // Check pegawai conflict if provided
    if (dto.pegawaiId) {
      const pegawai = await this.prisma.pegawai.findUnique({
        where: { id: dto.pegawaiId },
        include: { user: true },
      });
      if (!pegawai) {
        throw new NotFoundException('Data pegawai yang dipilih tidak ditemukan');
      }
      if (pegawai.user) {
        throw new ConflictException(`Pegawai '${pegawai.nama}' sudah memiliki akun user login`);
      }
    }

    const hashedPassword = hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        name: dto.name.trim(),
        role: dto.role || Role.USER,
        email: dto.email?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        pegawaiId: dto.pegawaiId || null,
      },
      select: this.selectSafeFields,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { pegawai: true },
    });
    if (!existing) {
      throw new NotFoundException(`User dengan ID '${id}' tidak ditemukan`);
    }

    // Safety check: protect last active SUPER_ADMIN
    if (existing.role === Role.SUPER_ADMIN) {
      const willDemote = dto.role && dto.role !== Role.SUPER_ADMIN;
      const willDeactivate = dto.isActive === false;

      if (willDemote || willDeactivate) {
        const otherSuperAdmins = await this.prisma.user.count({
          where: {
            role: Role.SUPER_ADMIN,
            isActive: true,
            id: { not: id },
          },
        });
        if (otherSuperAdmins === 0) {
          throw new BadRequestException(
            'Tidak dapat mengubah status/role Super Admin terakhir. Sistem membutuhkan minimal 1 Super Admin aktif.'
          );
        }
      }
    }

    // Check username conflict
    if (dto.username && dto.username.trim() !== existing.username) {
      const usernameTaken = await this.prisma.user.findUnique({
        where: { username: dto.username.trim() },
      });
      if (usernameTaken) {
        throw new ConflictException(`Username / NIP '${dto.username}' sudah digunakan`);
      }
    }

    // Check pegawai conflict
    if (dto.pegawaiId && dto.pegawaiId !== existing.pegawaiId) {
      const pegawai = await this.prisma.pegawai.findUnique({
        where: { id: dto.pegawaiId },
        include: { user: true },
      });
      if (!pegawai) {
        throw new NotFoundException('Data pegawai yang dipilih tidak ditemukan');
      }
      if (pegawai.user && pegawai.user.id !== id) {
        throw new ConflictException(`Pegawai '${pegawai.nama}' sudah terhubung dengan akun lain`);
      }
    }

    const data: any = {};
    if (dto.username) data.username = dto.username.trim();
    if (dto.name) data.name = dto.name.trim();
    if (dto.role) data.role = dto.role;
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.pegawaiId !== undefined) data.pegawaiId = dto.pegawaiId || null;

    if (dto.password && dto.password.trim().length > 0) {
      data.password = hashPassword(dto.password.trim());
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.selectSafeFields,
    });
  }

  async toggleStatus(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`User dengan ID '${id}' tidak ditemukan`);
    }

    if (existing.isActive && existing.role === Role.SUPER_ADMIN) {
      const otherActive = await this.prisma.user.count({
        where: {
          role: Role.SUPER_ADMIN,
          isActive: true,
          id: { not: id },
        },
      });
      if (otherActive === 0) {
        throw new BadRequestException('Tidak dapat menonaktifkan Super Admin aktif satu-satunya.');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: this.selectSafeFields,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`User dengan ID '${id}' tidak ditemukan`);
    }

    // Protect default admin Fadli A. Arsad or last super admin
    if (existing.username === '198801152010011002' || existing.username === 'admin') {
      throw new BadRequestException('Akun Super Admin Utama (Fadli A. Arsad / admin) tidak dapat dihapus');
    }

    if (existing.role === Role.SUPER_ADMIN) {
      const otherSuperAdmins = await this.prisma.user.count({
        where: {
          role: Role.SUPER_ADMIN,
          id: { not: id },
        },
      });
      if (otherSuperAdmins === 0) {
        throw new BadRequestException('Tidak dapat menghapus Super Admin satu-satunya');
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true, message: `User '${existing.name}' berhasil dihapus` };
  }
}

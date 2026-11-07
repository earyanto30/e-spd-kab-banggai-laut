import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingSubmitDto, SystemStatusDto } from '@si-setda/shared-types';
import { hashPassword } from '../auth/crypto.util';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<SystemStatusDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'onboarding_completed' },
    });

    const isOnboardingCompleted = setting?.value === 'true';

    // Check if KPA and PA exist as penandatangan
    const allPenandatangan = await this.prisma.pegawai.findMany({
      where: { isPenandatangan: true },
    });

    const hasKpa = allPenandatangan.some((p) => {
      const j = (p.jabatan || '').toLowerCase();
      return j.includes('bagian umum') || j.includes('kpa') || j.includes('kuasa');
    });

    const hasPa = allPenandatangan.some((p) => {
      const j = (p.jabatan || '').toLowerCase();
      return j.includes('sekretaris daerah') || j.includes('sekda') || j.includes('pa');
    });

    return {
      isOnboardingCompleted,
      hasAdminPasswordChanged: isOnboardingCompleted,
      hasKpa,
      hasPa,
    };
  }

  async completeOnboarding(dto: OnboardingSubmitDto, currentUserId?: string): Promise<{ success: boolean; message: string }> {
    if (!dto.adminPassword || dto.adminPassword.length < 6) {
      throw new BadRequestException('Kata sandi admin minimal 6 karakter');
    }

    if (!dto.kpa?.nama || !dto.kpa?.nip) {
      throw new BadRequestException('Data Pejabat KPA belum lengkap');
    }

    if (!dto.pa?.nama || !dto.pa?.nip) {
      throw new BadRequestException('Data Pejabat PA belum lengkap');
    }

    const hashedPassword = hashPassword(dto.adminPassword);

    await this.prisma.$transaction(async (tx) => {
      // 1. Update super admin user password
      let adminUser = currentUserId
        ? await tx.user.findUnique({ where: { id: currentUserId } })
        : null;

      if (!adminUser) {
        adminUser = await tx.user.findFirst({
          where: {
            OR: [
              { role: 'SUPER_ADMIN' },
              { username: 'admin' },
              { username: '198801152010011002' },
            ],
          },
        });
      }

      if (adminUser) {
        await tx.user.update({
          where: { id: adminUser.id },
          data: {
            password: hashedPassword,
          },
        });
      }

      // 2. Resolve matching Jabatan for KPA and PA
      const kabagJabatan = await tx.jabatan.findFirst({
        where: {
          OR: [
            { nama: 'Kepala Bagian Umum' },
            { nama: { contains: 'Bagian Umum' } },
          ],
        },
      });

      const sekdaJabatan = await tx.jabatan.findFirst({
        where: {
          OR: [
            { nama: 'Sekretaris Daerah' },
            { nama: { contains: 'Sekretaris Daerah' } },
          ],
        },
      });

      // 3. Upsert KPA Pegawai
      const cleanKpaNip = dto.kpa.nip.trim();
      await tx.pegawai.upsert({
        where: { nip: cleanKpaNip },
        update: {
          nama: dto.kpa.nama.trim(),
          pangkat: dto.kpa.pangkat.trim(),
          golongan: dto.kpa.golongan.trim(),
          jabatan: dto.kpa.jabatan.trim() || 'Kepala Bagian Umum',
          jabatanId: kabagJabatan ? kabagJabatan.id : null,
          unitKerja: dto.kpa.unitKerja?.trim() || 'Bagian Umum Sekretariat Daerah',
          isASN: true,
          isPenandatangan: true,
        },
        create: {
          nip: cleanKpaNip,
          nama: dto.kpa.nama.trim(),
          pangkat: dto.kpa.pangkat.trim(),
          golongan: dto.kpa.golongan.trim(),
          jabatan: dto.kpa.jabatan.trim() || 'Kepala Bagian Umum',
          jabatanId: kabagJabatan ? kabagJabatan.id : null,
          unitKerja: dto.kpa.unitKerja?.trim() || 'Bagian Umum Sekretariat Daerah',
          isASN: true,
          isPenandatangan: true,
        },
      });

      // 4. Upsert PA Pegawai
      const cleanPaNip = dto.pa.nip.trim();
      const paPegawai = await tx.pegawai.upsert({
        where: { nip: cleanPaNip },
        update: {
          nama: dto.pa.nama.trim(),
          pangkat: dto.pa.pangkat.trim(),
          golongan: dto.pa.golongan.trim(),
          jabatan: dto.pa.jabatan.trim() || 'Sekretaris Daerah',
          jabatanId: sekdaJabatan ? sekdaJabatan.id : null,
          unitKerja: dto.pa.unitKerja?.trim() || 'Sekretariat Daerah',
          isASN: true,
          isPenandatangan: true,
        },
        create: {
          nip: cleanPaNip,
          nama: dto.pa.nama.trim(),
          pangkat: dto.pa.pangkat.trim(),
          golongan: dto.pa.golongan.trim(),
          jabatan: dto.pa.jabatan.trim() || 'Sekretaris Daerah',
          jabatanId: sekdaJabatan ? sekdaJabatan.id : null,
          unitKerja: dto.pa.unitKerja?.trim() || 'Sekretariat Daerah',
          isASN: true,
          isPenandatangan: true,
        },
      });

      // If admin user is not linked to any pegawai or linked to old NIP, link to PA (Sekda)
      if (adminUser) {
        await tx.user.update({
          where: { id: adminUser.id },
          data: {
            pegawaiId: paPegawai.id,
            name: paPegawai.nama,
          },
        });
      }

      // 5. Mark onboarding as completed
      await tx.systemSetting.upsert({
        where: { key: 'onboarding_completed' },
        update: { value: 'true' },
        create: { key: 'onboarding_completed', value: 'true' },
      });
    });

    return {
      success: true,
      message: 'Inisialisasi sistem (onboarding) berhasil diselesaikan.',
    };
  }
}

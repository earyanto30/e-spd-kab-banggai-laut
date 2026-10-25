import { z } from 'zod';

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  USER: 'USER',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const RoleHierarchy: Record<RoleType, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.ADMIN]: 3,
  [Role.STAFF]: 2,
  [Role.USER]: 1,
};

export const hasRequiredRole = (userRole: RoleType, allowedRoles: RoleType[]): boolean => {
  return allowedRoles.includes(userRole);
};

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3),
  email: z.string().nullable().optional(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  pegawaiId: z.string().nullable().optional(),
  nip: z.string().nullable().optional(),
  isPenandatangan: z.boolean().optional(),
  jabatan: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type UserDto = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(3, 'NIP atau Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserSchema,
});

export type AuthResponseDto = z.infer<typeof AuthResponseSchema>;

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username / NIP minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  name: z.string().min(1, 'Nama wajib diisi'),
  role: z.nativeEnum(Role).default(Role.USER),
  email: z.string().email('Format email tidak valid').nullable().optional().or(z.literal('')),
  pegawaiId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  username: z.string().min(3, 'Username / NIP minimal 3 karakter').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  role: z.nativeEnum(Role).optional(),
  email: z.string().email('Format email tidak valid').nullable().optional().or(z.literal('')),
  pegawaiId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const SpdStatus = {
  DRAFT: 'DRAFT',
  DISETUJUI: 'DISETUJUI',
  SELESAI: 'SELESAI',
  BATAL: 'BATAL',
} as const;

export type SpdStatusType = (typeof SpdStatus)[keyof typeof SpdStatus];

export const SpdSchema = z.object({
  id: z.string(),
  nomorSpd: z.string(),
  pemberiPerintah: z.string(),
  pegawaiId: z.string(),
  pegawai: z.any().optional(),
  dalamRangka: z.string(),
  alatAngkut: z.string(),
  tempatBerangkat: z.string(),
  tempatTujuan: z.string(),
  lamaHari: z.number().int().positive().nullable().optional(),
  tanggalBerangkat: z.date().or(z.string()).nullable().optional(),
  tanggalKembali: z.date().or(z.string()).nullable().optional(),
  skpd: z.string().default('Bagian Umum Sekretariat Daerah Kab. Banggai Laut'),
  kodeRekening: z.string().nullable().optional(),
  tingkatBiaya: z.string().nullable().optional(),
  pengikut: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  kopSuratId: z.string().nullable().optional(),
  kopSurat: z.any().optional(),
  suratTugasId: z.string().nullable().optional(),
  penandatanganId: z.string().nullable().optional(),
  penandatangan: z.any().optional(),
  penandatanganNama: z.string().nullable().optional(),
  penandatanganJabatan: z.string().nullable().optional(),
  penandatanganPangkat: z.string().nullable().optional(),
  penandatanganNip: z.string().nullable().optional(),
  status: z.string().default('DRAFT'),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type SpdDto = z.infer<typeof SpdSchema>;

export const CreateSpdSchema = z.object({
  nomorSpd: z.string().optional(),
  pemberiPerintah: z.string().min(1, 'Pemberi perintah wajib dipilih'),
  pegawaiId: z.string().min(1, 'Pegawai wajib dipilih'),
  dalamRangka: z.string().min(1, 'Maksud perjalanan dinas wajib diisi').max(700, 'Maksud perjalanan dinas maksimal 700 karakter'),
  alatAngkut: z.string().min(1, 'Alat angkut wajib diisi'),
  tempatBerangkat: z.string().min(1, 'Tempat berangkat wajib diisi'),
  tempatTujuan: z.string().min(1, 'Tempat tujuan wajib diisi'),
  lamaHari: z.number().int().positive('Lama perjalanan minimal 1 hari').nullable().optional(),
  tanggalBerangkat: z.string().or(z.date()).nullable().optional().or(z.literal('')),
  tanggalKembali: z.string().or(z.date()).nullable().optional(),
  skpd: z.string().optional(),
  kodeRekening: z.string().nullable().optional(),
  tingkatBiaya: z.string().nullable().optional(),
  pengikut: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  kopSuratId: z.string().nullable().optional(),
  suratTugasId: z.string().nullable().optional(),
  penandatanganId: z.string().nullable().optional(),
  penandatanganNama: z.string().nullable().optional(),
  penandatanganJabatan: z.string().nullable().optional(),
  penandatanganPangkat: z.string().nullable().optional(),
  penandatanganNip: z.string().nullable().optional(),
  status: z.string().optional(),
});

export type CreateSpdDto = z.infer<typeof CreateSpdSchema>;

export const UpdateSpdSchema = CreateSpdSchema.partial();

export type UpdateSpdDto = z.infer<typeof UpdateSpdSchema>;

export const SuratTugasSchema = z.object({
  id: z.string(),
  nomorSurat: z.string(),
  dasarHukum: z.string().default(''),
  dalamRangka: z.string(),
  maksudHeader: z.string().nullable().optional(),
  tempatDikeluarkan: z.string().default('Banggai'),
  tanggalSurat: z.date().or(z.string()),
  penandatanganId: z.string().nullable().optional(),
  penandatangan: z.any().optional(),
  penandatanganNama: z.string().nullable().optional(),
  penandatanganJabatan: z.string().nullable().optional(),
  penandatanganPangkat: z.string().nullable().optional(),
  penandatanganNip: z.string().nullable().optional(),
  kopSuratId: z.string().nullable().optional(),
  pegawaiIds: z.string().nullable().optional(),
  status: z.string().default('DRAFT'),
  spdList: z.array(z.any()).optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type SuratTugasDto = z.infer<typeof SuratTugasSchema>;

export const MODA_TRANSPORTASI_OPTIONS = [
  'Mobil Dinas',
  'Pesawat',
  'Speedboat / Kapal Laut',
  'Kendaraan Roda Dua',
  'Angkutan Umum Darat',
] as const;

export const CreateSuratTugasSchema = z.object({
  nomorSurat: z.string().optional(),
  dasarHukum: z.string().optional(),
  dalamRangka: z.string().min(1, 'Dalam rangka / maksud penugasan wajib diisi'),
  maksudHeader: z.string().nullable().optional(),
  pegawaiIds: z.array(z.string()).min(1, 'Minimal satu pegawai pelaksana wajib dipilih'),
  tempatDikeluarkan: z.string().optional(),
  tanggalSurat: z.string().or(z.date()).optional(),
  penandatanganId: z.string().nullable().optional(),
  penandatanganNama: z.string().optional(),
  penandatanganJabatan: z.string().optional(),
  penandatanganPangkat: z.string().optional(),
  penandatanganNip: z.string().optional(),
  kopSuratId: z.string().nullable().optional(),
  status: z.string().optional(),
});

export type CreateSuratTugasDto = z.infer<typeof CreateSuratTugasSchema>;

export const UpdateSuratTugasSchema = CreateSuratTugasSchema.partial();

export type UpdateSuratTugasDto = z.infer<typeof UpdateSuratTugasSchema>;

export const GenerateSpdFromSuratTugasSchema = z.object({
  nomorSpdMode: z.enum(['auto', 'custom']).optional(),
  customPrefix: z.string().optional(),
  customSeq: z.string().optional(),
  tahunSpd: z.number().int().optional(),
  pemberiPerintah: z.string().optional(),
  alatAngkut: z.array(z.string()).or(z.string()).optional(),
  tempatBerangkat: z.string().optional(),
  tempatTujuan: z.string().optional(),
  lamaHari: z.number().int().positive().nullable().optional(),
  tanggalBerangkat: z.string().or(z.date()).nullable().optional().or(z.literal('')),
});

export type GenerateSpdFromSuratTugasDto = z.infer<typeof GenerateSpdFromSuratTugasSchema>;

export const DasarHukumSchema = z.object({
  id: z.string(),
  judul: z.string(),
  isi: z.string(),
  urutan: z.number().int().default(0),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type DasarHukumDto = z.infer<typeof DasarHukumSchema>;

export const CreateDasarHukumSchema = z.object({
  judul: z.string().min(1, 'Judul dasar hukum wajib diisi'),
  isi: z.string().min(1, 'Isi redaksi dasar hukum wajib diisi'),
  urutan: z.number().int().optional().default(0),
});

export type CreateDasarHukumDto = z.infer<typeof CreateDasarHukumSchema>;

export const UpdateDasarHukumSchema = CreateDasarHukumSchema.partial();

export type UpdateDasarHukumDto = z.infer<typeof UpdateDasarHukumSchema>;

export const JabatanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  keterangan: z.string().nullable().optional(),
  urutan: z.number().int().default(0),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type JabatanDto = z.infer<typeof JabatanSchema>;

export const CreateJabatanSchema = z.object({
  nama: z.string().min(1, 'Nama jabatan wajib diisi'),
  keterangan: z.string().nullable().optional().or(z.literal('')),
  urutan: z.number().int().optional().default(0),
});

export type CreateJabatanDto = z.infer<typeof CreateJabatanSchema>;

export const UpdateJabatanSchema = CreateJabatanSchema.partial();

export type UpdateJabatanDto = z.infer<typeof UpdateJabatanSchema>;

export const PegawaiSchema = z.object({
  id: z.string(),
  nip: z.string(),
  nama: z.string(),
  pangkat: z.string(),
  golongan: z.string(),
  jabatan: z.string(),
  jabatanId: z.string().nullable().optional(),
  jabatanRef: JabatanSchema.nullable().optional(),
  unitKerja: z.string(),
  isASN: z.boolean().default(true),
  isPenandatangan: z.boolean().default(false),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type PegawaiDto = z.infer<typeof PegawaiSchema>;

export const CreatePegawaiSchema = z.object({
  nip: z.string().min(1, 'NIP wajib diisi'),
  nama: z.string().min(1, 'Nama pegawai wajib diisi'),
  pangkat: z.string().min(1, 'Pangkat wajib diisi'),
  golongan: z.string().min(1, 'Golongan ruang wajib diisi'),
  jabatan: z.string().optional(),
  jabatanId: z.string().nullable().optional(),
  unitKerja: z.string().optional(),
  isASN: z.boolean().optional(),
  isPenandatangan: z.boolean().optional(),
});

export type CreatePegawaiDto = z.infer<typeof CreatePegawaiSchema>;

export const UpdatePegawaiSchema = CreatePegawaiSchema.partial();

export type UpdatePegawaiDto = z.infer<typeof UpdatePegawaiSchema>;






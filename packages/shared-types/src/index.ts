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
  lamaHari: z.number().int().positive(),
  tanggalBerangkat: z.date().or(z.string()),
  tanggalKembali: z.date().or(z.string()),
  skpd: z.string().default('Bagian Umum Sekretariat Daerah Kab. Banggai Laut'),
  kodeRekening: z.string().nullable().optional(),
  tingkatBiaya: z.string().nullable().optional(),
  pengikut: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  kopSuratId: z.string().nullable().optional(),
  kopSurat: z.any().optional(),
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
  lamaHari: z.number().int().positive('Lama perjalanan minimal 1 hari'),
  tanggalBerangkat: z.string().or(z.date()),
  tanggalKembali: z.string().or(z.date()).optional(),
  skpd: z.string().optional(),
  kodeRekening: z.string().nullable().optional(),
  tingkatBiaya: z.string().nullable().optional(),
  pengikut: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  kopSuratId: z.string().nullable().optional(),
  status: z.string().optional(),
});

export type CreateSpdDto = z.infer<typeof CreateSpdSchema>;

export const UpdateSpdSchema = CreateSpdSchema.partial();

export type UpdateSpdDto = z.infer<typeof UpdateSpdSchema>;

export const DASAR_HUKUM_DEFAULT =
  'Undang-undang Nomor 09 Tahun 2015 tentang Perubahan kedua atas Undang-undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah (Lembaran Negara Republik Indonesia Tahun 2015 Nomor 5679)';

export const SuratTugasPegawaiItemSchema = z.object({
  pegawaiId: z.string(),
  nama: z.string(),
  nip: z.string(),
  pangkat: z.string().optional(),
  golongan: z.string().optional(),
  jabatan: z.string().optional(),
});

export type SuratTugasPegawaiItemDto = z.infer<typeof SuratTugasPegawaiItemSchema>;

export const SuratTugasSchema = z.object({
  id: z.string(),
  nomorSurat: z.string(),
  dasarHukum: z.string().default(DASAR_HUKUM_DEFAULT),
  dalamRangka: z.string(),
  tempatDikeluarkan: z.string().default('Banggai'),
  tanggalSurat: z.date().or(z.string()),
  penandatanganNama: z.string().default('ARSID HAMIDI, SH'),
  penandatanganJabatan: z.string().default('KEPALA BAGIAN UMUM SETDA KAB. BANGGAI LAUT'),
  penandatanganPangkat: z.string().default('Pembina, IV/a'),
  penandatanganNip: z.string().default('19700830 200312 1 003'),
  kopSuratId: z.string().nullable().optional(),
  pegawaiIds: z.string().nullable().optional(),
  alatAngkut: z.string().nullable().optional(),
  tempatTujuan: z.string().nullable().optional(),
  lamaHari: z.number().int().positive().nullable().optional(),
  tanggalBerangkat: z.date().or(z.string()).nullable().optional(),
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
  pegawaiIds: z.array(z.string()).min(1, 'Minimal satu pegawai pelaksana wajib dipilih'),
  tempatDikeluarkan: z.string().optional(),
  tanggalSurat: z.string().or(z.date()).optional(),
  penandatanganNama: z.string().optional(),
  penandatanganJabatan: z.string().optional(),
  penandatanganPangkat: z.string().optional(),
  penandatanganNip: z.string().optional(),
  kopSuratId: z.string().nullable().optional(),
  alatAngkut: z.string().optional(),
  tempatTujuan: z.string().optional(),
  lamaHari: z.number().int().positive().optional(),
  tanggalBerangkat: z.string().or(z.date()).optional(),
  status: z.string().optional(),
});

export type CreateSuratTugasDto = z.infer<typeof CreateSuratTugasSchema>;

export const UpdateSuratTugasSchema = CreateSuratTugasSchema.partial();

export type UpdateSuratTugasDto = z.infer<typeof UpdateSuratTugasSchema>;

export const GenerateSpdFromSuratTugasSchema = z.object({
  pemberiPerintah: z.string().optional(),
  alatAngkut: z.array(z.string()).or(z.string()).optional(),
  tempatBerangkat: z.string().optional(),
  tempatTujuan: z.string().optional(),
  lamaHari: z.number().int().positive().optional(),
  tanggalBerangkat: z.string().or(z.date()).optional(),
});

export type GenerateSpdFromSuratTugasDto = z.infer<typeof GenerateSpdFromSuratTugasSchema>;




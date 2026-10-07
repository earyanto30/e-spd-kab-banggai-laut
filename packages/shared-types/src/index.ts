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


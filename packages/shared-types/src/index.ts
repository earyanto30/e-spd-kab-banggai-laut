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


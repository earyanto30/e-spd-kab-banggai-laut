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

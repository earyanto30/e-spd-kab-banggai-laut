import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType, hasRequiredRole } from '@si-setda/shared-types';
import { ROLES_KEY } from './roles.decorator';
import { verifyJwt } from './crypto.util';

export const APP_CLIENT_HEADER = 'x-app-client';
export const APP_CLIENT_ID = 'si-spd-web';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // 1. Extract Token from Authorization Header or Query (for iframe streaming)
    let token: string | null = null;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1] || null;
    } else if (req.query?.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedException(
        'Akses ditolak: Diperlukan autentikasi (Bearer Token). Silakan masuk terlebih dahulu.'
      );
    }

    // 2. Verify Request Originates from Application (App-only access)
    const clientHeader = req.headers[APP_CLIENT_HEADER];
    if (!req.query?.token && clientHeader !== APP_CLIENT_ID) {
      throw new ForbiddenException(
        'Akses ditolak: Permintaan API hanya dapat diakses melalui aplikasi resmi SI-SPD.'
      );
    }

    const payload = verifyJwt<any>(token);
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException(
        'Akses ditolak: Sesi otentikasi tidak valid atau telah kedaluwarsa.'
      );
    }

    req.user = payload;

    // 3. Verify Role-Based Access Control (RBAC) if route specifies roles
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = payload.role as RoleType;
      const isAllowed = hasRequiredRole(userRole, requiredRoles);
      if (!isAllowed) {
        throw new ForbiddenException(
          `Akses ditolak: Peran akun '${userRole}' tidak memiliki wewenang untuk tindakan ini.`
        );
      }
    }

    return true;
  }
}

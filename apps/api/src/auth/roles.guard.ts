import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType, hasRequiredRole } from '@si-setda/shared-types';
import { ROLES_KEY } from './roles.decorator';
import { verifyJwt } from './crypto.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    let user = req.user;

    if (!user && req.headers?.authorization) {
      const [type, token] = req.headers.authorization.split(' ');
      if (type === 'Bearer' && token) {
        user = verifyJwt(token);
        req.user = user;
      }
    }

    if (!user || !user.role) {
      return false;
    }

    return hasRequiredRole(user.role as RoleType, requiredRoles);
  }
}

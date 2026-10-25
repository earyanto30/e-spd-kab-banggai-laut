import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthGuard, APP_CLIENT_HEADER, APP_CLIENT_ID } from './auth.guard';
import { Role } from '@si-setda/shared-types';
import { signJwt, verifyJwt } from './crypto.util';

describe('AuthGuard', () => {
  const guard = new AuthGuard(new Reflector());
  const context = (headers: Record<string, string>, handlerMetadata?: unknown[]) => {
    const request: { headers: Record<string, string>; user?: unknown } = { headers };
    return {
      request,
      executionContext: {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => handlerMetadata ?? {},
        getClass: () => ({}),
      } as unknown as ExecutionContext,
    };
  };

  it('requires a bearer token and official client header', () => {
    const missing = context({});
    expect(() => guard.canActivate(missing.executionContext)).toThrow(/autentikasi/);

    const token = signJwt({ sub: 'u1', role: Role.ADMIN });
    const wrongClient = context({ authorization: 'Bearer ' + token });
    expect(() => guard.canActivate(wrongClient.executionContext)).toThrow(/aplikasi resmi/);
  });

  it('accepts a valid request and attaches the token payload', () => {
    const token = signJwt({ sub: 'u1', role: Role.ADMIN });
    const request = context({
      authorization: 'Bearer ' + token,
      [APP_CLIENT_HEADER]: APP_CLIENT_ID,
    });

    expect(guard.canActivate(request.executionContext)).toBe(true);
    expect(request.request.user).toMatchObject({ sub: 'u1', role: Role.ADMIN });
    expect(verifyJwt(token)).not.toBeNull();
  });
});

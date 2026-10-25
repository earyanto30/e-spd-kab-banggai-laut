import { afterEach, describe, expect, it } from 'vitest';
import { hashPassword, signJwt, verifyJwt, verifyPassword } from './crypto.util';

describe('crypto utilities', () => {
  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  it('hashes passwords with a salt and verifies them', () => {
    const first = hashPassword('correct horse battery staple');
    const second = hashPassword('correct horse battery staple');

    expect(first).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(first).not.toBe(second);
    expect(verifyPassword('correct horse battery staple', first)).toBe(true);
    expect(verifyPassword('wrong password', first)).toBe(false);
    expect(verifyPassword('password', 'malformed')).toBe(false);
  });

  it('signs and verifies payloads, rejecting tampering and expiry', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    const token = signJwt({ sub: 'user-1', role: 'ADMIN' }, 60);
    expect(verifyJwt<{ sub: string; role: string }>(token)).toMatchObject({ sub: 'user-1', role: 'ADMIN' });

    const [header, body] = token.split('.');
    expect(verifyJwt(`${header}.${body}.invalid`)).toBeNull();
    expect(verifyJwt('not.a.jwt')).toBeNull();

    const expired = signJwt({ sub: 'user-1' }, -1);
    expect(verifyJwt(expired)).toBeNull();
  });

  it('requires a sufficiently long secret in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    expect(() => signJwt({ sub: 'user-1' })).toThrow(/minimal harus 32/);
  });
});

import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

/**
 * Validates and retrieves the JWT signing secret.
 * Enforces strict security requirements in production to prevent token forgery.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        '[CRITICAL SECURITY EXCEPTION] Variabel lingkungan JWT_SECRET belum dikonfigurasi pada mode produksi. ' +
        'Silakan buat kunci rahasia minimal 32 karakter (misal: openssl rand -hex 32) pada konfigurasi environment server.'
      );
    }
    return 'si-spd-banggai-laut-local-development-secret-key-32chars';
  }

  if (secret.length < 32 && isProduction) {
    throw new Error(
      '[CRITICAL SECURITY EXCEPTION] Panjang kunci JWT_SECRET minimal harus 32 karakter demi keamanan tanda tangan HMAC-SHA256.'
    );
  }

  return secret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(password, salt, 64);
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// ponytail: stdlib HMAC JWT, add @nestjs/jwt if complex JWKS/asymmetric rotation needed
export function signJwt(payload: object, expiresInSeconds = 86400): string {
  const secret = getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const secret = getJwtSecret();
    const expectedSig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch {
    return null;
  }
}

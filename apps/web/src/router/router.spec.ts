import { describe, expect, it, beforeEach } from 'vitest';
import router from './index';
import { Role } from '@si-setda/shared-types';

describe('Router & Navigation Guard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await router.push('/');
  });

  it('redirects unauthenticated users to /login when accessing protected routes', async () => {
    await router.push('/surat-tugas');
    expect(router.currentRoute.value.name).toBe('Login');
    expect(router.currentRoute.value.query.redirect).toBe('/surat-tugas');
  });

  it('allows unauthenticated users to access /login directly', async () => {
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('Login');
  });

  it('redirects authenticated users away from /login to Home', async () => {
    // Navigate somewhere else first so pushing /login is a state change
    await router.push('/unauthorized');

    localStorage.setItem('auth_token', 'valid-token-123');
    localStorage.setItem('user_role', Role.STAFF);

    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('Home');
  });

  it('allows navigation when user possesses the required role', async () => {
    localStorage.setItem('auth_token', 'valid-token-123');
    localStorage.setItem('user_role', Role.ADMIN);

    await router.push('/pengaturan/pengguna');
    expect(router.currentRoute.value.name).toBe('PengaturanPengguna');
  });

  it('redirects to /unauthorized when user role is insufficient for route', async () => {
    localStorage.setItem('auth_token', 'valid-token-123');
    localStorage.setItem('user_role', Role.USER); // USER cannot access /pengaturan/pengguna (requires SUPER_ADMIN or ADMIN)

    await router.push('/pengaturan/pengguna');
    expect(router.currentRoute.value.name).toBe('Unauthorized');
  });
});

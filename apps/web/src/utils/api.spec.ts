import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, getAuthToken, APP_CLIENT_HEADER, APP_CLIENT_ID } from './api';

describe('apiFetch', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/dashboard');
  });

  it('adds the app and bearer headers', async () => {
    localStorage.setItem('auth_token', 'token-1');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    await apiFetch('/api/test');
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(request.headers);
    expect(headers.get(APP_CLIENT_HEADER)).toBe(APP_CLIENT_ID);
    expect(headers.get('Authorization')).toBe('Bearer ' + 'token-1');
    expect(getAuthToken()).toBe('token-1');
  });

  it('clears session and redirects after 401', async () => {
    localStorage.setItem('auth_token', 'token-1');
    localStorage.setItem('user_role', 'ADMIN');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    await apiFetch('/api/test');
    expect(getAuthToken()).toBeNull();
    expect(localStorage.getItem('user_role')).toBeNull();
    expect(window.location.pathname).toBe('/login');
  });
});

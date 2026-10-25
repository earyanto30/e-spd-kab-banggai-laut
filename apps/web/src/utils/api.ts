export const APP_CLIENT_HEADER = 'x-app-client';
export const APP_CLIENT_ID = 'si-spd-web';

/**
 * Enhanced fetch wrapper that automatically attaches the bearer token
 * and application client signature headers, with 401 automatic redirect.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(init?.headers || {});

  headers.set(APP_CLIENT_HEADER, APP_CLIENT_ID);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');

    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return response;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Session: JWT stored in localStorage. Validation = GET /hello with token; 401 = invalid.
 * Only use in client components (localStorage).
 */

const TOKEN_KEY = 'smartpill_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * API client for SmartPill server. Uses NEXT_PUBLIC_API_URL (default http://localhost:3000).
 */

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type LoginResponse = { token: string };
export type RegisterResponse = { id: number; email: string };
export type HelloResponse = { message: string };
export type ErrorResponse = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<LoginResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as LoginResponse;
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  const res = await fetch(`${getBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<RegisterResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as RegisterResponse;
}

export async function hello(token: string): Promise<HelloResponse> {
  const res = await fetch(`${getBaseUrl()}/hello`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<HelloResponse | ErrorResponse>(res);
  if (!res.ok) throw new Error((data as ErrorResponse).error ?? res.statusText);
  return data as HelloResponse;
}

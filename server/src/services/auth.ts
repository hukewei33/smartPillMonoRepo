import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { DatabaseInstance } from '../db';
import type { LoginInput, RegisterInput, User, UserRow } from '../models/user';
import { getJwtSecret } from '../middleware/auth';

const MIN_PASSWORD_LENGTH = 8;

/** Get authenticated user id from JWT payload. Throws if missing or invalid. */
export function getUserId(payload: { sub?: unknown } | undefined): number {
  const sub = payload?.sub;
  if (sub == null || typeof sub !== 'number') {
    throw new Error('User id missing');
  }
  return sub;
}
const JWT_EXPIRES_IN = '1h';

function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string' || !email.trim()) return false;
  const at = email.indexOf('@');
  return at > 0 && at < email.length - 1;
}

export function validateRegisterBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (!isValidEmail(email)) return 'Invalid or missing email';
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export function validateLoginBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (!isValidEmail(email)) return 'Invalid or missing email';
  if (typeof password !== 'string' || !password) return 'Password required';
  return null;
}

function isSqliteUniqueError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}

export type RegisterResult =
  | { ok: true; user: User }
  | { ok: false; status: 400 | 409; error: string };

export async function register(db: DatabaseInstance, input: RegisterInput): Promise<RegisterResult> {
  const trimmedEmail = input.email.trim().toLowerCase();
  try {
    const password_hash = await argon2.hash(input.password);
    const result = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(trimmedEmail, password_hash);
    return {
      ok: true,
      user: { id: result.lastInsertRowid as number, email: trimmedEmail },
    };
  } catch (e) {
    if (isSqliteUniqueError(e)) {
      return { ok: false, status: 409, error: 'Email already registered' };
    }
    throw e;
  }
}

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; status: 400 | 401; error: string };

export async function login(db: DatabaseInstance, input: LoginInput): Promise<LoginResult> {
  const trimmedEmail = input.email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(trimmedEmail) as UserRow | undefined;
  if (!user) {
    return { ok: false, status: 401, error: 'Invalid email or password' };
  }
  const valid = await argon2.verify(user.password_hash, input.password);
  if (!valid) {
    return { ok: false, status: 401, error: 'Invalid email or password' };
  }
  const secret = getJwtSecret();
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    secret,
    { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN }
  );
  return { ok: true, token };
}

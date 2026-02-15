import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';

const router = Router();
const MIN_PASSWORD_LENGTH = 8;
const JWT_EXPIRES_IN = '1h';

function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string' || !email.trim()) return false;
  const at = email.indexOf('@');
  return at > 0 && at < email.length - 1;
}

function validateRegisterBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (!isValidEmail(email)) return 'Invalid or missing email';
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validateLoginBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (!isValidEmail(email)) return 'Invalid or missing email';
  if (typeof password !== 'string' || !password) return 'Password required';
  return null;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
}

function isSqliteUniqueError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}

router.post('/register', async (req: Request, res: Response) => {
  const db = req.app.get('db');
  const errMsg = validateRegisterBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }
  const { email, password } = req.body as { email: string; password: string };
  const trimmedEmail = email.trim().toLowerCase();
  try {
    const password_hash = await argon2.hash(password);
    const result = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(trimmedEmail, password_hash);
    return res.status(201).json({
      id: result.lastInsertRowid as number,
      email: trimmedEmail,
    });
  } catch (e) {
    if (isSqliteUniqueError(e)) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw e;
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const db = req.app.get('db');
  const errMsg = validateLoginBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }
  const { email, password } = req.body as { email: string; password: string };
  const trimmedEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(trimmedEmail) as UserRow | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const secret = getJwtSecret();
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    secret,
    { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN }
  );
  return res.status(200).json({ token });
});

export default router;

import { expressjwt } from 'express-jwt';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function authMiddleware() {
  return expressjwt({
    secret: getJwtSecret(),
    algorithms: ['HS256'],
    requestProperty: 'user',
  });
}

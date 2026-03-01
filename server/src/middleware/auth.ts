import { expressjwt } from 'express-jwt';
import { getJwtSecret } from '../config';

export function authMiddleware() {
  return expressjwt({
    secret: getJwtSecret(),
    algorithms: ['HS256'],
    requestProperty: 'user',
  });
}

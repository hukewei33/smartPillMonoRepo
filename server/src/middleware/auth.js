const { expressjwt: expressJwt } = require('express-jwt');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function authMiddleware() {
  return expressJwt({
    secret: getJwtSecret(),
    algorithms: ['HS256'],
    requestProperty: 'user',
  });
}

module.exports = { authMiddleware, getJwtSecret };

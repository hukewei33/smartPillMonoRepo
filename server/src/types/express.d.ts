import type { DatabaseInstance } from '../db';

export interface JwtPayload {
  sub: number;
  email?: string;
}

declare global {
  namespace Express {
    interface Application {
      get(name: 'db'): DatabaseInstance;
      set(name: 'db', db: DatabaseInstance): void;
    }
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};

/**
 * User entity and related DTOs.
 */

/** Public user shape (no password). */
export interface User {
  id: number;
  email: string;
}

/** Row as returned from the users table. */
export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at?: string;
}

/** Input for registration. */
export interface RegisterInput {
  email: string;
  password: string;
}

/** Input for login. */
export interface LoginInput {
  email: string;
  password: string;
}

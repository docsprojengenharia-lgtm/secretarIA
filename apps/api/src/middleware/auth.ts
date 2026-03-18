import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

export interface JwtPayload {
  userId: string;
  clinicId: string;
  email: string;
  role: string;
}

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Token de autenticacao necessario' } },
        401,
      );
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      c.set('userId', payload.userId);
      c.set('clinicId', payload.clinicId);
      c.set('email', payload.email);
      c.set('role', payload.role);
      return next();
    } catch {
      return c.json(
        { success: false, error: { code: 'AUTH_INVALID', message: 'Token invalido ou expirado' } },
        401,
      );
    }
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

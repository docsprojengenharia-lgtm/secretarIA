import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

export interface JwtPayload {
  userId: string;
  clinicId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  clinicId: string;
  type: 'refresh';
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
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}

// Gera refresh token com expiracao de 7 dias (contem apenas userId, clinicId e type)
export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_SECRET, { expiresIn: '7d' });
}

// Verifica e decodifica o refresh token, garantindo que eh do tipo correto
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Token nao eh do tipo refresh');
  }
  return payload;
}

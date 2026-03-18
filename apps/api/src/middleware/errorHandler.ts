import type { Context } from 'hono';
import { AppError } from '../lib/errors.js';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      err.status as any,
    );
  }

  console.error(`[UNHANDLED] ${c.req.method} ${c.req.path}:`, err);
  return c.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
    500,
  );
}

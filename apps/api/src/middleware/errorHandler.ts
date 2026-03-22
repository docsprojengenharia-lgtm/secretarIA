import type { Context } from 'hono';
import * as Sentry from '@sentry/node';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../lib/env.js';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      err.status as any,
    );
  }

  // Logar erro nao tratado com contexto estruturado
  logger.error(
    { err, method: c.req.method, path: c.req.path },
    'Erro nao tratado',
  );

  // Enviar para Sentry se configurado
  if (env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: { clinicId: c.get('clinicId') || 'unknown' },
      extra: { method: c.req.method, path: c.req.path },
    });
  }

  return c.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' } },
    500,
  );
}

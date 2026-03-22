import type { Context } from 'hono';
import { error } from '../lib/response.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/**
 * Valida se o parametro de rota eh um UUID valido.
 * Retorna resposta de erro se invalido, ou null se valido.
 */
export function validateIdParam(c: Context, paramName: string = 'id') {
  const id = c.req.param(paramName);
  if (!id || !isValidUUID(id)) {
    return error(c, 'INVALID_ID', 'ID invalido', 400);
  }
  return null;
}

import type { Context } from 'hono';

export function success<T>(c: Context, data: T, status: number = 200) {
  return c.json({ success: true, data }, status);
}

export function error(c: Context, code: string, message: string, status: number = 400) {
  return c.json({ success: false, error: { code, message } }, status);
}

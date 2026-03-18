import type { Context, Next } from 'hono';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyFn?: (c: Context) => string;
}

const store = new Map<string, { count: number; resetAt: number }>();

// Limpar entradas expiradas a cada 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key);
  }
}, 60_000);

export function rateLimiter(opts: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const key = opts.keyFn
      ? opts.keyFn(c)
      : c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    const fullKey = `${c.req.path}:${key}`;
    const now = Date.now();
    const record = store.get(fullKey);

    if (!record || now > record.resetAt) {
      store.set(fullKey, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    if (record.count >= opts.max) {
      return c.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Muitas requisicoes. Tente novamente em breve.' } },
        429,
      );
    }

    record.count++;
    return next();
  };
}

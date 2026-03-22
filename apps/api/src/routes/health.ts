import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@secretaria/db';
import { redis, redisAvailable } from '../lib/redis.js';

const router = new Hono();

router.get('/', async (c) => {
  const checks: Record<string, boolean> = {};

  // Verifica conexao com o banco de dados
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Verifica conexao com Redis (opcional)
  if (redis && redisAvailable) {
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }
  } else {
    checks.redis = false; // Nao configurado ou indisponivel
  }

  const healthy = checks.database; // DB eh obrigatorio, Redis eh opcional

  return c.json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }, healthy ? 200 : 503);
});

export default router;

import { Hono } from 'hono';

const router = new Hono();

router.get('/', (c) => {
  return c.json({ status: 'ok', service: 'SecretarIA API', version: '0.1.0' });
});

export default router;

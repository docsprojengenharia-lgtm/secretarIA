import { Hono } from 'hono';
import { registerSchema, loginSchema } from '../validators/auth.js';
import * as authService from '../services/auth.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// POST /auth/register
router.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await authService.register(parsed.data);
  return success(c, result, 201);
});

// POST /auth/login
router.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await authService.login(parsed.data);
  return success(c, result);
});

// POST /auth/refresh — gera novo par de tokens (NAO requer auth middleware)
router.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;
  if (!refreshToken || typeof refreshToken !== 'string') {
    return error(c, 'VALIDATION_ERROR', 'refreshToken e obrigatorio', 400);
  }
  try {
    const result = await authService.refreshAccessToken(refreshToken);
    return success(c, result);
  } catch {
    return error(c, 'AUTH_INVALID', 'Refresh token invalido ou expirado', 401);
  }
});

// GET /auth/me (protected - will be behind auth middleware in index.ts)
router.get('/me', async (c) => {
  const userId = c.get('userId') as string;
  const result = await authService.getMe(userId);
  return success(c, result);
});

export default router;

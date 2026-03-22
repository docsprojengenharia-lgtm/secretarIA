import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';

import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authMiddleware } from './middleware/auth.js';

// Inicializar Sentry antes de qualquer middleware
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  });
  logger.info('Sentry inicializado');
}

// Routes
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import clinicsRouter from './routes/clinics.js';
import professionalsRouter from './routes/professionals.js';
import servicesRouter from './routes/services.js';
import availabilityRouter from './routes/availability.js';
import appointmentsRouter from './routes/appointments.js';
import whatsappRouter from './routes/whatsapp.js';
import conversationsRouter from './routes/conversations.js';
import contactsRouter from './routes/contacts.js';
import bookingRequestsRouter from './routes/booking-requests.js';
import knowledgeRouter from './routes/knowledge.js';
import blockedTimesRouter from './routes/blocked-times.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import sseRouter from './routes/sse.js';
import channelsRouter from './routes/channels.js';
import instagramRouter from './routes/instagram.js';
import publicRouter from './routes/public.js';
import templatesRouter from './routes/templates.js';

// Workers
import { startWorkers, stopWorkers } from './workers/setup.js';

// Database connection (for pgvector setup)
import { connection } from '@secretaria/db';

// Scheduler
import { startScheduler } from './jobs/scheduler.js';

const app = new Hono();

// Middlewares
app.use('*', honoLogger());

const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use('*', cors({ origin: allowedOrigins, credentials: true }));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '0');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
});

// Public routes (NO auth)
app.route('/health', healthRouter);
app.post('/public/clinics/*/book', rateLimiter({ windowMs: 60_000, max: 10 }));
app.route('/public', publicRouter);

// Root
app.get('/', (c) => {
  return c.json({ name: 'SecretarIA API', version: '0.1.0', status: 'running' });
});

// Rate limiting on auth
app.post('/auth/register', rateLimiter({ windowMs: 60_000, max: 5 }));
app.post('/auth/login', rateLimiter({ windowMs: 15 * 60_000, max: 10 }));

// Protected routes — require auth (must come BEFORE route registration)
app.use('/auth/me', authMiddleware());
app.use('/clinics/*', authMiddleware());
app.use('/professionals/*', authMiddleware());
app.use('/services/*', authMiddleware());
app.use('/availability/*', authMiddleware());
app.use('/appointments/*', authMiddleware());
app.use('/whatsapp/setup', authMiddleware());
app.use('/whatsapp/qr', authMiddleware());
app.use('/whatsapp/status', authMiddleware());
app.use('/whatsapp/disconnect', authMiddleware());
app.use('/conversations/*', authMiddleware());
app.use('/contacts/*', authMiddleware());
app.use('/booking-requests/*', authMiddleware());
app.use('/blocked-times/*', authMiddleware());
app.use('/knowledge/*', authMiddleware());
app.use('/analytics/*', authMiddleware());
app.use('/reports/*', authMiddleware());
app.use('/channels/*', authMiddleware());
app.use('/templates/*', authMiddleware());
// SSE: auth via query param (EventSource nao suporta headers customizados)
// Instagram webhook: public (Meta precisa acessar sem auth)

// Register routes (after middleware)
app.route('/auth', authRouter);
app.route('/clinics', clinicsRouter);
app.route('/professionals', professionalsRouter);
app.route('/services', servicesRouter);
app.route('/availability', availabilityRouter);
app.route('/appointments', appointmentsRouter);
app.route('/whatsapp', whatsappRouter);
app.route('/conversations', conversationsRouter);
app.route('/contacts', contactsRouter);
app.route('/booking-requests', bookingRequestsRouter);
app.route('/blocked-times', blockedTimesRouter);
app.route('/knowledge', knowledgeRouter);
app.route('/analytics', analyticsRouter);
app.route('/reports', reportsRouter);
app.route('/sse', sseRouter);
app.route('/channels', channelsRouter);
app.route('/instagram', instagramRouter);
app.route('/templates', templatesRouter);

// Error handlers
app.onError(errorHandler);
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota nao encontrada' } }, 404);
});

// Start server
const port = env.PORT;
logger.info({ port }, 'SecretarIA API iniciando...');

const server = serve({ fetch: app.fetch, port, hostname: '::' });
logger.info({ port }, 'Server rodando');

// Start BullMQ workers
startWorkers();

// Start cron jobs
startScheduler();

// Enable pgvector extension
connection.unsafe('CREATE EXTENSION IF NOT EXISTS vector').catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  logger.warn({ err: message }, 'pgvector extension pode ja existir');
});

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info({ signal }, 'Sinal recebido — encerrando...');
  await stopWorkers();
  server.close(() => {
    logger.info('Server encerrado');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Encerramento forcado por timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

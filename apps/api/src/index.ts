import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { env } from './lib/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { authMiddleware } from './middleware/auth.js';

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

// Workers
import { startWorkers, stopWorkers } from './workers/setup.js';

// Database connection (for pgvector setup)
import { connection } from '@secretaria/db';

// Scheduler
import { startScheduler } from './jobs/scheduler.js';

const app = new Hono();

// Middlewares
app.use('*', logger());

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
});

// Public routes
app.route('/health', healthRouter);

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

// Error handlers
app.onError(errorHandler);
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota nao encontrada' } }, 404);
});

// Start server
const port = env.PORT;
console.log(`SecretarIA API starting on port ${port}...`);

const server = serve({ fetch: app.fetch, port, hostname: '::' });
console.log(`Server running on http://localhost:${port}`);

// Start BullMQ workers
startWorkers();

// Start cron jobs
startScheduler();

// Enable pgvector extension
connection.unsafe('CREATE EXTENSION IF NOT EXISTS vector').catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.warn('[pgvector] Extension may already exist:', message);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);
  await stopWorkers();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

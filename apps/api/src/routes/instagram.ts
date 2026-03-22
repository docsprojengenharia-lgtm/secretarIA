import { Hono } from 'hono';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const router = new Hono();

// GET /instagram/webhook — Meta webhook verification (challenge)
router.get('/webhook', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  // Verify token matches our configured token
  if (mode === 'subscribe' && token === env.INSTAGRAM_VERIFY_TOKEN) {
    logger.info('Instagram webhook verificado com sucesso');
    return c.text(challenge || '', 200);
  }
  logger.warn({ mode, tokenPresent: !!token }, 'Instagram webhook verificacao falhou');
  return c.text('Forbidden', 403);
});

// POST /instagram/webhook — receive Instagram DM messages
router.post('/webhook', async (c) => {
  const body = await c.req.json();

  // Meta sends: { object: 'instagram', entry: [{ messaging: [{ sender, recipient, message }] }] }
  // For now, log and acknowledge
  logger.info({ bodyPreview: JSON.stringify(body).substring(0, 500) }, '[Instagram] Webhook recebido');

  // TODO: Process messages similar to WhatsApp webhook
  // 1. Extract sender ID, message text
  // 2. Map sender to clinic via page_id/recipient
  // 3. Reuse bot.processIncomingMessage() with channel='instagram'
  // 4. Reply via Instagram Graph API

  return c.text('EVENT_RECEIVED', 200);
});

export default router;

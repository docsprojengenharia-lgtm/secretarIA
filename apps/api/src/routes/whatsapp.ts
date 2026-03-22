import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { clinics } from '@secretaria/db';
import { eq } from 'drizzle-orm';
import * as whatsappService from '../services/whatsapp.js';
import { addToIncomingQueue } from '../workers/setup.js';
import { success, error } from '../lib/response.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { maskPhone } from '../lib/mask.js';
import { redis, redisAvailable } from '../lib/redis.js';

const router = new Hono();

// Rate limit in-memory fallback (usado quando Redis nao esta disponivel)
const contactRateLimit = new Map<string, { count: number; resetAt: number }>();

// POST /whatsapp/webhook — PUBLIC, receives Evolution API webhooks
router.post('/webhook', async (c) => {
  // Validar API key da Evolution API
  const apiKey = c.req.header('apikey');
  if (apiKey !== env.EVOLUTION_API_KEY) {
    logger.warn('Webhook recebido com API key invalida');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const event = body.event;

    // Only process message events
    if (event !== 'messages.upsert') {
      return c.json({ status: 'ignored' });
    }

    const data = body.data;
    const instanceName = body.instance;
    const message = data?.message;
    const key = data?.key;

    // Ignore messages sent by us (fromMe)
    if (key?.fromMe) {
      return c.json({ status: 'ignored' });
    }

    // Extract phone number (remove @s.whatsapp.net)
    const remoteJid = key?.remoteJid || '';
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    if (!phone || !instanceName) {
      return c.json({ status: 'ignored' });
    }

    // Find clinic by instance name (antes do rate limit pra ter clinicId)
    const [clinic] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.evolutionInstanceName, instanceName))
      .limit(1);

    if (!clinic) {
      logger.warn({ instanceName }, 'Nenhuma clinica encontrada para instancia');
      return c.json({ status: 'no_clinic' });
    }

    // Rate limit por contato (clinicId + phone) — protege contra flood
    if (redis && redisAvailable) {
      try {
        const rateLimitKey = `ratelimit:msg:${clinic.id}:${phone}`;
        const count = await redis.incr(rateLimitKey);
        if (count === 1) await redis.expire(rateLimitKey, 60); // janela de 1 minuto
        if (count > 10) {
          console.warn(`[Webhook] Rate limited: ${phone} (${count} msgs/min)`);
          return c.json({ status: 'rate_limited' }, 200); // 200 pra nao triggar retry do webhook
        }
      } catch (err) {
        // Se Redis falhar no rate limit, continua processando (melhor que bloquear)
        logger.warn({ err }, 'Erro no rate limit via Redis, continuando sem limitar');
      }
    } else {
      // Fallback in-memory quando Redis nao esta disponivel
      const rateLimitKey = `${clinic.id}:${phone}`;
      const now = Date.now();
      const entry = contactRateLimit.get(rateLimitKey);

      if (entry && now < entry.resetAt) {
        entry.count++;
        if (entry.count > 10) {
          console.warn(`[Webhook] Rate limited (in-memory): ${phone} (${entry.count} msgs/min)`);
          return c.json({ status: 'rate_limited' }, 200);
        }
      } else {
        contactRateLimit.set(rateLimitKey, { count: 1, resetAt: now + 60_000 });
      }

      // Limpar entradas expiradas periodicamente (a cada ~100 mensagens)
      if (contactRateLimit.size > 100) {
        for (const [key, val] of contactRateLimit) {
          if (now >= val.resetAt) contactRateLimit.delete(key);
        }
      }
    }

    // Extract pushName (WhatsApp profile name)
    const pushName = data?.pushName || null;

    // Extract text content — tratar tipos de midia especificos
    let text = '';
    if (message?.conversation) {
      text = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message?.audioMessage) {
      text = '[audio]'; // Sera transcrito no worker
    } else if (message?.imageMessage) {
      text = '[Imagem recebida - no momento processo apenas texto e audio]';
    } else if (message?.documentMessage) {
      text = '[Documento recebido - no momento processo apenas texto e audio]';
    } else if (message?.videoMessage) {
      text = '[Video recebido - no momento processo apenas texto e audio]';
    } else if (message?.contactMessage || message?.contactsArrayMessage) {
      text = '[Contato recebido - no momento processo apenas texto e audio]';
    } else if (message?.locationMessage) {
      text = '[Localizacao recebida - no momento processo apenas texto e audio]';
    } else if (message?.stickerMessage) {
      text = '[Sticker recebido]';
      // Stickers nao sao processados — apenas reconhece
    } else {
      text = '[Mensagem recebida em formato nao suportado]';
    }

    // Add to processing queue
    const queued = await addToIncomingQueue('process', {
      clinicId: clinic.id,
      instanceName,
      phone,
      text,
      pushName,
      messageType: message?.audioMessage ? 'audio' : 'text',
      messageId: key?.id,
    });

    return c.json({ status: queued ? 'queued' : 'queue_unavailable' });
  } catch (err) {
    logger.error({ err }, 'Erro ao processar webhook');
    return c.json({ status: 'error' }, 200); // Always return 200 to webhook
  }
});

// POST /whatsapp/setup — Create Evolution instance for clinic
router.post('/setup', async (c) => {
  const clinicId = c.get('clinicId') as string;

  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  if (!clinic) return error(c, 'CLINIC_NOT_FOUND', 'Clinica nao encontrada', 404);

  // Generate instance name
  const instanceName = `secretaria-${clinic.slug}`;
  const webhookUrl = `${env.API_URL || 'http://localhost:3001'}/whatsapp/webhook`;

  try {
    await whatsappService.createInstance(instanceName, webhookUrl);

    // Save instance name to clinic
    await db.update(clinics)
      .set({ evolutionInstanceName: instanceName, updatedAt: new Date() })
      .where(eq(clinics.id, clinicId));

    return success(c, { instanceName, message: 'Instancia criada. Escaneie o QR code para conectar.' });
  } catch (err: any) {
    return error(c, 'WHATSAPP_SETUP_ERROR', err.message || 'Erro ao configurar WhatsApp', 500);
  }
});

// GET /whatsapp/qr — Get QR code
router.get('/qr', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

  if (!clinic?.evolutionInstanceName) {
    return error(c, 'WHATSAPP_NOT_SETUP', 'WhatsApp ainda nao foi configurado', 400);
  }

  try {
    const result = await whatsappService.getQrCode(clinic.evolutionInstanceName);
    return success(c, result);
  } catch (err: any) {
    return error(c, 'QR_ERROR', err.message || 'Erro ao obter QR code', 500);
  }
});

// GET /whatsapp/status — Connection status
router.get('/status', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

  if (!clinic?.evolutionInstanceName) {
    return success(c, { connected: false, status: 'not_setup' });
  }

  try {
    const result = await whatsappService.getInstanceStatus(clinic.evolutionInstanceName);
    return success(c, {
      connected: result?.instance?.state === 'open',
      status: result?.instance?.state || 'unknown',
    });
  } catch {
    return success(c, { connected: false, status: 'error' });
  }
});

// POST /whatsapp/disconnect
router.post('/disconnect', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

  if (!clinic?.evolutionInstanceName) {
    return error(c, 'WHATSAPP_NOT_SETUP', 'WhatsApp nao configurado', 400);
  }

  try {
    await whatsappService.disconnectInstance(clinic.evolutionInstanceName);
    return success(c, { message: 'WhatsApp desconectado' });
  } catch (err: any) {
    return error(c, 'DISCONNECT_ERROR', err.message || 'Erro ao desconectar', 500);
  }
});

export default router;

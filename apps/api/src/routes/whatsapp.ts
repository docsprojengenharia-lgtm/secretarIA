import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { clinics } from '@secretaria/db';
import { eq } from 'drizzle-orm';
import * as whatsappService from '../services/whatsapp.js';
import { incomingQueue } from '../workers/setup.js';
import { success, error } from '../lib/response.js';
import { env } from '../lib/env.js';

const router = new Hono();

// POST /whatsapp/webhook — PUBLIC, receives Evolution API webhooks
router.post('/webhook', async (c) => {
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

    // Extract text content
    let text = '';
    if (message?.conversation) {
      text = message.conversation;
    } else if (message?.extendedTextMessage?.text) {
      text = message.extendedTextMessage.text;
    } else if (message?.audioMessage) {
      text = '[audio]'; // Will be transcribed in the worker
    } else {
      text = '[midia nao suportada]';
    }

    // Find clinic by instance name
    const [clinic] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.evolutionInstanceName, instanceName))
      .limit(1);

    if (!clinic) {
      console.warn(`[Webhook] No clinic found for instance: ${instanceName}`);
      return c.json({ status: 'no_clinic' });
    }

    // Add to processing queue
    await incomingQueue.add('process', {
      clinicId: clinic.id,
      instanceName,
      phone,
      text,
      messageType: message?.audioMessage ? 'audio' : 'text',
      messageId: key?.id,
    });

    return c.json({ status: 'queued' });
  } catch (err) {
    console.error('[Webhook] Error:', err);
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

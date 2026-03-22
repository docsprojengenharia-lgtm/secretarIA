import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { conversations, messages, contacts, clinics } from '@secretaria/db';
import { eq, and } from 'drizzle-orm';
import { success, error } from '../lib/response.js';
import * as conversationService from '../services/conversation.js';
import { addToOutgoingQueue } from '../workers/setup.js';
import * as whatsappService from '../services/whatsapp.js';

const router = new Hono();

// GET /conversations — list conversations with filters
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const status = c.req.query('status');
  const search = c.req.query('search');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));

  const result = await conversationService.listConversations(clinicId, {
    status,
    search,
    page,
    limit,
  });

  return success(c, result);
});

// GET /conversations/:id — get conversation with messages
router.get('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const [conversation] = await db
    .select({
      id: conversations.id,
      contactId: conversations.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      status: conversations.status,
      channel: conversations.channel,
      startedAt: conversations.startedAt,
      endedAt: conversations.endedAt,
      metadata: conversations.metadata,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(and(eq(conversations.id, id), eq(conversations.clinicId, clinicId)))
    .limit(1);

  if (!conversation) {
    return error(c, 'CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  const msgs = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      audioUrl: messages.audioUrl,
      intent: messages.intent,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(eq(messages.conversationId, id), eq(messages.clinicId, clinicId)))
    .orderBy(messages.createdAt);

  return success(c, { ...conversation, messages: msgs });
});

// PATCH /conversations/:id/handoff — mark as pending_human
router.patch('/:id/handoff', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const [updated] = await db
    .update(conversations)
    .set({ status: 'pending_human', updatedAt: new Date() })
    .where(and(
      eq(conversations.id, id),
      eq(conversations.clinicId, clinicId),
      eq(conversations.status, 'active'),
    ))
    .returning();

  if (!updated) {
    return error(c, 'CONVERSATION_NOT_FOUND', 'Conversa nao encontrada ou nao esta ativa', 404);
  }

  return success(c, updated);
});

// POST /conversations/:id/reply — send reply from dashboard
router.post('/:id/reply', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const { message } = await c.req.json();

  if (!message?.trim()) {
    return error(c, 'VALIDATION_ERROR', 'Mensagem e obrigatoria', 400);
  }

  // 1. Buscar conversa com dados do contato
  const [conversation] = await db
    .select({
      id: conversations.id,
      contactId: conversations.contactId,
      contactPhone: contacts.phone,
      status: conversations.status,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(and(eq(conversations.id, id), eq(conversations.clinicId, clinicId)))
    .limit(1);

  if (!conversation) {
    return error(c, 'CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  if (!conversation.contactPhone) {
    return error(c, 'CONTACT_NO_PHONE', 'Contato sem telefone cadastrado', 400);
  }

  // 2. Buscar instancia WhatsApp da clinica
  const [clinic] = await db
    .select({ evolutionInstanceName: clinics.evolutionInstanceName })
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!clinic?.evolutionInstanceName) {
    return error(c, 'WHATSAPP_NOT_SETUP', 'WhatsApp nao configurado para esta clinica', 400);
  }

  // 3. Salvar mensagem no banco (role: assistant, source: dashboard)
  const savedMessage = await conversationService.addMessage(
    clinicId,
    conversation.id,
    'assistant',
    message.trim(),
    undefined,
    { source: 'dashboard' },
  );

  // 4. Enviar via WhatsApp (Evolution API)
  try {
    const queued = await addToOutgoingQueue('dashboard-reply', {
      instanceName: clinic.evolutionInstanceName,
      phone: conversation.contactPhone,
      text: message.trim(),
    });

    // Fallback: enviar diretamente se a fila nao estiver disponivel
    if (!queued) {
      await whatsappService.sendTextMessage(
        clinic.evolutionInstanceName,
        conversation.contactPhone,
        message.trim(),
      );
    }
  } catch (err) {
    console.error('[Conversations] Erro ao enviar resposta via WhatsApp:', err);
    // Mensagem ja foi salva no banco, retornar sucesso parcial
    return success(c, { ...savedMessage, whatsappSent: false });
  }

  return success(c, { ...savedMessage, whatsappSent: true });
});

// PATCH /conversations/:id/close — close conversation
router.patch('/:id/close', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const [updated] = await db
    .update(conversations)
    .set({ status: 'closed', endedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(conversations.id, id),
      eq(conversations.clinicId, clinicId),
    ))
    .returning();

  if (!updated) {
    return error(c, 'CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  return success(c, updated);
});

export default router;

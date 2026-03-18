import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { conversations, messages, contacts } from '@secretaria/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { success, error } from '../lib/response.js';
import { AppError } from '../lib/errors.js';

const router = new Hono();

// GET /conversations — list conversations with filters
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const status = c.req.query('status');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;

  const conditions = [eq(conversations.clinicId, clinicId)];

  if (status) {
    conditions.push(eq(conversations.status, status));
  }

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(...conditions));

  return success(c, {
    data: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  });
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

import { db } from '@secretaria/db';
import { conversations, messages, contacts } from '@secretaria/db';
import { eq, and, desc, asc, sql, ilike, or } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export async function getOrCreateConversation(clinicId: string, contactId: string) {
  // Find existing active conversation for this contact
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.clinicId, clinicId),
        eq(conversations.contactId, contactId),
        eq(conversations.status, 'active'),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (existing) return existing;

  // Also check for pending_human — don't create new if there's one awaiting human
  const [pendingHuman] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.clinicId, clinicId),
        eq(conversations.contactId, contactId),
        eq(conversations.status, 'pending_human'),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  if (pendingHuman) return pendingHuman;

  // Create new conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      clinicId,
      contactId,
      status: 'active',
      channel: 'whatsapp',
      startedAt: new Date(),
    })
    .returning();

  return conversation;
}

export async function addMessage(
  clinicId: string,
  conversationId: string,
  role: string,
  content: string,
  intent?: string,
  metadata?: Record<string, unknown>,
) {
  const [message] = await db
    .insert(messages)
    .values({
      clinicId,
      conversationId,
      role,
      content,
      intent,
      metadata: metadata ?? {},
    })
    .returning();

  // Update conversation updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return message;
}

export async function getRecentMessages(conversationId: string, limit = 10) {
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      intent: messages.intent,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Return in chronological order (oldest first)
  return rows.reverse();
}

export async function markHandoff(clinicId: string, conversationId: string) {
  const [updated] = await db
    .update(conversations)
    .set({
      status: 'pending_human',
      updatedAt: new Date(),
      metadata: { handoffAt: new Date().toISOString() },
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clinicId, clinicId),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  return updated;
}

export async function closeConversation(clinicId: string, conversationId: string) {
  const [updated] = await db
    .update(conversations)
    .set({
      status: 'closed',
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clinicId, clinicId),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  return updated;
}

export async function listConversations(
  clinicId: string,
  filters: {
    status?: string;
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(conversations.clinicId, clinicId)];

  if (filters.status) {
    conditions.push(eq(conversations.status, filters.status));
  }

  const offset = (filters.page - 1) * filters.limit;

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
    .limit(filters.limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(...conditions));

  return {
    data: rows,
    total: count,
    page: filters.page,
    totalPages: Math.ceil(count / filters.limit),
  };
}

export async function getConversationWithMessages(clinicId: string, conversationId: string) {
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
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.clinicId, clinicId),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new AppError('CONVERSATION_NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  const msgs = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      intent: messages.intent,
      audioUrl: messages.audioUrl,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return {
    ...conversation,
    messages: msgs,
  };
}

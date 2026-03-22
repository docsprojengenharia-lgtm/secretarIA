import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@secretaria/db';
import { messageTemplates } from '@secretaria/db';
import { eq, and } from 'drizzle-orm';
import { success, error } from '../lib/response.js';

const router = new Hono();

// Templates padrao usados quando a clinica nao personalizou
const DEFAULTS: Record<string, string> = {
  reminder_d1: 'Oi {nome}! Lembrete: voce tem um agendamento amanha de {servico} as {hora} com {profissional}. Ate la!',
  reminder_day: 'Oi {nome}! Seu agendamento de {servico} eh hoje as {hora} com {profissional}. Te esperamos!',
  nps: 'Oi {nome}! Como foi seu atendimento de {servico}? De uma nota de 1 a 5 (1=ruim, 5=otimo)',
  welcome: 'Oi! Bem-vindo(a) ao {clinica}. Como posso te ajudar?',
  cancellation: 'Oi {nome}! Seu agendamento de {servico} em {data} as {hora} foi cancelado.',
  booking_confirmation: 'Oi {nome}! Agendamento confirmado: {servico} em {data} as {hora} com {profissional}. Ate la!',
};

const EVENT_TYPES = Object.keys(DEFAULTS);

const EVENT_TYPE_LABELS: Record<string, string> = {
  reminder_d1: 'Lembrete D-1 (dia anterior)',
  reminder_day: 'Lembrete no dia',
  nps: 'NPS pos-atendimento',
  welcome: 'Boas-vindas',
  cancellation: 'Cancelamento',
  booking_confirmation: 'Confirmacao de agendamento',
};

// ============================================================================
// GET /templates — list all templates with defaults
// ============================================================================

router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;

  const rows = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.clinicId, clinicId));

  // Build map of existing templates
  const existingMap = new Map(rows.map(r => [r.eventType, r]));

  // Return all event types, using defaults where clinic hasn't customized
  const templates = EVENT_TYPES.map(eventType => {
    const existing = existingMap.get(eventType);
    return {
      eventType,
      label: EVENT_TYPE_LABELS[eventType] || eventType,
      content: existing?.content || DEFAULTS[eventType],
      isActive: existing?.isActive ?? true,
      isCustomized: !!existing,
      id: existing?.id || null,
    };
  });

  return success(c, templates);
});

// ============================================================================
// PUT /templates/:eventType — update template content
// ============================================================================

const updateTemplateSchema = z.object({
  content: z.string().min(1, 'Conteudo obrigatorio').max(2000),
  isActive: z.boolean().optional(),
});

router.put('/:eventType', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const eventType = c.req.param('eventType');

  if (!EVENT_TYPES.includes(eventType)) {
    return error(c, 'INVALID_EVENT_TYPE', `Tipo de evento invalido. Tipos validos: ${EVENT_TYPES.join(', ')}`, 400);
  }

  const body = await c.req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  // Check if template already exists
  const [existing] = await db
    .select({ id: messageTemplates.id })
    .from(messageTemplates)
    .where(and(
      eq(messageTemplates.clinicId, clinicId),
      eq(messageTemplates.eventType, eventType),
    ))
    .limit(1);

  let result;
  if (existing) {
    // Update
    const updateData: Record<string, unknown> = {
      content: parsed.data.content,
      updatedAt: new Date(),
    };
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }

    [result] = await db
      .update(messageTemplates)
      .set(updateData)
      .where(eq(messageTemplates.id, existing.id))
      .returning();
  } else {
    // Insert
    [result] = await db
      .insert(messageTemplates)
      .values({
        clinicId,
        eventType,
        content: parsed.data.content,
        isActive: parsed.data.isActive ?? true,
      })
      .returning();
  }

  return success(c, {
    eventType: result.eventType,
    label: EVENT_TYPE_LABELS[result.eventType] || result.eventType,
    content: result.content,
    isActive: result.isActive,
    isCustomized: true,
    id: result.id,
  });
});

// ============================================================================
// DELETE /templates/:eventType — reset to default
// ============================================================================

router.delete('/:eventType', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const eventType = c.req.param('eventType');

  if (!EVENT_TYPES.includes(eventType)) {
    return error(c, 'INVALID_EVENT_TYPE', `Tipo de evento invalido`, 400);
  }

  await db
    .delete(messageTemplates)
    .where(and(
      eq(messageTemplates.clinicId, clinicId),
      eq(messageTemplates.eventType, eventType),
    ));

  return success(c, {
    eventType,
    label: EVENT_TYPE_LABELS[eventType] || eventType,
    content: DEFAULTS[eventType],
    isActive: true,
    isCustomized: false,
    id: null,
  });
});

export default router;

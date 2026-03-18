import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { blockedTimes, professionals } from '@secretaria/db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { success, error } from '../lib/response.js';
import { AppError } from '../lib/errors.js';

const createBlockedTimeSchema = z.object({
  professionalId: z.string().uuid().nullable().optional(), // null = bloqueia toda empresa
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(255).optional(),
});

const router = new Hono();

// GET /blocked-times?type=clinic|professional&professionalId=
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const type = c.req.query('type'); // clinic = gerais, professional = individuais
  const professionalId = c.req.query('professionalId');

  const conditions = [eq(blockedTimes.clinicId, clinicId)];

  if (type === 'clinic') {
    conditions.push(isNull(blockedTimes.professionalId));
  } else if (type === 'professional' && professionalId) {
    conditions.push(eq(blockedTimes.professionalId, professionalId));
  }

  const rows = await db
    .select({
      id: blockedTimes.id,
      professionalId: blockedTimes.professionalId,
      professionalName: professionals.name,
      startAt: blockedTimes.startAt,
      endAt: blockedTimes.endAt,
      reason: blockedTimes.reason,
      createdAt: blockedTimes.createdAt,
    })
    .from(blockedTimes)
    .leftJoin(professionals, eq(blockedTimes.professionalId, professionals.id))
    .where(and(...conditions))
    .orderBy(desc(blockedTimes.startAt));

  return success(c, rows);
});

// POST /blocked-times
router.post('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = createBlockedTimeSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const { professionalId, startAt, endAt, reason } = parsed.data;

  // Validate dates
  if (new Date(endAt) <= new Date(startAt)) {
    return error(c, 'INVALID_DATES', 'Data final deve ser posterior a data inicial', 400);
  }

  const [blocked] = await db
    .insert(blockedTimes)
    .values({
      clinicId,
      professionalId: professionalId || null,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      reason,
    })
    .returning();

  return success(c, blocked, 201);
});

// DELETE /blocked-times/:id
router.delete('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(blockedTimes)
    .where(and(
      eq(blockedTimes.id, id),
      eq(blockedTimes.clinicId, clinicId),
    ))
    .returning();

  if (!deleted) throw new AppError('BLOCKED_TIME_NOT_FOUND', 'Bloqueio nao encontrado', 404);
  return success(c, { message: 'Bloqueio removido' });
});

export default router;

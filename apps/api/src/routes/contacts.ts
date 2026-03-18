import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { contacts } from '@secretaria/db';
import { eq, and, desc, or, ilike, sql, isNull } from 'drizzle-orm';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /contacts — list contacts with filters
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const status = c.req.query('status');
  const search = c.req.query('search');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;

  const conditions = [eq(contacts.clinicId, clinicId), isNull(contacts.deletedAt)];

  if (status) {
    conditions.push(eq(contacts.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(contacts.name, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      status: contacts.status,
      notes: contacts.notes,
      lastContactAt: contacts.lastContactAt,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.lastContactAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(...conditions));

  return success(c, {
    data: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  });
});

// GET /contacts/:id — get single contact
router.get('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const [contact] = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      status: contacts.status,
      notes: contacts.notes,
      lastContactAt: contacts.lastContactAt,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.clinicId, clinicId), isNull(contacts.deletedAt)))
    .limit(1);

  if (!contact) {
    return error(c, 'CONTACT_NOT_FOUND', 'Contato nao encontrado', 404);
  }

  return success(c, contact);
});

// PUT /contacts/:id — update contact (name, notes, status)
router.put('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.status !== undefined) updateData.status = body.status;

  const [updated] = await db
    .update(contacts)
    .set(updateData)
    .where(and(eq(contacts.id, id), eq(contacts.clinicId, clinicId), isNull(contacts.deletedAt)))
    .returning();

  if (!updated) {
    return error(c, 'CONTACT_NOT_FOUND', 'Contato nao encontrado', 404);
  }

  return success(c, updated);
});

export default router;

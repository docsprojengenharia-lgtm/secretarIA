import { db } from '@secretaria/db';
import { contacts } from '@secretaria/db';
import { eq, and, sql, or, ilike, isNull } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export async function getOrCreateContact(clinicId: string, phone: string, name?: string) {
  // Find existing contact by clinicId + phone
  const [existing] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.clinicId, clinicId),
        eq(contacts.phone, phone),
      ),
    )
    .limit(1);

  if (existing) {
    // Update lastContactAt and name if provided and currently null
    const updates: Record<string, unknown> = {
      lastContactAt: new Date(),
      updatedAt: new Date(),
    };
    if (name && !existing.name) {
      updates.name = name;
    }
    // Update status to active if was inactive
    if (existing.status === 'inactive') {
      updates.status = 'active';
    }

    const [updated] = await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, existing.id))
      .returning();

    return updated;
  }

  // Create new contact
  const [contact] = await db
    .insert(contacts)
    .values({
      clinicId,
      phone,
      name: name ?? null,
      status: 'new',
      lastContactAt: new Date(),
    })
    .returning();

  return contact;
}

export async function listContacts(
  clinicId: string,
  filters: {
    status?: string;
    search?: string;
    page: number;
    limit: number;
  },
) {
  const conditions = [
    eq(contacts.clinicId, clinicId),
    isNull(contacts.deletedAt),
  ];

  if (filters.status) {
    conditions.push(eq(contacts.status, filters.status));
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(contacts.name, searchPattern),
        ilike(contacts.phone, searchPattern),
      )!,
    );
  }

  const offset = (filters.page - 1) * filters.limit;

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
    })
    .from(contacts)
    .where(and(...conditions))
    .orderBy(sql`${contacts.lastContactAt} DESC NULLS LAST`)
    .limit(filters.limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(...conditions));

  return {
    data: rows,
    total: count,
    page: filters.page,
    totalPages: Math.ceil(count / filters.limit),
  };
}

export async function getContact(clinicId: string, id: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.clinicId, clinicId),
        isNull(contacts.deletedAt),
      ),
    )
    .limit(1);

  if (!contact) {
    throw new AppError('CONTACT_NOT_FOUND', 'Contato nao encontrado', 404);
  }

  return contact;
}

export async function updateContact(
  clinicId: string,
  id: string,
  data: {
    name?: string;
    email?: string | null;
    notes?: string | null;
    status?: string;
    birthDate?: string | null;
  },
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;

  const [updated] = await db
    .update(contacts)
    .set(updateData)
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.clinicId, clinicId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError('CONTACT_NOT_FOUND', 'Contato nao encontrado', 404);
  }

  return updated;
}

export async function softDeleteContact(clinicId: string, id: string) {
  const [deleted] = await db
    .update(contacts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, id),
        eq(contacts.clinicId, clinicId),
        isNull(contacts.deletedAt),
      ),
    )
    .returning();

  if (!deleted) {
    throw new AppError('CONTACT_NOT_FOUND', 'Contato nao encontrado', 404);
  }

  return deleted;
}

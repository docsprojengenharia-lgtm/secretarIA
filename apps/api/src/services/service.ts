import { db } from '@secretaria/db';
import { services } from '@secretaria/db';
import { eq, and, isNull } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export async function listServices(clinicId: string) {
  const rows = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.clinicId, clinicId),
        isNull(services.deletedAt),
      ),
    );

  return rows;
}

export async function createService(
  clinicId: string,
  data: {
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    priceInCents: number;
  },
) {
  const [service] = await db
    .insert(services)
    .values({
      clinicId,
      name: data.name,
      description: data.description,
      category: data.category,
      durationMinutes: data.durationMinutes,
      priceInCents: data.priceInCents,
    })
    .returning();

  return service;
}

export async function updateService(
  clinicId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    durationMinutes: number;
    priceInCents: number;
  }>,
) {
  const [updated] = await db
    .update(services)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.clinicId, clinicId),
        isNull(services.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);
  }

  return updated;
}

export async function deleteService(clinicId: string, id: string) {
  const [deleted] = await db
    .update(services)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(services.id, id),
        eq(services.clinicId, clinicId),
        isNull(services.deletedAt),
      ),
    )
    .returning();

  if (!deleted) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);
  }

  return deleted;
}

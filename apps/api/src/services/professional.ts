import { db } from '@secretaria/db';
import { professionals, professionalServices, services, workingHours } from '@secretaria/db';
import { eq, and, isNull } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export async function listProfessionals(clinicId: string) {
  const rows = await db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.clinicId, clinicId),
        isNull(professionals.deletedAt),
      ),
    );

  return rows;
}

export async function createProfessional(
  clinicId: string,
  data: { name: string; phone?: string; email?: string },
) {
  const [professional] = await db
    .insert(professionals)
    .values({
      clinicId,
      name: data.name,
      phone: data.phone,
      email: data.email,
    })
    .returning();

  return professional;
}

export async function updateProfessional(
  clinicId: string,
  id: string,
  data: Partial<{ name: string; phone: string; email: string }>,
) {
  const [updated] = await db
    .update(professionals)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(professionals.id, id),
        eq(professionals.clinicId, clinicId),
        isNull(professionals.deletedAt),
      ),
    )
    .returning();

  if (!updated) {
    throw new AppError('PROFESSIONAL_NOT_FOUND', 'Profissional nao encontrado', 404);
  }

  return updated;
}

export async function deleteProfessional(clinicId: string, id: string) {
  const [deleted] = await db
    .update(professionals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(professionals.id, id),
        eq(professionals.clinicId, clinicId),
        isNull(professionals.deletedAt),
      ),
    )
    .returning();

  if (!deleted) {
    throw new AppError('PROFESSIONAL_NOT_FOUND', 'Profissional nao encontrado', 404);
  }

  return deleted;
}

export async function listWorkingHours(clinicId: string, professionalId: string) {
  const rows = await db
    .select()
    .from(workingHours)
    .where(
      and(
        eq(workingHours.clinicId, clinicId),
        eq(workingHours.professionalId, professionalId),
      ),
    );

  return rows;
}

export async function listProfessionalServices(clinicId: string, professionalId: string) {
  const rows = await db
    .select({
      id: professionalServices.id,
      serviceId: professionalServices.serviceId,
      serviceName: services.name,
      serviceCategory: services.category,
      durationMinutes: services.durationMinutes,
      priceInCents: services.priceInCents,
    })
    .from(professionalServices)
    .innerJoin(services, eq(professionalServices.serviceId, services.id))
    .where(
      and(
        eq(professionalServices.clinicId, clinicId),
        eq(professionalServices.professionalId, professionalId),
        isNull(services.deletedAt),
      ),
    );

  return rows;
}

export async function linkService(
  clinicId: string,
  professionalId: string,
  serviceId: string,
) {
  // Verify professional belongs to clinic and is active
  const [prof] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.clinicId, clinicId),
        isNull(professionals.deletedAt),
      ),
    )
    .limit(1);

  if (!prof) {
    throw new AppError('PROFESSIONAL_NOT_FOUND', 'Profissional nao encontrado', 404);
  }

  // Verify service belongs to clinic and is active
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(
      and(
        eq(services.id, serviceId),
        eq(services.clinicId, clinicId),
        isNull(services.deletedAt),
      ),
    )
    .limit(1);

  if (!svc) {
    throw new AppError('SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);
  }

  // Check for duplicate
  const [existing] = await db
    .select({ id: professionalServices.id })
    .from(professionalServices)
    .where(
      and(
        eq(professionalServices.clinicId, clinicId),
        eq(professionalServices.professionalId, professionalId),
        eq(professionalServices.serviceId, serviceId),
      ),
    )
    .limit(1);

  if (existing) {
    throw new AppError('SERVICE_ALREADY_LINKED', 'Servico ja vinculado a este profissional', 409);
  }

  const [link] = await db
    .insert(professionalServices)
    .values({
      clinicId,
      professionalId,
      serviceId,
    })
    .returning();

  return link;
}

export async function unlinkService(
  clinicId: string,
  professionalId: string,
  serviceId: string,
) {
  const [deleted] = await db
    .delete(professionalServices)
    .where(
      and(
        eq(professionalServices.clinicId, clinicId),
        eq(professionalServices.professionalId, professionalId),
        eq(professionalServices.serviceId, serviceId),
      ),
    )
    .returning();

  if (!deleted) {
    throw new AppError('LINK_NOT_FOUND', 'Vinculo nao encontrado', 404);
  }

  return deleted;
}

export async function replaceWorkingHours(
  clinicId: string,
  professionalId: string,
  hours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
) {
  // Verify professional belongs to clinic
  const [prof] = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.clinicId, clinicId),
        isNull(professionals.deletedAt),
      ),
    )
    .limit(1);

  if (!prof) {
    throw new AppError('PROFESSIONAL_NOT_FOUND', 'Profissional nao encontrado', 404);
  }

  const result = await db.transaction(async (tx) => {
    // Delete all existing working hours for this professional
    await tx
      .delete(workingHours)
      .where(
        and(
          eq(workingHours.clinicId, clinicId),
          eq(workingHours.professionalId, professionalId),
        ),
      );

    if (hours.length === 0) {
      return [];
    }

    // Insert new working hours
    const inserted = await tx
      .insert(workingHours)
      .values(
        hours.map((h) => ({
          clinicId,
          professionalId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      )
      .returning();

    return inserted;
  });

  return result;
}

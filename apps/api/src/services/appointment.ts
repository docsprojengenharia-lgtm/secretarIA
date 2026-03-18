import { db } from '@secretaria/db';
import { appointments, services, contacts, professionals } from '@secretaria/db';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export async function createAppointment(
  clinicId: string,
  data: {
    contactId: string;
    professionalId: string;
    serviceId: string;
    startAt: string;
    source?: string;
  },
) {
  // Get service duration to calculate endAt
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(eq(services.id, data.serviceId))
    .limit(1);

  if (!service) throw new AppError('SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);

  const startAt = new Date(typeof data.startAt === 'string' ? data.startAt : String(data.startAt));
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);
  const startAtISO = startAt.toISOString();
  const endAtISO = endAt.toISOString();

  // Transaction with lock to prevent double-booking
  const result = await db.transaction(async (tx) => {
    // Check for conflicting appointments (SELECT FOR UPDATE)
    const conflicts = await tx.execute(sql`
      SELECT id FROM appointments
      WHERE clinic_id = ${clinicId}
        AND professional_id = ${data.professionalId}
        AND status = 'confirmed'
        AND start_at < ${endAtISO}::timestamp
        AND end_at > ${startAtISO}::timestamp
      FOR UPDATE SKIP LOCKED
    `);

    if (conflicts.length > 0) {
      throw new AppError('APPOINTMENT_CONFLICT', 'Horario ja ocupado. Escolha outro horario.', 409);
    }

    const [appointment] = await tx
      .insert(appointments)
      .values({
        clinicId,
        contactId: data.contactId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        startAt,
        endAt,
        source: data.source || 'dashboard',
      })
      .returning();

    return appointment;
  });

  return result;
}

export async function listAppointments(
  clinicId: string,
  filters: {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    professionalId?: string;
    contactId?: string;
    page: number;
    limit: number;
  },
) {
  const conditions = [eq(appointments.clinicId, clinicId)];

  if (filters.date) {
    const dayStart = new Date(filters.date + 'T00:00:00');
    const dayEnd = new Date(filters.date + 'T23:59:59');
    conditions.push(gte(appointments.startAt, dayStart));
    conditions.push(lte(appointments.startAt, dayEnd));
  } else if (filters.dateFrom || filters.dateTo) {
    if (filters.dateFrom) {
      conditions.push(gte(appointments.startAt, new Date(filters.dateFrom + 'T00:00:00')));
    }
    if (filters.dateTo) {
      conditions.push(lte(appointments.startAt, new Date(filters.dateTo + 'T23:59:59')));
    }
  }
  if (filters.status) {
    conditions.push(eq(appointments.status, filters.status));
  }
  if (filters.professionalId) {
    conditions.push(eq(appointments.professionalId, filters.professionalId));
  }
  if (filters.contactId) {
    conditions.push(eq(appointments.contactId, filters.contactId));
  }

  const offset = (filters.page - 1) * filters.limit;

  const rows = await db
    .select({
      id: appointments.id,
      contactId: appointments.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      source: appointments.source,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .leftJoin(contacts, eq(appointments.contactId, contacts.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(desc(appointments.startAt))
    .limit(filters.limit)
    .offset(offset);

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(and(...conditions));

  return { data: rows, total: count, page: filters.page, totalPages: Math.ceil(count / filters.limit) };
}

export async function getAppointment(clinicId: string, id: string) {
  const [appt] = await db
    .select({
      id: appointments.id,
      contactId: appointments.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      serviceDuration: services.durationMinutes,
      servicePrice: services.priceInCents,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      source: appointments.source,
      cancelReason: appointments.cancelReason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .leftJoin(contacts, eq(appointments.contactId, contacts.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
    .limit(1);

  if (!appt) throw new AppError('APPOINTMENT_NOT_FOUND', 'Agendamento nao encontrado', 404);
  return appt;
}

export async function cancelAppointment(clinicId: string, id: string, reason?: string) {
  const [updated] = await db
    .update(appointments)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
      updatedAt: new Date(),
    })
    .where(and(
      eq(appointments.id, id),
      eq(appointments.clinicId, clinicId),
      eq(appointments.status, 'confirmed'),
    ))
    .returning();

  if (!updated) throw new AppError('APPOINTMENT_NOT_FOUND', 'Agendamento nao encontrado ou ja cancelado', 404);
  return updated;
}

export async function completeAppointment(clinicId: string, id: string) {
  const [updated] = await db
    .update(appointments)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(
      eq(appointments.id, id),
      eq(appointments.clinicId, clinicId),
      eq(appointments.status, 'confirmed'),
    ))
    .returning();

  if (!updated) throw new AppError('APPOINTMENT_NOT_FOUND', 'Agendamento nao encontrado', 404);
  return updated;
}

export async function noShowAppointment(clinicId: string, id: string) {
  const [updated] = await db
    .update(appointments)
    .set({ status: 'no_show', updatedAt: new Date() })
    .where(and(
      eq(appointments.id, id),
      eq(appointments.clinicId, clinicId),
      eq(appointments.status, 'confirmed'),
    ))
    .returning();

  if (!updated) throw new AppError('APPOINTMENT_NOT_FOUND', 'Agendamento nao encontrado', 404);
  return updated;
}

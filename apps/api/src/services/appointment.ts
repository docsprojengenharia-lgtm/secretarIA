import { db } from '@secretaria/db';
import { appointments, services, contacts, professionals, professionalServices, clinics } from '@secretaria/db';
import { eq, and, gte, lte, sql, desc, isNull } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import { addToOutgoingQueue } from '../workers/setup.js';
import * as whatsappService from './whatsapp.js';
import { checkAndNotifyWaitlist } from './waitlistNotifier.js';

export async function createAppointment(
  clinicId: string,
  data: {
    contactId?: string;
    contactName?: string;
    contactPhone?: string;
    professionalId: string;
    serviceId: string;
    startAt: string;
    source?: string;
  },
) {
  // Resolve contactId — use existing or create new contact
  let contactId = data.contactId;

  if (!contactId && data.contactName && data.contactPhone) {
    // Check if contact with same phone already exists for this clinic
    const [existing] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.clinicId, clinicId),
        eq(contacts.phone, data.contactPhone),
        isNull(contacts.deletedAt),
      ))
      .limit(1);

    if (existing) {
      contactId = existing.id;
      // Update name if it was null
      await db
        .update(contacts)
        .set({ name: data.contactName, updatedAt: new Date() })
        .where(and(eq(contacts.id, existing.id), isNull(contacts.name)));
    } else {
      const [newContact] = await db
        .insert(contacts)
        .values({
          clinicId,
          name: data.contactName,
          phone: data.contactPhone,
          status: 'active',
        })
        .returning();
      contactId = newContact.id;
    }
  }

  if (!contactId) {
    throw new AppError('CONTACT_REQUIRED', 'Contato obrigatorio: informe contactId ou nome + telefone', 400);
  }

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

  // Validar que o profissional oferece este servico
  const [profServiceLink] = await db
    .select({ id: professionalServices.professionalId })
    .from(professionalServices)
    .where(
      and(
        eq(professionalServices.professionalId, data.professionalId),
        eq(professionalServices.serviceId, data.serviceId)
      )
    )
    .limit(1);

  if (!profServiceLink) {
    throw new AppError('SERVICE_NOT_OFFERED', 'Este profissional nao oferece o servico selecionado', 400);
  }

  // Transaction with lock to prevent double-booking
  const result = await db.transaction(async (tx) => {
    // Check for conflicting appointments (SELECT FOR UPDATE)
    const conflicts = await tx.execute(sql`
      SELECT id FROM appointments
      WHERE clinic_id = ${clinicId}
        AND professional_id = ${data.professionalId}
        AND status NOT IN ('cancelled', 'no_show')
        AND deleted_at IS NULL
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
        contactId,
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
  const conditions = [eq(appointments.clinicId, clinicId), isNull(appointments.deletedAt)];

  // Use Sao Paulo timezone (UTC-3) for date filtering so dates match BRT
  if (filters.date) {
    const dayStart = new Date(filters.date + 'T00:00:00-03:00');
    const dayEnd = new Date(filters.date + 'T23:59:59-03:00');
    conditions.push(gte(appointments.startAt, dayStart));
    conditions.push(lte(appointments.startAt, dayEnd));
  } else if (filters.dateFrom || filters.dateTo) {
    if (filters.dateFrom) {
      conditions.push(gte(appointments.startAt, new Date(filters.dateFrom + 'T00:00:00-03:00')));
    }
    if (filters.dateTo) {
      conditions.push(lte(appointments.startAt, new Date(filters.dateTo + 'T23:59:59-03:00')));
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
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId), isNull(appointments.deletedAt)))
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

  // Notificar contato via WhatsApp
  try {
    // Buscar dados do contato, servico e clinica
    const [contact] = await db
      .select({ name: contacts.name, phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.id, updated.contactId))
      .limit(1);

    const [service] = await db
      .select({ name: services.name })
      .from(services)
      .where(eq(services.id, updated.serviceId))
      .limit(1);

    const [clinic] = await db
      .select({ evolutionInstanceName: clinics.evolutionInstanceName })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (contact?.phone && clinic?.evolutionInstanceName) {
      const contactName = contact.name || 'Cliente';
      const serviceName = service?.name || 'seu servico';
      const date = new Date(updated.startAt).toLocaleDateString('pt-BR');
      const time = new Date(updated.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const text = `Oi ${contactName}! Seu agendamento de ${serviceName} em ${date} as ${time} foi cancelado. Para reagendar, entre em contato!`;

      const queued = await addToOutgoingQueue('appointment-cancelled', {
        instanceName: clinic.evolutionInstanceName,
        phone: contact.phone,
        text,
      });

      // Fallback: enviar diretamente se a fila nao estiver disponivel
      if (!queued) {
        await whatsappService.sendTextMessage(clinic.evolutionInstanceName, contact.phone, text);
      }
    }
  } catch (err) {
    console.error('[Appointment] Erro ao enviar notificacao de cancelamento via WhatsApp:', err);
    // Nao falhar a operacao principal por causa de erro na notificacao
  }

  // Verificar waitlist e notificar proximo da fila
  try {
    await checkAndNotifyWaitlist(
      clinicId,
      updated.professionalId,
      updated.serviceId,
      new Date(updated.startAt),
      new Date(updated.endAt),
    );
  } catch (err) {
    console.error('[Appointment] Erro ao verificar waitlist apos cancelamento:', err);
    // Nao falhar a operacao principal
  }

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

export async function softDeleteAppointment(clinicId: string, id: string) {
  const [deleted] = await db
    .update(appointments)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(appointments.id, id),
      eq(appointments.clinicId, clinicId),
      isNull(appointments.deletedAt),
    ))
    .returning();

  if (!deleted) throw new AppError('APPOINTMENT_NOT_FOUND', 'Agendamento nao encontrado', 404);
  return deleted;
}

import { db } from '@secretaria/db';
import {
  bookingRequests, contacts, services, professionals, appointments, clinics,
} from '@secretaria/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import * as appointmentService from './appointment.js';
import { addToOutgoingQueue } from '../workers/setup.js';
import * as whatsappService from './whatsapp.js';

export async function createBookingRequest(
  clinicId: string,
  data: {
    contactId: string;
    serviceId: string;
    professionalId?: string;
    requestedStartAt: string;
  },
) {
  const [request] = await db
    .insert(bookingRequests)
    .values({
      clinicId,
      contactId: data.contactId,
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      requestedStartAt: new Date(data.requestedStartAt),
    })
    .returning();

  return request;
}

export async function listBookingRequests(
  clinicId: string,
  filters: { status?: string; page: number; limit: number },
) {
  const conditions = [eq(bookingRequests.clinicId, clinicId)];
  if (filters.status) {
    conditions.push(eq(bookingRequests.status, filters.status));
  }

  const offset = (filters.page - 1) * filters.limit;

  const rows = await db
    .select({
      id: bookingRequests.id,
      contactId: bookingRequests.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      serviceId: bookingRequests.serviceId,
      serviceName: services.name,
      professionalId: bookingRequests.professionalId,
      professionalName: professionals.name,
      requestedStartAt: bookingRequests.requestedStartAt,
      status: bookingRequests.status,
      ownerNote: bookingRequests.ownerNote,
      suggestedStartAt: bookingRequests.suggestedStartAt,
      appointmentId: bookingRequests.appointmentId,
      createdAt: bookingRequests.createdAt,
    })
    .from(bookingRequests)
    .leftJoin(contacts, eq(bookingRequests.contactId, contacts.id))
    .leftJoin(services, eq(bookingRequests.serviceId, services.id))
    .leftJoin(professionals, eq(bookingRequests.professionalId, professionals.id))
    .where(and(...conditions))
    .orderBy(desc(bookingRequests.createdAt))
    .limit(filters.limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingRequests)
    .where(and(...conditions));

  return {
    data: rows,
    total: count,
    page: filters.page,
    totalPages: Math.ceil(count / filters.limit),
  };
}

export async function approveBookingRequest(
  clinicId: string,
  requestId: string,
) {
  const [request] = await db
    .select()
    .from(bookingRequests)
    .where(and(eq(bookingRequests.id, requestId), eq(bookingRequests.clinicId, clinicId)))
    .limit(1);

  if (!request) throw new AppError('REQUEST_NOT_FOUND', 'Solicitacao nao encontrada', 404);
  if (request.status !== 'pending') throw new AppError('REQUEST_NOT_PENDING', 'Solicitacao ja processada', 400);

  // Cria o agendamento e atualiza o status da solicitacao.
  // createAppointment ja usa SELECT FOR UPDATE internamente para prevenir double-booking.
  // O try-catch captura conflito de horario para retornar mensagem clara ao usuario.
  let appointment;
  try {
    appointment = await appointmentService.createAppointment(clinicId, {
      contactId: request.contactId,
      serviceId: request.serviceId,
      professionalId: request.professionalId!,
      startAt: request.requestedStartAt.toISOString(),
      source: 'ai',
    });
  } catch (err) {
    // Horario foi ocupado entre a solicitacao e a aprovacao
    if (err instanceof AppError && err.code === 'APPOINTMENT_CONFLICT') {
      throw new AppError(
        'APPOINTMENT_CONFLICT',
        'Horario nao esta mais disponivel. O agendamento foi feito por outra pessoa.',
        409,
      );
    }
    throw err;
  }

  // Atualiza status da solicitacao para 'approved' vinculando ao appointment criado.
  // Usa WHERE status = 'pending' como guard contra aprovacao dupla concorrente.
  // Se falhar, tenta cancelar o appointment como rollback compensatorio.
  try {
    const [updated] = await db
      .update(bookingRequests)
      .set({
        status: 'approved',
        appointmentId: appointment.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bookingRequests.id, requestId),
          eq(bookingRequests.clinicId, clinicId),
          eq(bookingRequests.status, 'pending'),
        ),
      )
      .returning();

    if (!updated) {
      // Outro request concorrente ja aprovou/rejeitou — cancelar o appointment recem-criado
      console.warn(`[BookingRequest] Request ${requestId} nao mais pendente — cancelando appointment ${appointment.id}`);
      await db
        .update(appointments)
        .set({ status: 'cancelled', cancelReason: 'Solicitacao aprovada por outro processo', updatedAt: new Date() })
        .where(eq(appointments.id, appointment.id));

      throw new AppError('REQUEST_NOT_PENDING', 'Solicitacao ja foi processada por outro atendente', 409);
    }
  } catch (err) {
    // Se o update falhou por erro de banco (nao por guard), rollback compensatorio
    if (!(err instanceof AppError)) {
      console.error(`[BookingRequest] Erro ao atualizar status — cancelando appointment ${appointment.id}:`, err);
      try {
        await db
          .update(appointments)
          .set({ status: 'cancelled', cancelReason: 'Erro ao vincular solicitacao', updatedAt: new Date() })
          .where(eq(appointments.id, appointment.id));
      } catch (rollbackErr) {
        console.error(`[BookingRequest] CRITICO: falha no rollback do appointment ${appointment.id}:`, rollbackErr);
      }
    }
    throw err;
  }

  return appointment;
}

export async function rejectBookingRequest(
  clinicId: string,
  requestId: string,
  note?: string,
  suggestedStartAt?: string,
) {
  const [updated] = await db
    .update(bookingRequests)
    .set({
      status: 'rejected',
      ownerNote: note,
      suggestedStartAt: suggestedStartAt ? new Date(suggestedStartAt) : undefined,
      updatedAt: new Date(),
    })
    .where(and(
      eq(bookingRequests.id, requestId),
      eq(bookingRequests.clinicId, clinicId),
      eq(bookingRequests.status, 'pending'),
    ))
    .returning();

  if (!updated) throw new AppError('REQUEST_NOT_FOUND', 'Solicitacao nao encontrada ou ja processada', 404);

  // Notificar contato via WhatsApp
  try {
    // Buscar dados do contato e da clinica
    const [contact] = await db
      .select({ name: contacts.name, phone: contacts.phone })
      .from(contacts)
      .where(eq(contacts.id, updated.contactId))
      .limit(1);

    const [clinic] = await db
      .select({ evolutionInstanceName: clinics.evolutionInstanceName })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (contact?.phone && clinic?.evolutionInstanceName) {
      const contactName = contact.name || 'Cliente';
      const reasonText = note ? ` Motivo: ${note}.` : '';
      const text = `Oi ${contactName}! Infelizmente nao conseguimos agendar no horario solicitado.${reasonText} Entre em contato para encontrarmos outra opcao!`;

      const queued = await addToOutgoingQueue('booking-rejected', {
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
    console.error('[BookingRequest] Erro ao enviar notificacao de rejeicao via WhatsApp:', err);
    // Nao falhar a operacao principal por causa de erro na notificacao
  }

  return updated;
}

export async function countPending(clinicId: string): Promise<number> {
  const rows = await db
    .select({ id: bookingRequests.id })
    .from(bookingRequests)
    .where(and(
      eq(bookingRequests.clinicId, clinicId),
      eq(bookingRequests.status, 'pending'),
    ));
  return rows.length;
}

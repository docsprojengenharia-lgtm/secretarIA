import { db } from '@secretaria/db';
import {
  bookingRequests, contacts, services, professionals, appointments,
} from '@secretaria/db';
import { eq, and, desc } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import * as appointmentService from './appointment.js';

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

  return rows;
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

  // Create the appointment
  const appointment = await appointmentService.createAppointment(clinicId, {
    contactId: request.contactId,
    serviceId: request.serviceId,
    professionalId: request.professionalId!,
    startAt: request.requestedStartAt.toISOString(),
    source: 'ai',
  });

  // Update request status
  await db
    .update(bookingRequests)
    .set({
      status: 'approved',
      appointmentId: appointment.id,
      updatedAt: new Date(),
    })
    .where(eq(bookingRequests.id, requestId));

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

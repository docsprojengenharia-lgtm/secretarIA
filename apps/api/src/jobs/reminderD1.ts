import { db } from '@secretaria/db';
import { appointments, contacts, professionals, services, clinics } from '@secretaria/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { addToOutgoingQueue } from '../workers/setup.js';

export async function runReminderD1() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const rows = await db
    .select({
      appointmentId: appointments.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      professionalName: professionals.name,
      serviceName: services.name,
      startAt: appointments.startAt,
      clinicId: appointments.clinicId,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(appointments)
    .innerJoin(contacts, eq(appointments.contactId, contacts.id))
    .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
    .where(and(
      eq(appointments.status, 'confirmed'),
      gte(appointments.startAt, dayStart),
      lte(appointments.startAt, dayEnd),
    ));

  console.log(`[ReminderD1] Found ${rows.length} appointments for tomorrow`);

  for (const row of rows) {
    if (!row.instanceName || !row.contactPhone) continue;

    const time = new Date(row.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const name = row.contactName || 'Cliente';

    const text = `Oi ${name}! Lembrando que amanha voce tem ${row.serviceName} as ${time} com ${row.professionalName}. Te esperamos! Precisa reagendar? E so responder aqui.`;

    await addToOutgoingQueue('reminder-d1', {
      instanceName: row.instanceName,
      phone: row.contactPhone,
      text,
    });
  }
}

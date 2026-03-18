import { db } from '@secretaria/db';
import { appointments, contacts, professionals, services, clinics } from '@secretaria/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { outgoingQueue } from '../workers/setup.js';

export async function runReminderDayOf() {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // Find appointments between 2-3 hours from now (so we send once per hour window)
  const rows = await db
    .select({
      appointmentId: appointments.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      serviceName: services.name,
      startAt: appointments.startAt,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(appointments)
    .innerJoin(contacts, eq(appointments.contactId, contacts.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
    .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(
      eq(appointments.status, 'confirmed'),
      gte(appointments.startAt, twoHoursFromNow),
      lte(appointments.startAt, threeHoursFromNow),
    ));

  console.log(`[ReminderDayOf] Found ${rows.length} appointments in next 2-3 hours`);

  for (const row of rows) {
    if (!row.instanceName || !row.contactPhone) continue;

    const time = new Date(row.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const name = row.contactName || 'Cliente';

    const text = `Oi ${name}! Seu ${row.serviceName} e daqui a 2 horas, as ${time}. Ate logo!`;

    await outgoingQueue.add('reminder-day-of', {
      instanceName: row.instanceName,
      phone: row.contactPhone,
      text,
    });
  }
}

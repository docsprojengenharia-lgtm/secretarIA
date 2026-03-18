import { db } from '@secretaria/db';
import { appointments, contacts, services, clinics } from '@secretaria/db';
import { eq, and, lte, gte, isNull } from 'drizzle-orm';
import { outgoingQueue } from '../workers/setup.js';

/**
 * NPS Sender — runs every hour.
 * Finds appointments completed ~24h ago (23-25h window) that haven't been sent NPS yet.
 * Sends a feedback request message via WhatsApp.
 */
export async function runNpsSender() {
  const now = new Date();
  const from = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  const to = new Date(now.getTime() - 23 * 60 * 60 * 1000);

  const rows = await db
    .select({
      appointmentId: appointments.id,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      serviceName: services.name,
      clinicId: appointments.clinicId,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(appointments)
    .innerJoin(contacts, eq(appointments.contactId, contacts.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(clinics, eq(appointments.clinicId, clinics.id))
    .where(and(
      eq(appointments.status, 'completed'),
      isNull(appointments.npsSentAt),
      gte(appointments.updatedAt, from),
      lte(appointments.updatedAt, to),
    ));

  console.log(`[NPS] Found ${rows.length} appointments for NPS`);

  for (const row of rows) {
    if (!row.instanceName || !row.contactPhone) continue;

    const name = row.contactName || 'Cliente';
    const text = `Oi ${name}! Como foi seu ${row.serviceName}? De 1 a 5, qual sua nota?\n\n1 - Pessimo\n2 - Ruim\n3 - Regular\n4 - Bom\n5 - Excelente\n\nSeu feedback nos ajuda a melhorar!`;

    await outgoingQueue.add('nps', {
      instanceName: row.instanceName,
      phone: row.contactPhone,
      text,
    });

    // Mark as sent
    await db.update(appointments)
      .set({ npsSentAt: new Date() })
      .where(eq(appointments.id, row.appointmentId));

    console.log(`[NPS] Sent NPS to ${row.contactPhone} for appointment ${row.appointmentId}`);
  }
}

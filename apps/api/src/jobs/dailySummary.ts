import { db } from '@secretaria/db';
import {
  clinics, appointments, contacts, professionals,
  services, users, conversations,
} from '@secretaria/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { addToOutgoingQueue } from '../workers/setup.js';

export async function runDailySummary() {
  const activeClinics = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(clinics)
    .where(eq(clinics.isActive, true));

  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  // Stats da noite anterior (18:00 ontem - 07:00 hoje)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 0, 0, 0);
  const nightEnd = new Date(today);
  nightEnd.setHours(7, 0, 0, 0);

  for (const clinic of activeClinics) {
    if (!clinic.instanceName) continue;

    // Buscar agendamentos de HOJE com detalhes
    const todayAppts = await db
      .select({
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        contactName: contacts.name,
        contactPhone: contacts.phone,
        professionalId: appointments.professionalId,
        professionalName: professionals.name,
        serviceName: services.name,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(and(
        eq(appointments.clinicId, clinic.id),
        eq(appointments.status, 'confirmed'),
        gte(appointments.startAt, dayStart),
        lte(appointments.startAt, dayEnd),
      ))
      .orderBy(appointments.startAt);

    // Stats da noite
    const [nightAppts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(and(
        eq(appointments.clinicId, clinic.id),
        gte(appointments.createdAt, yesterday),
        lte(appointments.createdAt, nightEnd),
      ));

    const [nightConvs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(
        eq(conversations.clinicId, clinic.id),
        gte(conversations.createdAt, yesterday),
        lte(conversations.createdAt, nightEnd),
      ));

    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(
        eq(conversations.clinicId, clinic.id),
        eq(conversations.status, 'pending_human'),
      ));

    // =============================
    // MENSAGEM PRO OWNER (agenda completa)
    // =============================
    const [owner] = await db
      .select({ phone: users.phone, name: users.name })
      .from(users)
      .where(and(eq(users.clinicId, clinic.id), eq(users.role, 'owner')))
      .limit(1);

    if (owner?.phone) {
      let ownerText = `Bom dia! Resumo da ${clinic.name}:\n\n`;

      // Stats da noite
      if (nightConvs.count > 0 || nightAppts.count > 0) {
        ownerText += `*Noite anterior:*\n`;
        ownerText += `- ${nightConvs.count} contato(s) recebido(s)\n`;
        ownerText += `- ${nightAppts.count} agendamento(s) pela IA\n`;
        if (pendingCount.count > 0) {
          ownerText += `- ${pendingCount.count} conversa(s) pendente(s)\n`;
        }
        ownerText += `\n`;
      }

      // Agenda do dia
      ownerText += `*Agenda de hoje (${todayAppts.length} agendamento${todayAppts.length !== 1 ? 's' : ''}):*\n`;

      if (todayAppts.length === 0) {
        ownerText += `Nenhum agendamento confirmado para hoje.\n`;
      } else {
        // Agrupar por profissional
        const byProf = new Map<string, typeof todayAppts>();
        for (const appt of todayAppts) {
          const key = appt.professionalName;
          if (!byProf.has(key)) byProf.set(key, []);
          byProf.get(key)!.push(appt);
        }

        for (const [profName, appts] of byProf) {
          ownerText += `\n_${profName}:_\n`;
          for (const a of appts) {
            const time = new Date(a.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(a.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            ownerText += `  ${time}-${endTime} ${a.contactName || 'Cliente'} (${a.serviceName})\n`;
          }
        }
      }

      await addToOutgoingQueue('daily-summary-owner', {
        instanceName: clinic.instanceName,
        phone: owner.phone,
        text: ownerText.trim(),
      });
    }

    // =============================
    // MENSAGEM PRA CADA PROFISSIONAL (so a agenda dele)
    // =============================
    const allProfs = await db
      .select({ id: professionals.id, name: professionals.name, phone: professionals.phone })
      .from(professionals)
      .where(and(
        eq(professionals.clinicId, clinic.id),
        eq(professionals.isActive, true),
      ));

    for (const prof of allProfs) {
      if (!prof.phone) continue;

      const profAppts = todayAppts.filter(a => a.professionalId === prof.id);

      let profText = `Bom dia, ${prof.name}! Sua agenda de hoje na ${clinic.name}:\n\n`;

      if (profAppts.length === 0) {
        profText += `Nenhum agendamento confirmado para hoje.`;
      } else {
        profText += `*${profAppts.length} agendamento${profAppts.length !== 1 ? 's' : ''}:*\n`;
        for (const a of profAppts) {
          const time = new Date(a.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(a.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const phone = a.contactPhone ? ` - ${a.contactPhone}` : '';
          profText += `\n${time}-${endTime}\n${a.contactName || 'Cliente'} - ${a.serviceName}${phone}\n`;
        }
      }

      profText += `\nBom trabalho!`;

      await addToOutgoingQueue('daily-summary-prof', {
        instanceName: clinic.instanceName,
        phone: prof.phone,
        text: profText.trim(),
      });
    }
  }

  console.log(`[DailySummary] Sent daily agendas for ${activeClinics.length} clinics`);
}

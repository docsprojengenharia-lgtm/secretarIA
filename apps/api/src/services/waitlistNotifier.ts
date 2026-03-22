import { db } from '@secretaria/db';
import { waitlist, contacts, services, professionals, clinics } from '@secretaria/db';
import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { addToOutgoingQueue } from '../workers/setup.js';
import * as whatsappService from './whatsapp.js';
import { logger } from '../lib/logger.js';
import { maskPhone } from '../lib/mask.js';

/**
 * Verifica a waitlist apos um cancelamento e notifica o primeiro contato elegivel.
 *
 * @param clinicId - ID da clinica
 * @param professionalId - ID do profissional cujo horario abriu
 * @param serviceId - ID do servico cancelado
 * @param startAt - Horario que ficou disponivel
 * @param endAt - Fim do horario disponivel
 */
export async function checkAndNotifyWaitlist(
  clinicId: string,
  professionalId: string,
  serviceId: string,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  try {
    // Buscar a entrada mais antiga da waitlist para o mesmo servico e profissional (ou sem profissional especifico)
    const [entry] = await db
      .select({
        waitlistId: waitlist.id,
        contactId: waitlist.contactId,
        contactName: contacts.name,
        contactPhone: contacts.phone,
        serviceName: services.name,
        professionalName: professionals.name,
      })
      .from(waitlist)
      .innerJoin(contacts, eq(waitlist.contactId, contacts.id))
      .innerJoin(services, eq(waitlist.serviceId, services.id))
      .leftJoin(professionals, eq(waitlist.professionalId, professionals.id))
      .where(and(
        eq(waitlist.clinicId, clinicId),
        eq(waitlist.serviceId, serviceId),
        eq(waitlist.status, 'waiting'),
        isNull(waitlist.deletedAt),
        // Profissional especifico OU qualquer profissional (professionalId null)
        or(
          eq(waitlist.professionalId, professionalId),
          isNull(waitlist.professionalId),
        ),
      ))
      .orderBy(asc(waitlist.createdAt))
      .limit(1);

    if (!entry) {
      logger.info({ clinicId, serviceId, professionalId }, 'Waitlist: nenhuma entrada encontrada');
      return false;
    }

    if (!entry.contactPhone) {
      logger.warn({ waitlistId: entry.waitlistId }, 'Waitlist: contato sem telefone');
      return false;
    }

    // Buscar instance da clinica
    const [clinic] = await db
      .select({ instanceName: clinics.evolutionInstanceName })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    if (!clinic?.instanceName) {
      logger.warn({ clinicId }, 'Waitlist: clinica sem instance WhatsApp');
      return false;
    }

    const contactName = entry.contactName || 'Cliente';
    const serviceName = entry.serviceName || 'seu servico';
    const profName = entry.professionalName || 'o profissional';
    const date = startAt.toLocaleDateString('pt-BR');
    const time = startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const text = `Oi ${contactName}! Abriu uma vaga para ${serviceName} em ${date} as ${time} com ${profName}. Deseja agendar? Responda 'sim' para confirmar!`;

    const queued = await addToOutgoingQueue('waitlist-notify', {
      instanceName: clinic.instanceName,
      phone: entry.contactPhone,
      text,
    });

    // Fallback: enviar diretamente se a fila nao estiver disponivel
    if (!queued) {
      await whatsappService.sendTextMessage(clinic.instanceName, entry.contactPhone, text);
    }

    // Atualizar status da entrada na waitlist
    await db.update(waitlist)
      .set({
        status: 'notified',
        notifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(waitlist.id, entry.waitlistId));

    logger.info(
      { waitlistId: entry.waitlistId, phone: maskPhone(entry.contactPhone), clinicId },
      'Waitlist: contato notificado sobre vaga disponivel',
    );

    return true;
  } catch (err) {
    logger.error({ clinicId, serviceId, professionalId, err }, 'Waitlist: erro ao verificar/notificar');
    return false;
  }
}

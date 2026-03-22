import { db } from '@secretaria/db';
import { contacts, appointments, clinics, clinicSettings } from '@secretaria/db';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { addToOutgoingQueue } from '../workers/setup.js';
import { logger } from '../lib/logger.js';
import { maskPhone } from '../lib/mask.js';

/**
 * Reactivation Sender — roda diariamente as 10:00.
 * Para cada clinica com reativacao habilitada, encontra contatos cujo ultimo
 * agendamento completado foi ha mais de X dias (configuravel, padrao 30).
 * Envia mensagem de reativacao via WhatsApp e marca o contato.
 * Limite: max 20 mensagens por clinica por dia.
 */
export async function runReactivation() {
  // Buscar clinicas com reativacao habilitada
  const enabledClinics = await db
    .select({
      clinicId: clinicSettings.clinicId,
      reactivationDays: clinicSettings.reactivationDays,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(clinicSettings)
    .innerJoin(clinics, eq(clinicSettings.clinicId, clinics.id))
    .where(and(
      eq(clinicSettings.reactivationEnabled, true),
      eq(clinics.isActive, true),
    ));

  logger.info({ count: enabledClinics.length }, 'Reactivation: clinicas com reativacao habilitada');

  for (const clinic of enabledClinics) {
    if (!clinic.instanceName) continue;

    const days = clinic.reactivationDays || 30;

    try {
      // Buscar contatos ativos cujo ultimo agendamento completado foi ha mais de X dias
      // OU que nunca tiveram agendamento completado.
      // Excluir contatos ja reativados nos ultimos 30 dias.
      const eligibleContacts = await db.execute(sql`
        SELECT c.id, c.name, c.phone
        FROM contacts c
        LEFT JOIN appointments a
          ON a.contact_id = c.id
          AND a.clinic_id = c.clinic_id
          AND a.status = 'completed'
          AND a.deleted_at IS NULL
        WHERE c.clinic_id = ${clinic.clinicId}
          AND c.status = 'active'
          AND c.deleted_at IS NULL
          AND c.phone IS NOT NULL
          AND (c.last_reactivated_at IS NULL OR c.last_reactivated_at < NOW() - INTERVAL '30 days')
        GROUP BY c.id, c.name, c.phone
        HAVING MAX(a.end_at) < NOW() - INTERVAL '1 day' * ${days}
           OR (MAX(a.end_at) IS NULL AND c.created_at < NOW() - INTERVAL '1 day' * ${days})
        LIMIT 20
      `);

      logger.info(
        { clinicId: clinic.clinicId, count: eligibleContacts.length },
        'Reactivation: contatos elegiveis encontrados',
      );

      for (const row of eligibleContacts) {
        const contact = row as { id: string; name: string | null; phone: string };
        const name = contact.name || 'Cliente';

        const text = `Oi ${name}! Faz tempo que nao te vemos por aqui. Que tal agendar? Temos horarios disponiveis!`;

        await addToOutgoingQueue('reactivation', {
          instanceName: clinic.instanceName,
          phone: contact.phone,
          text,
        });

        // Marcar contato como reativado
        await db.update(contacts)
          .set({ lastReactivatedAt: new Date(), updatedAt: new Date() })
          .where(eq(contacts.id, contact.id));

        logger.info(
          { phone: maskPhone(contact.phone), clinicId: clinic.clinicId },
          'Reactivation: mensagem enviada',
        );
      }
    } catch (err) {
      logger.error({ clinicId: clinic.clinicId, err }, 'Reactivation: erro ao processar clinica');
    }
  }
}

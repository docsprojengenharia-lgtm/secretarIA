import { db } from '@secretaria/db';
import { contacts, clinics, clinicSettings } from '@secretaria/db';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { addToOutgoingQueue } from '../workers/setup.js';
import { logger } from '../lib/logger.js';
import { maskPhone } from '../lib/mask.js';

/**
 * Birthday Sender — roda diariamente as 08:00.
 * Encontra contatos cujo aniversario (mes/dia) e hoje.
 * Envia mensagem de parabens via WhatsApp.
 * So envia uma vez por ano por contato.
 */
export async function runBirthdaySender() {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  // Buscar clinicas com aniversario habilitado
  const enabledClinics = await db
    .select({
      clinicId: clinicSettings.clinicId,
      instanceName: clinics.evolutionInstanceName,
    })
    .from(clinicSettings)
    .innerJoin(clinics, eq(clinicSettings.clinicId, clinics.id))
    .where(and(
      eq(clinicSettings.birthdayEnabled, true),
      eq(clinics.isActive, true),
    ));

  logger.info({ count: enabledClinics.length, date: `${month}-${day}` }, 'Birthday: clinicas com aniversario habilitado');

  for (const clinic of enabledClinics) {
    if (!clinic.instanceName) continue;

    try {
      // Buscar contatos cujo birth_date (MM-DD) bate com hoje
      // E que ainda nao receberam mensagem de aniversario neste ano
      const birthdayContacts = await db.execute(sql`
        SELECT c.id, c.name, c.phone
        FROM contacts c
        WHERE c.clinic_id = ${clinic.clinicId}
          AND c.status = 'active'
          AND c.deleted_at IS NULL
          AND c.phone IS NOT NULL
          AND c.birth_date IS NOT NULL
          AND EXTRACT(MONTH FROM c.birth_date) = ${parseInt(month)}
          AND EXTRACT(DAY FROM c.birth_date) = ${parseInt(day)}
          AND (c.last_birthday_message_year IS NULL OR c.last_birthday_message_year != ${currentYear})
      `);

      logger.info(
        { clinicId: clinic.clinicId, count: birthdayContacts.length },
        'Birthday: aniversariantes encontrados',
      );

      for (const row of birthdayContacts) {
        const contact = row as { id: string; name: string | null; phone: string };
        const name = contact.name || 'Cliente';

        const text = `Feliz aniversario, ${name}! 🎂 Pra comemorar, temos um presente especial pra voce. Entre em contato para saber mais!`;

        await addToOutgoingQueue('birthday', {
          instanceName: clinic.instanceName,
          phone: contact.phone,
          text,
        });

        // Marcar que ja enviou mensagem de aniversario neste ano
        await db.update(contacts)
          .set({ lastBirthdayMessageYear: currentYear, updatedAt: new Date() })
          .where(eq(contacts.id, contact.id));

        logger.info(
          { phone: maskPhone(contact.phone), clinicId: clinic.clinicId },
          'Birthday: mensagem enviada',
        );
      }
    } catch (err) {
      logger.error({ clinicId: clinic.clinicId, err }, 'Birthday: erro ao processar clinica');
    }
  }
}

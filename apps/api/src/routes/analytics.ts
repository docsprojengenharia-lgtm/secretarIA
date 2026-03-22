import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@secretaria/db';
import { success, error } from '../lib/response.js';

const router = new Hono();

function getPeriodInterval(period: string): string {
  switch (period) {
    case '7d': return '7 days';
    case '30d': return '30 days';
    case '90d': return '90 days';
    default: return '30 days';
  }
}

// GET /analytics/summary
router.get('/summary', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const period = c.req.query('period') || '30d';

  if (!['7d', '30d', '90d'].includes(period)) {
    return error(c, 'VALIDATION_ERROR', 'Periodo invalido. Use: 7d, 30d ou 90d', 400);
  }

  const interval = getPeriodInterval(period);

  try {
    // 1. Appointments stats (total, completed, cancelled, no_show)
    const appointmentStats = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show')::int AS no_show,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed
      FROM appointments
      WHERE clinic_id = ${clinicId}
        AND deleted_at IS NULL
        AND created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const apptRow = appointmentStats[0] as Record<string, number>;
    const totalAppointments = apptRow.total || 0;
    const completedCount = apptRow.completed || 0;
    const cancelledCount = apptRow.cancelled || 0;
    const noShowCount = apptRow.no_show || 0;

    // 2. Contacts created in period
    const contactStats = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM contacts
      WHERE clinic_id = ${clinicId}
        AND deleted_at IS NULL
        AND created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const totalContacts = (contactStats[0] as Record<string, number>).total || 0;

    // 3. AI conversations count + messages count
    const conversationStats = await db.execute(sql`
      SELECT
        COUNT(DISTINCT conv.id)::int AS total_conversations,
        COALESCE(SUM(msg_counts.ai_messages), 0)::int AS ai_messages_count
      FROM conversations conv
      LEFT JOIN (
        SELECT conversation_id, COUNT(*)::int AS ai_messages
        FROM messages
        WHERE role = 'assistant'
          AND clinic_id = ${clinicId}
          AND created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
        GROUP BY conversation_id
      ) msg_counts ON msg_counts.conversation_id = conv.id
      WHERE conv.clinic_id = ${clinicId}
        AND conv.created_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const convRow = conversationStats[0] as Record<string, number>;
    const totalConversations = convRow.total_conversations || 0;
    const aiMessagesCount = convRow.ai_messages_count || 0;

    // 4. Average NPS score
    const npsStats = await db.execute(sql`
      SELECT
        AVG(nps_score)::numeric(3,1) AS avg_nps,
        COUNT(nps_score)::int AS nps_responses
      FROM appointments
      WHERE clinic_id = ${clinicId}
        AND deleted_at IS NULL
        AND nps_score IS NOT NULL
        AND nps_responded_at >= NOW() - ${sql.raw(`INTERVAL '${interval}'`)}
    `);

    const npsRow = npsStats[0] as Record<string, number | null>;
    const avgNps = npsRow.avg_nps ? Number(npsRow.avg_nps) : null;
    const npsResponses = npsRow.nps_responses || 0;

    // 5. Average service price (for revenue recovered calc)
    const avgPriceResult = await db.execute(sql`
      SELECT AVG(s.price_in_cents)::int AS avg_price
      FROM services s
      WHERE s.clinic_id = ${clinicId}
        AND s.is_active = true
        AND s.deleted_at IS NULL
    `);

    const avgServicePriceCents = (avgPriceResult[0] as Record<string, number | null>).avg_price || 0;

    // Calculated metrics
    const noShowRate = totalAppointments > 0
      ? Math.round((noShowCount / totalAppointments) * 100)
      : 0;

    const conversionRate = totalContacts > 0
      ? Math.round((totalAppointments / totalContacts) * 100)
      : 0;

    // Hours saved: each AI message saves ~0.08 min (avg time a human would take)
    const hoursSaved = Math.round((aiMessagesCount * 0.08) / 60 * 10) / 10;

    // Revenue recovered: estimated no-shows prevented by reminders
    // Assumption: 30% of appointments would be no-shows without the system
    const estimatedPreventedNoShows = Math.max(0,
      Math.round(totalAppointments * 0.3) - noShowCount
    );
    const revenueRecoveredCents = estimatedPreventedNoShows * avgServicePriceCents;

    return success(c, {
      period,
      appointments: {
        total: totalAppointments,
        completed: completedCount,
        cancelled: cancelledCount,
        noShow: noShowCount,
        confirmed: apptRow.confirmed || 0,
      },
      contacts: {
        total: totalContacts,
      },
      conversations: {
        total: totalConversations,
        aiMessages: aiMessagesCount,
      },
      nps: {
        average: avgNps,
        responses: npsResponses,
      },
      rates: {
        noShow: noShowRate,
        conversion: conversionRate,
        completion: totalAppointments > 0
          ? Math.round((completedCount / totalAppointments) * 100)
          : 0,
      },
      value: {
        hoursSaved,
        revenueRecoveredCents,
        preventedNoShows: estimatedPreventedNoShows,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(c, 'ANALYTICS_ERROR', `Erro ao calcular metricas: ${message}`, 500);
  }
});

export default router;

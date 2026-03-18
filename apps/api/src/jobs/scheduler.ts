import cron from 'node-cron';
import { runReminderD1 } from './reminderD1.js';
import { runReminderDayOf } from './reminderDayOf.js';
import { runDailySummary } from './dailySummary.js';
import { runNpsSender } from './nps.js';

export function startScheduler() {
  // Lembrete D-1: todo dia as 18:00
  cron.schedule('0 18 * * *', () => {
    console.log('[Cron] Running reminderD1...');
    runReminderD1().catch(err => console.error('[Cron] reminderD1 error:', err));
  });

  // Lembrete no dia: a cada hora entre 6h-20h
  cron.schedule('0 6-20 * * *', () => {
    console.log('[Cron] Running reminderDayOf...');
    runReminderDayOf().catch(err => console.error('[Cron] reminderDayOf error:', err));
  });

  // Resumo diario: todo dia as 07:30
  cron.schedule('30 7 * * *', () => {
    console.log('[Cron] Running dailySummary...');
    runDailySummary().catch(err => console.error('[Cron] dailySummary error:', err));
  });

  // NPS pos-atendimento: a cada hora
  cron.schedule('0 * * * *', () => {
    console.log('[Cron] Running NPS sender...');
    runNpsSender().catch(err => console.error('[Cron] NPS error:', err));
  });

  console.log('[Scheduler] Cron jobs registered');
}

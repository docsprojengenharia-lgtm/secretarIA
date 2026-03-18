import { db } from '@secretaria/db';
import {
  services, professionals, professionalServices, workingHours,
  blockedTimes, appointments, clinicSettings,
} from '@secretaria/db';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';

export interface Slot {
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  startAt: string; // ISO8601
  endAt: string; // ISO8601
}

export async function getAvailableSlots(
  clinicId: string,
  serviceId: string,
  professionalId: string | undefined,
  dateFrom: string,
  dateTo: string,
): Promise<Slot[]> {
  // 1. Get service duration
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.clinicId, clinicId), isNull(services.deletedAt)))
    .limit(1);

  if (!service) throw new AppError('SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);

  // 2. Get clinic settings
  const [settings] = await db
    .select()
    .from(clinicSettings)
    .where(eq(clinicSettings.clinicId, clinicId))
    .limit(1);

  const minAdvanceHours = settings?.minAdvanceHours ?? 2;
  const maxAdvanceDays = settings?.maxAdvanceDays ?? 30;
  const slotInterval = settings?.slotIntervalMinutes ?? 0;

  // 3. Get professionals who do this service
  let profsQuery = db
    .select({
      id: professionals.id,
      name: professionals.name,
    })
    .from(professionals)
    .innerJoin(professionalServices, and(
      eq(professionalServices.professionalId, professionals.id),
      eq(professionalServices.serviceId, serviceId),
    ))
    .where(and(
      eq(professionals.clinicId, clinicId),
      isNull(professionals.deletedAt),
      ...(professionalId ? [eq(professionals.id, professionalId)] : []),
    ));

  const profs = await profsQuery;
  if (profs.length === 0) return [];

  const profIds = profs.map(p => p.id);
  const profMap = new Map(profs.map(p => [p.id, p.name]));

  // 4. Get all working hours for these professionals
  const allHours = await db
    .select()
    .from(workingHours)
    .where(and(
      eq(workingHours.clinicId, clinicId),
      sql`${workingHours.professionalId} = ANY(${sql.raw(`ARRAY[${profIds.map(id => `'${id}'::uuid`).join(',')}]`)})`,
    ));

  // 5. Get blocked times in range
  const fromDate = new Date(dateFrom + 'T00:00:00');
  const toDate = new Date(dateTo + 'T23:59:59');
  const allBlocked = await db
    .select()
    .from(blockedTimes)
    .where(and(
      eq(blockedTimes.clinicId, clinicId),
      lte(blockedTimes.startAt, toDate),
      gte(blockedTimes.endAt, fromDate),
    ));

  // 6. Get existing appointments in range
  const existingAppts = await db
    .select({
      professionalId: appointments.professionalId,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
    })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinicId),
      eq(appointments.status, 'confirmed'),
      gte(appointments.startAt, fromDate),
      lte(appointments.startAt, toDate),
    ));

  // 7. Generate slots
  const slots: Slot[] = [];
  const now = new Date();
  const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
  const maxDate = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
  const duration = service.durationMinutes;

  const startDate = new Date(dateFrom + 'T00:00:00');
  const endDate = new Date(dateTo + 'T23:59:59');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];

    for (const profId of profIds) {
      // Working hours for this professional on this day
      const hours = allHours.filter(h => h.professionalId === profId && h.dayOfWeek === dayOfWeek);
      if (hours.length === 0) continue;

      for (const wh of hours) {
        const [startH, startM] = wh.startTime.split(':').map(Number);
        const [endH, endM] = wh.endTime.split(':').map(Number);

        // Generate slots every (duration + interval) minutes
        let slotStart = new Date(d);
        slotStart.setHours(startH, startM, 0, 0);

        const workEnd = new Date(d);
        workEnd.setHours(endH, endM, 0, 0);

        while (true) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
          if (slotEnd > workEnd) break;

          // Check min advance
          if (slotStart.getTime() - now.getTime() < minAdvanceMs) {
            slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
            continue;
          }

          // Check max advance
          if (slotStart > maxDate) {
            slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
            continue;
          }

          // Check blocked times (professional-specific OR clinic-wide when professionalId is null)
          const isBlocked = allBlocked.some(b =>
            (b.professionalId === profId || b.professionalId === null) &&
            slotStart < b.endAt && slotEnd > b.startAt
          );
          if (isBlocked) {
            slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
            continue;
          }

          // Check existing appointments
          const hasConflict = existingAppts.some(a =>
            a.professionalId === profId &&
            slotStart < a.endAt && slotEnd > a.startAt
          );
          if (hasConflict) {
            slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
            continue;
          }

          // Slot is available
          slots.push({
            professionalId: profId,
            professionalName: profMap.get(profId) || '',
            date: dateStr,
            startTime: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`,
            endTime: `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`,
            startAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
          });

          slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
        }
      }
    }
  }

  // Sort by date, then time
  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return slots;
}

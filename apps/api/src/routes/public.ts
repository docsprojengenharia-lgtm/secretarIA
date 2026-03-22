import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@secretaria/db';
import {
  clinics, services, professionals, professionalServices,
  contacts, appointments, workingHours, blockedTimes, clinicSettings,
} from '@secretaria/db';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import { success, error } from '../lib/response.js';
import { AppError } from '../lib/errors.js';

const router = new Hono();

// ============================================================================
// Helpers
// ============================================================================

async function getClinicBySlug(slug: string) {
  const [clinic] = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      segment: clinics.segment,
      phone: clinics.phone,
      email: clinics.email,
      address: clinics.address,
      city: clinics.city,
      state: clinics.state,
    })
    .from(clinics)
    .where(and(eq(clinics.slug, slug), eq(clinics.isActive, true)))
    .limit(1);

  if (!clinic) throw new AppError('CLINIC_NOT_FOUND', 'Estabelecimento nao encontrado', 404);
  return clinic;
}

// ============================================================================
// GET /public/clinics/:slug — clinic info
// ============================================================================

router.get('/clinics/:slug', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await getClinicBySlug(slug);
  return success(c, clinic);
});

// ============================================================================
// GET /public/clinics/:slug/services — list active services with prices
// ============================================================================

router.get('/clinics/:slug/services', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await getClinicBySlug(slug);

  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      category: services.category,
      durationMinutes: services.durationMinutes,
      priceInCents: services.priceInCents,
    })
    .from(services)
    .where(and(
      eq(services.clinicId, clinic.id),
      eq(services.isActive, true),
      isNull(services.deletedAt),
    ));

  return success(c, rows);
});

// ============================================================================
// GET /public/clinics/:slug/professionals — list active professionals (with their services)
// ============================================================================

router.get('/clinics/:slug/professionals', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await getClinicBySlug(slug);

  const serviceIdFilter = c.req.query('serviceId');

  let query = db
    .select({
      id: professionals.id,
      name: professionals.name,
    })
    .from(professionals)
    .where(and(
      eq(professionals.clinicId, clinic.id),
      eq(professionals.isActive, true),
      isNull(professionals.deletedAt),
    ));

  let profs = await query;

  // Filter by serviceId if provided
  if (serviceIdFilter) {
    const links = await db
      .select({ professionalId: professionalServices.professionalId })
      .from(professionalServices)
      .where(eq(professionalServices.serviceId, serviceIdFilter));

    const profIdsWithService = new Set(links.map(l => l.professionalId));
    profs = profs.filter(p => profIdsWithService.has(p.id));
  }

  return success(c, profs);
});

// ============================================================================
// GET /public/clinics/:slug/availability — available slots
// ============================================================================

const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get('/clinics/:slug/availability', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await getClinicBySlug(slug);

  const query = {
    serviceId: c.req.query('serviceId'),
    professionalId: c.req.query('professionalId') || undefined,
    date: c.req.query('date'),
  };

  const parsed = availabilityQuerySchema.safeParse(query);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const { serviceId, professionalId, date } = parsed.data;

  // Reuse the same availability logic from the availability service
  // Inline here because the existing service requires clinicId from auth context
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.clinicId, clinic.id), isNull(services.deletedAt)))
    .limit(1);

  if (!service) return error(c, 'SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);

  // Get clinic settings
  const [settings] = await db
    .select()
    .from(clinicSettings)
    .where(eq(clinicSettings.clinicId, clinic.id))
    .limit(1);

  const minAdvanceHours = settings?.minAdvanceHours ?? 2;
  const maxAdvanceDays = settings?.maxAdvanceDays ?? 30;
  const slotInterval = settings?.slotIntervalMinutes ?? 0;

  // Get professionals who do this service
  const profConditions = [
    eq(professionals.clinicId, clinic.id),
    isNull(professionals.deletedAt),
  ];
  if (professionalId) {
    profConditions.push(eq(professionals.id, professionalId));
  }

  const profs = await db
    .select({ id: professionals.id, name: professionals.name })
    .from(professionals)
    .innerJoin(professionalServices, and(
      eq(professionalServices.professionalId, professionals.id),
      eq(professionalServices.serviceId, serviceId),
    ))
    .where(and(...profConditions));

  if (profs.length === 0) return success(c, { slots: [] });

  const profIds = profs.map(p => p.id);
  const profMap = new Map(profs.map(p => [p.id, p.name]));

  // Working hours
  const d = new Date(date + 'T00:00:00');
  const dayOfWeek = d.getDay();

  const allHours = await db
    .select()
    .from(workingHours)
    .where(and(
      eq(workingHours.clinicId, clinic.id),
      eq(workingHours.dayOfWeek, dayOfWeek),
      sql`${workingHours.professionalId} = ANY(${sql.raw(`ARRAY[${profIds.map(id => `'${id}'::uuid`).join(',')}]`)})`,
    ));

  // Blocked times
  const fromDate = new Date(date + 'T00:00:00');
  const toDate = new Date(date + 'T23:59:59');
  const allBlocked = await db
    .select()
    .from(blockedTimes)
    .where(and(
      eq(blockedTimes.clinicId, clinic.id),
      lte(blockedTimes.startAt, toDate),
      gte(blockedTimes.endAt, fromDate),
    ));

  // Existing appointments
  const existingAppts = await db
    .select({
      professionalId: appointments.professionalId,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
    })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinic.id),
      eq(appointments.status, 'confirmed'),
      gte(appointments.startAt, fromDate),
      lte(appointments.startAt, toDate),
    ));

  // Index data
  const blockedByProf = new Map<string, typeof allBlocked>();
  const blockedClinicWide: typeof allBlocked = [];
  for (const b of allBlocked) {
    if (b.professionalId === null) {
      blockedClinicWide.push(b);
    } else {
      const key = b.professionalId;
      if (!blockedByProf.has(key)) blockedByProf.set(key, []);
      blockedByProf.get(key)!.push(b);
    }
  }

  const apptsByProf = new Map<string, typeof existingAppts>();
  for (const a of existingAppts) {
    const key = a.professionalId;
    if (!apptsByProf.has(key)) apptsByProf.set(key, []);
    apptsByProf.get(key)!.push(a);
  }

  const hoursByProf = new Map<string, typeof allHours>();
  for (const h of allHours) {
    const key = h.professionalId;
    if (!hoursByProf.has(key)) hoursByProf.set(key, []);
    hoursByProf.get(key)!.push(h);
  }

  // Generate slots
  interface Slot {
    professionalId: string;
    professionalName: string;
    date: string;
    startTime: string;
    endTime: string;
    startAt: string;
    endAt: string;
  }

  const slots: Slot[] = [];
  const now = new Date();
  const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
  const maxDate = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);
  const duration = service.durationMinutes;
  const dateStr = date;

  for (const profId of profIds) {
    const hours = hoursByProf.get(profId);
    if (!hours || hours.length === 0) continue;

    const profBlocked = blockedByProf.get(profId) || [];
    const profAppts = apptsByProf.get(profId) || [];

    for (const wh of hours) {
      const [startH, startM] = wh.startTime.split(':').map(Number);
      const [endH, endM] = wh.endTime.split(':').map(Number);

      let slotStart = new Date(d);
      slotStart.setHours(startH, startM, 0, 0);

      const workEnd = new Date(d);
      workEnd.setHours(endH, endM, 0, 0);

      while (true) {
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
        if (slotEnd > workEnd) break;

        if (slotStart.getTime() - now.getTime() < minAdvanceMs) {
          slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
          continue;
        }

        if (slotStart > maxDate) {
          slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
          continue;
        }

        const isBlocked = profBlocked.some(b =>
          slotStart < b.endAt && slotEnd > b.startAt
        ) || blockedClinicWide.some(b =>
          slotStart < b.endAt && slotEnd > b.startAt
        );
        if (isBlocked) {
          slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
          continue;
        }

        const hasConflict = profAppts.some(a =>
          slotStart < a.endAt && slotEnd > a.startAt
        );
        if (hasConflict) {
          slotStart = new Date(slotStart.getTime() + (duration + slotInterval) * 60 * 1000);
          continue;
        }

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

  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return success(c, { slots });
});

// ============================================================================
// POST /public/clinics/:slug/book — create appointment (public)
// ============================================================================

const bookSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(255),
  phone: z.string().min(10, 'Telefone invalido').max(20),
  serviceId: z.string().uuid('serviceId invalido'),
  professionalId: z.string().uuid('professionalId invalido'),
  startAt: z.string().datetime('startAt invalido'),
});

router.post('/clinics/:slug/book', async (c) => {
  const slug = c.req.param('slug');
  const clinic = await getClinicBySlug(slug);

  const body = await c.req.json();
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const { name, phone, serviceId, professionalId, startAt: startAtStr } = parsed.data;

  // Get or create contact
  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(
      eq(contacts.clinicId, clinic.id),
      eq(contacts.phone, phone),
      isNull(contacts.deletedAt),
    ))
    .limit(1);

  let contactId: string;
  if (existing) {
    contactId = existing.id;
    // Update name if null
    await db
      .update(contacts)
      .set({ name, updatedAt: new Date(), lastContactAt: new Date() })
      .where(and(eq(contacts.id, existing.id), isNull(contacts.name)));
  } else {
    const [newContact] = await db
      .insert(contacts)
      .values({
        clinicId: clinic.id,
        name,
        phone,
        status: 'active',
        lastContactAt: new Date(),
      })
      .returning();
    contactId = newContact.id;
  }

  // Get service duration
  const [service] = await db
    .select({ durationMinutes: services.durationMinutes, name: services.name })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.clinicId, clinic.id)))
    .limit(1);

  if (!service) return error(c, 'SERVICE_NOT_FOUND', 'Servico nao encontrado', 404);

  // Validate professional offers this service
  const [profServiceLink] = await db
    .select({ id: professionalServices.professionalId })
    .from(professionalServices)
    .where(and(
      eq(professionalServices.professionalId, professionalId),
      eq(professionalServices.serviceId, serviceId),
    ))
    .limit(1);

  if (!profServiceLink) {
    return error(c, 'SERVICE_NOT_OFFERED', 'Este profissional nao oferece o servico selecionado', 400);
  }

  const startAt = new Date(startAtStr);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);
  const startAtISO = startAt.toISOString();
  const endAtISO = endAt.toISOString();

  // Transaction with lock
  const appointment = await db.transaction(async (tx) => {
    const conflicts = await tx.execute(sql`
      SELECT id FROM appointments
      WHERE clinic_id = ${clinic.id}
        AND professional_id = ${professionalId}
        AND status NOT IN ('cancelled', 'no_show')
        AND deleted_at IS NULL
        AND start_at < ${endAtISO}::timestamp
        AND end_at > ${startAtISO}::timestamp
      FOR UPDATE SKIP LOCKED
    `);

    if (conflicts.length > 0) {
      throw new AppError('APPOINTMENT_CONFLICT', 'Horario ja ocupado. Escolha outro horario.', 409);
    }

    const [appt] = await tx
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        contactId,
        professionalId,
        serviceId,
        startAt,
        endAt,
        source: 'booking_page',
      })
      .returning();

    return appt;
  });

  // Get professional name for confirmation
  const [prof] = await db
    .select({ name: professionals.name })
    .from(professionals)
    .where(eq(professionals.id, professionalId))
    .limit(1);

  return success(c, {
    id: appointment.id,
    clinicName: clinic.name,
    serviceName: service.name,
    professionalName: prof?.name || '',
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: appointment.status,
  }, 201);
});

export default router;

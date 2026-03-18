import { z } from 'zod';

export const createAppointmentSchema = z.object({
  contactId: z.string().uuid(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  source: z.enum(['ai', 'dashboard', 'manual']).default('dashboard'),
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no_show']).optional(),
  professionalId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(20),
});

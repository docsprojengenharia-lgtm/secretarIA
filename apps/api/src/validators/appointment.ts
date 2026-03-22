import { z } from 'zod';

export const createAppointmentSchema = z.object({
  contactId: z.string().uuid().optional(),
  contactName: z.string().min(1).max(255).optional(),
  contactPhone: z.string().min(10).max(20).optional(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  source: z.enum(['ai', 'dashboard', 'manual', 'ligacao', 'instagram', 'presencial', 'outro', 'booking_page']).default('dashboard'),
}).refine(
  (data) => data.contactId || (data.contactName && data.contactPhone),
  { message: 'Informe o contato existente (contactId) ou nome + telefone para criar novo', path: ['contactId'] },
);

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

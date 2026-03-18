import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

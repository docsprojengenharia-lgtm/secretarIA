import { z } from 'zod';

export const createProfessionalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateProfessionalSchema = createProfessionalSchema.partial();

export const workingHoursSchema = z.array(z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}));

export const linkServiceSchema = z.object({
  serviceId: z.string().uuid(),
});

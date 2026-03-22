import { z } from 'zod';

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['new', 'active', 'inactive']).optional(),
  birthDate: z.string().optional().nullable(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

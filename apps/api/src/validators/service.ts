import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  durationMinutes: z.number().min(5, 'Duracao minima de 5 minutos'),
  priceInCents: z.number().min(0, 'Preco nao pode ser negativo'),
});

export const updateServiceSchema = createServiceSchema.partial();

import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  clinicName: z.string().min(2, 'Nome do estabelecimento deve ter pelo menos 2 caracteres'),
  segment: z.enum(['clinica', 'salao', 'barbearia', 'academia', 'petshop', 'veterinaria', 'outro']),
  phone: z.string().min(10, 'Telefone invalido').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

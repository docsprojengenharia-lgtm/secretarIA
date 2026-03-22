import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../validators/auth.js';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    // Dados base validos para reutilizar nos testes
    const dadosValidos = {
      name: 'Diego',
      email: 'diego@test.com',
      password: 'SenhaSegura123',
      clinicName: 'Barbearia do Ze',
      segment: 'barbearia' as const,
    };

    it('rejeita senha curta (menos de 10 caracteres)', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        password: 'Curta1',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita senha sem letra maiuscula', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        password: 'senhasegura123',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita senha sem numero', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        password: 'SenhaSemNumero',
      });
      expect(result.success).toBe(false);
    });

    it('aceita senha valida (10+ chars, maiuscula, numero)', () => {
      const result = registerSchema.safeParse(dadosValidos);
      expect(result.success).toBe(true);
    });

    it('rejeita email invalido', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        email: 'nao-e-email',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita nome curto (menos de 2 caracteres)', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        name: 'D',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita nome de clinica curto', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        clinicName: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita segmento invalido', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        segment: 'restaurante',
      });
      expect(result.success).toBe(false);
    });

    it('aceita todos os segmentos validos', () => {
      const segmentos = ['clinica', 'salao', 'barbearia', 'academia', 'petshop', 'veterinaria', 'outro'] as const;
      for (const segment of segmentos) {
        const result = registerSchema.safeParse({ ...dadosValidos, segment });
        expect(result.success).toBe(true);
      }
    });

    it('aceita telefone opcional', () => {
      const result = registerSchema.safeParse({
        ...dadosValidos,
        phone: '19995741463',
      });
      expect(result.success).toBe(true);
    });

    it('aceita cadastro sem telefone', () => {
      const result = registerSchema.safeParse(dadosValidos);
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('aceita login com email e senha validos', () => {
      const result = loginSchema.safeParse({
        email: 'ze@barbearia.com',
        password: 'qualquersenha',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita email invalido no login', () => {
      const result = loginSchema.safeParse({
        email: 'nao-e-email',
        password: 'qualquersenha',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita senha vazia no login', () => {
      const result = loginSchema.safeParse({
        email: 'ze@barbearia.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

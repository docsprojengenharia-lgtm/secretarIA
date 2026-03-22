import { describe, it, expect } from 'vitest';
import { maskPhone, maskEmail } from '../lib/mask.js';

describe('PII Masking', () => {
  describe('maskPhone', () => {
    it('mascara telefone mantendo ultimos 4 digitos', () => {
      expect(maskPhone('5519995741463')).toBe('*********1463');
    });

    it('mascara telefone curto (exatamente 4 chars)', () => {
      expect(maskPhone('1463')).toBe('****');
    });

    it('mascara telefone com 5 digitos', () => {
      expect(maskPhone('41463')).toBe('*1463');
    });

    it('retorna *** para null', () => {
      expect(maskPhone(null)).toBe('***');
    });

    it('retorna *** para undefined', () => {
      expect(maskPhone(undefined)).toBe('***');
    });

    it('retorna **** para string vazia ou curta (<=4)', () => {
      expect(maskPhone('')).toBe('***'); // string vazia e falsy
    });
  });

  describe('maskEmail', () => {
    it('mascara email mantendo primeiro char e dominio', () => {
      expect(maskEmail('diego@test.com')).toBe('d***@test.com');
    });

    it('mascara email com local de 1 char', () => {
      expect(maskEmail('d@test.com')).toBe('d***@test.com');
    });

    it('retorna *** para null', () => {
      expect(maskEmail(null)).toBe('***');
    });

    it('retorna *** para undefined', () => {
      expect(maskEmail(undefined)).toBe('***');
    });

    it('retorna *** para email sem @', () => {
      expect(maskEmail('semdominio')).toBe('***');
    });
  });
});

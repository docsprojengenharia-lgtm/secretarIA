import { describe, it, expect } from 'vitest';
import { isValidUUID } from '../middleware/validateId.js';

describe('UUID Validation', () => {
  it('aceita UUID v4 valido', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('aceita UUID em maiusculas', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejeita string aleatoria', () => {
    expect(isValidUUID('nao-e-uuid')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejeita UUID com chars invalidos', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
  });

  it('rejeita UUID sem hifens', () => {
    expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('rejeita UUID com formato errado (hifens no lugar errado)', () => {
    expect(isValidUUID('550e840-0e29b-41d4-a716-446655440000')).toBe(false);
  });
});

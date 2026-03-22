import { describe, it, expect } from 'vitest';
import { createAppointmentSchema, cancelAppointmentSchema, listAppointmentsQuerySchema } from '../validators/appointment.js';
import { updateContactSchema } from '../validators/contact.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.js';
import { createProfessionalSchema, workingHoursSchema, linkServiceSchema } from '../validators/professional.js';

// ---------- Appointment ----------

describe('Appointment Validators', () => {
  const uuidValido = '550e8400-e29b-41d4-a716-446655440000';
  const dataFutura = '2026-12-01T10:00:00.000Z';

  describe('createAppointmentSchema', () => {
    it('aceita agendamento com contactId existente', () => {
      const result = createAppointmentSchema.safeParse({
        contactId: uuidValido,
        professionalId: uuidValido,
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(true);
    });

    it('aceita agendamento com novo contato (nome + telefone)', () => {
      const result = createAppointmentSchema.safeParse({
        contactName: 'Joao Silva',
        contactPhone: '19995741463',
        professionalId: uuidValido,
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(true);
    });

    it('rejeita sem contactId nem nome+telefone', () => {
      const result = createAppointmentSchema.safeParse({
        professionalId: uuidValido,
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita sem professionalId', () => {
      const result = createAppointmentSchema.safeParse({
        contactId: uuidValido,
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita sem serviceId', () => {
      const result = createAppointmentSchema.safeParse({
        contactId: uuidValido,
        professionalId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita professionalId invalido (nao UUID)', () => {
      const result = createAppointmentSchema.safeParse({
        contactId: uuidValido,
        professionalId: 'nao-e-uuid',
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(false);
    });

    it('usa source "dashboard" como padrao', () => {
      const result = createAppointmentSchema.safeParse({
        contactId: uuidValido,
        professionalId: uuidValido,
        serviceId: uuidValido,
        startAt: dataFutura,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe('dashboard');
      }
    });

    it('aceita todas as fontes validas', () => {
      const fontes = ['ai', 'dashboard', 'manual', 'ligacao', 'instagram', 'presencial', 'outro'] as const;
      for (const source of fontes) {
        const result = createAppointmentSchema.safeParse({
          contactId: uuidValido,
          professionalId: uuidValido,
          serviceId: uuidValido,
          startAt: dataFutura,
          source,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('cancelAppointmentSchema', () => {
    it('aceita cancelamento com motivo', () => {
      const result = cancelAppointmentSchema.safeParse({ reason: 'Cliente desmarcou' });
      expect(result.success).toBe(true);
    });

    it('aceita cancelamento sem motivo', () => {
      const result = cancelAppointmentSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('listAppointmentsQuerySchema', () => {
    it('aceita filtros validos', () => {
      const result = listAppointmentsQuerySchema.safeParse({
        date: '2026-03-22',
        status: 'confirmed',
        professionalId: uuidValido,
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('rejeita formato de data invalido', () => {
      const result = listAppointmentsQuerySchema.safeParse({
        date: '22/03/2026',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita status invalido', () => {
      const result = listAppointmentsQuerySchema.safeParse({
        status: 'pendente',
      });
      expect(result.success).toBe(false);
    });

    it('usa defaults para page e limit', () => {
      const result = listAppointmentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('rejeita limit acima de 200', () => {
      const result = listAppointmentsQuerySchema.safeParse({ limit: 300 });
      expect(result.success).toBe(false);
    });
  });
});

// ---------- Contact ----------

describe('Contact Validators', () => {
  describe('updateContactSchema', () => {
    it('aceita atualizacao parcial (so nome)', () => {
      const result = updateContactSchema.safeParse({ name: 'Diego' });
      expect(result.success).toBe(true);
    });

    it('aceita status valido', () => {
      const statuses = ['new', 'active', 'inactive'] as const;
      for (const status of statuses) {
        const result = updateContactSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('rejeita status invalido', () => {
      const result = updateContactSchema.safeParse({ status: 'deletado' });
      expect(result.success).toBe(false);
    });

    it('aceita email nullable', () => {
      const result = updateContactSchema.safeParse({ email: null });
      expect(result.success).toBe(true);
    });

    it('rejeita email invalido', () => {
      const result = updateContactSchema.safeParse({ email: 'nao-email' });
      expect(result.success).toBe(false);
    });

    it('aceita notas nullable', () => {
      const result = updateContactSchema.safeParse({ notes: null });
      expect(result.success).toBe(true);
    });

    it('aceita objeto vazio (nenhum campo obrigatorio)', () => {
      const result = updateContactSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

// ---------- Service ----------

describe('Service Validators', () => {
  describe('createServiceSchema', () => {
    it('aceita servico valido', () => {
      const result = createServiceSchema.safeParse({
        name: 'Corte Masculino',
        durationMinutes: 30,
        priceInCents: 4500,
      });
      expect(result.success).toBe(true);
    });

    it('rejeita nome curto', () => {
      const result = createServiceSchema.safeParse({
        name: 'A',
        durationMinutes: 30,
        priceInCents: 4500,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita duracao menor que 5 minutos', () => {
      const result = createServiceSchema.safeParse({
        name: 'Corte',
        durationMinutes: 3,
        priceInCents: 4500,
      });
      expect(result.success).toBe(false);
    });

    it('rejeita preco negativo', () => {
      const result = createServiceSchema.safeParse({
        name: 'Corte',
        durationMinutes: 30,
        priceInCents: -100,
      });
      expect(result.success).toBe(false);
    });

    it('aceita preco zero (servico gratis)', () => {
      const result = createServiceSchema.safeParse({
        name: 'Cortesia',
        durationMinutes: 15,
        priceInCents: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateServiceSchema', () => {
    it('aceita atualizacao parcial', () => {
      const result = updateServiceSchema.safeParse({ priceInCents: 5000 });
      expect(result.success).toBe(true);
    });
  });
});

// ---------- Professional ----------

describe('Professional Validators', () => {
  describe('createProfessionalSchema', () => {
    it('aceita profissional valido', () => {
      const result = createProfessionalSchema.safeParse({ name: 'Ze' });
      expect(result.success).toBe(true);
    });

    it('rejeita nome curto', () => {
      const result = createProfessionalSchema.safeParse({ name: 'Z' });
      expect(result.success).toBe(false);
    });

    it('rejeita email invalido', () => {
      const result = createProfessionalSchema.safeParse({ name: 'Ze', email: 'invalido' });
      expect(result.success).toBe(false);
    });
  });

  describe('workingHoursSchema', () => {
    it('aceita horarios validos', () => {
      const result = workingHoursSchema.safeParse([
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
      ]);
      expect(result.success).toBe(true);
    });

    it('rejeita dia da semana invalido (> 6)', () => {
      const result = workingHoursSchema.safeParse([
        { dayOfWeek: 7, startTime: '09:00', endTime: '18:00' },
      ]);
      expect(result.success).toBe(false);
    });

    it('rejeita formato de hora invalido', () => {
      const result = workingHoursSchema.safeParse([
        { dayOfWeek: 1, startTime: '9:00', endTime: '18:00' },
      ]);
      expect(result.success).toBe(false);
    });
  });

  describe('linkServiceSchema', () => {
    it('aceita UUID valido', () => {
      const result = linkServiceSchema.safeParse({ serviceId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
    });

    it('rejeita string que nao e UUID', () => {
      const result = linkServiceSchema.safeParse({ serviceId: 'nao-uuid' });
      expect(result.success).toBe(false);
    });
  });
});

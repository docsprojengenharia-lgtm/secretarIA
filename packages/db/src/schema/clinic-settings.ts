import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const clinicSettings = pgTable('clinic_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }).unique(),
  aiStartTime: varchar('ai_start_time', { length: 5 }).notNull().default('18:01'), // HH:mm
  aiEndTime: varchar('ai_end_time', { length: 5 }).notNull().default('07:59'),
  aiEnabledDays: jsonb('ai_enabled_days').notNull().default([0, 1, 2, 3, 4, 5, 6]), // 0=domingo
  aiAlwaysOn: boolean('ai_always_on').notNull().default(false),
  aiManualOverride: boolean('ai_manual_override').notNull().default(false),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Sao_Paulo'),
  welcomeMessage: text('welcome_message'),
  fallbackMessage: text('fallback_message'),
  minAdvanceHours: integer('min_advance_hours').notNull().default(2),
  maxAdvanceDays: integer('max_advance_days').notNull().default(30),
  slotIntervalMinutes: integer('slot_interval_minutes').notNull().default(0),
  autoBook: boolean('auto_book').notNull().default(true), // true=Modo1(agenda direto), false=Modo2(captura+aprovacao)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ClinicSettings = typeof clinicSettings.$inferSelect;
export type NewClinicSettings = typeof clinicSettings.$inferInsert;

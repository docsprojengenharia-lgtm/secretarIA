import { z } from 'zod';

export const updateClinicSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
});

export const updateSettingsSchema = z.object({
  aiStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  aiEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  aiEnabledDays: z.array(z.number().min(0).max(6)).optional(),
  aiAlwaysOn: z.boolean().optional(),
  aiManualOverride: z.boolean().optional(),
  timezone: z.string().optional(),
  welcomeMessage: z.string().nullable().optional(),
  fallbackMessage: z.string().nullable().optional(),
  minAdvanceHours: z.number().min(0).optional(),
  maxAdvanceDays: z.number().min(1).max(90).optional(),
  slotIntervalMinutes: z.number().min(0).optional(),
  autoBook: z.boolean().optional(),
});

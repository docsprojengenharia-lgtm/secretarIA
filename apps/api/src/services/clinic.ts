import { db } from '@secretaria/db';
import { clinics, clinicSettings } from '@secretaria/db';
import { eq } from 'drizzle-orm';
import { AppError } from '../lib/errors.js';
import { invalidateCache } from '../lib/cache.js';

export async function getClinic(clinicId: string) {
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (!clinic) {
    throw new AppError('CLINIC_NOT_FOUND', 'Estabelecimento nao encontrado', 404);
  }

  return {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    segment: clinic.segment,
    phone: clinic.phone,
    email: clinic.email,
    address: clinic.address,
    city: clinic.city,
    state: clinic.state,
    plan: clinic.plan,
    trialEndsAt: clinic.trialEndsAt,
    isActive: clinic.isActive,
    createdAt: clinic.createdAt,
  };
}

export async function updateClinic(
  clinicId: string,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
  }>,
) {
  const [updated] = await db
    .update(clinics)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clinics.id, clinicId))
    .returning();

  if (!updated) {
    throw new AppError('CLINIC_NOT_FOUND', 'Estabelecimento nao encontrado', 404);
  }

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    segment: updated.segment,
    phone: updated.phone,
    email: updated.email,
    address: updated.address,
    city: updated.city,
    state: updated.state,
    plan: updated.plan,
    trialEndsAt: updated.trialEndsAt,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function getSettings(clinicId: string) {
  const [settings] = await db
    .select()
    .from(clinicSettings)
    .where(eq(clinicSettings.clinicId, clinicId))
    .limit(1);

  if (!settings) {
    throw new AppError('SETTINGS_NOT_FOUND', 'Configuracoes nao encontradas', 404);
  }

  return {
    id: settings.id,
    clinicId: settings.clinicId,
    aiStartTime: settings.aiStartTime,
    aiEndTime: settings.aiEndTime,
    aiEnabledDays: settings.aiEnabledDays,
    aiAlwaysOn: settings.aiAlwaysOn,
    aiManualOverride: settings.aiManualOverride,
    timezone: settings.timezone,
    welcomeMessage: settings.welcomeMessage,
    fallbackMessage: settings.fallbackMessage,
    minAdvanceHours: settings.minAdvanceHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    autoBook: settings.autoBook,
  };
}

export async function updateSettings(
  clinicId: string,
  data: Partial<{
    aiStartTime: string;
    aiEndTime: string;
    aiEnabledDays: number[];
    aiAlwaysOn: boolean;
    aiManualOverride: boolean;
    timezone: string;
    welcomeMessage: string | null;
    fallbackMessage: string | null;
    minAdvanceHours: number;
    maxAdvanceDays: number;
    slotIntervalMinutes: number;
    autoBook: boolean;
  }>,
) {
  const [updated] = await db
    .update(clinicSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clinicSettings.clinicId, clinicId))
    .returning();

  if (!updated) {
    throw new AppError('SETTINGS_NOT_FOUND', 'Configuracoes nao encontradas', 404);
  }

  // Invalida cache das settings para que o bot use os dados novos
  await invalidateCache(`clinic-settings:${clinicId}`);

  return {
    id: updated.id,
    clinicId: updated.clinicId,
    aiStartTime: updated.aiStartTime,
    aiEndTime: updated.aiEndTime,
    aiEnabledDays: updated.aiEnabledDays,
    aiAlwaysOn: updated.aiAlwaysOn,
    aiManualOverride: updated.aiManualOverride,
    timezone: updated.timezone,
    welcomeMessage: updated.welcomeMessage,
    fallbackMessage: updated.fallbackMessage,
    minAdvanceHours: updated.minAdvanceHours,
    maxAdvanceDays: updated.maxAdvanceDays,
    slotIntervalMinutes: updated.slotIntervalMinutes,
    autoBook: updated.autoBook,
  };
}

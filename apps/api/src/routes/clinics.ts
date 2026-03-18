import { Hono } from 'hono';
import { updateClinicSchema, updateSettingsSchema } from '../validators/clinic.js';
import * as clinicService from '../services/clinic.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /clinics/me
router.get('/me', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const result = await clinicService.getClinic(clinicId);
  return success(c, result);
});

// PUT /clinics/me
router.put('/me', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = updateClinicSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await clinicService.updateClinic(clinicId, parsed.data);
  return success(c, result);
});

// GET /clinics/me/settings
router.get('/me/settings', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const result = await clinicService.getSettings(clinicId);
  return success(c, result);
});

// PUT /clinics/me/settings
router.put('/me/settings', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await clinicService.updateSettings(clinicId, parsed.data);
  return success(c, result);
});

export default router;

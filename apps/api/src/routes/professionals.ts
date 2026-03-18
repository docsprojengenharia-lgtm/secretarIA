import { Hono } from 'hono';
import {
  createProfessionalSchema,
  updateProfessionalSchema,
  workingHoursSchema,
  linkServiceSchema,
} from '../validators/professional.js';
import * as professionalService from '../services/professional.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /professionals
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const result = await professionalService.listProfessionals(clinicId);
  return success(c, result);
});

// POST /professionals
router.post('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = createProfessionalSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await professionalService.createProfessional(clinicId, parsed.data);
  return success(c, result, 201);
});

// PUT /professionals/:id
router.put('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateProfessionalSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await professionalService.updateProfessional(clinicId, id, parsed.data);
  return success(c, result);
});

// DELETE /professionals/:id (soft delete)
router.delete('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  await professionalService.deleteProfessional(clinicId, id);
  return success(c, { deleted: true });
});

// GET /professionals/:id/hours
router.get('/:id/hours', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const result = await professionalService.listWorkingHours(clinicId, id);
  return success(c, result);
});

// GET /professionals/:id/services
router.get('/:id/services', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const result = await professionalService.listProfessionalServices(clinicId, id);
  return success(c, result);
});

// POST /professionals/:id/services
router.post('/:id/services', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = linkServiceSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await professionalService.linkService(clinicId, id, parsed.data.serviceId);
  return success(c, result, 201);
});

// DELETE /professionals/:id/services/:serviceId
router.delete('/:id/services/:serviceId', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const serviceId = c.req.param('serviceId');
  await professionalService.unlinkService(clinicId, id, serviceId);
  return success(c, { unlinked: true });
});

// PUT /professionals/:id/hours
router.put('/:id/hours', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = workingHoursSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await professionalService.replaceWorkingHours(clinicId, id, parsed.data);
  return success(c, result);
});

export default router;

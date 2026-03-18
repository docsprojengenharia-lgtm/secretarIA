import { Hono } from 'hono';
import { createServiceSchema, updateServiceSchema } from '../validators/service.js';
import * as serviceService from '../services/service.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /services
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const result = await serviceService.listServices(clinicId);
  return success(c, result);
});

// POST /services
router.post('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await serviceService.createService(clinicId, parsed.data);
  return success(c, result, 201);
});

// PUT /services/:id
router.put('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }
  const result = await serviceService.updateService(clinicId, id, parsed.data);
  return success(c, result);
});

// DELETE /services/:id (soft delete)
router.delete('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  await serviceService.deleteService(clinicId, id);
  return success(c, { deleted: true });
});

export default router;

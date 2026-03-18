import { Hono } from 'hono';
import { availabilityQuerySchema } from '../validators/availability.js';
import * as availabilityService from '../services/availability.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /availability?serviceId=&dateFrom=&dateTo=&professionalId=
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const query = {
    serviceId: c.req.query('serviceId'),
    professionalId: c.req.query('professionalId'),
    dateFrom: c.req.query('dateFrom'),
    dateTo: c.req.query('dateTo'),
  };

  const parsed = availabilityQuerySchema.safeParse(query);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const slots = await availabilityService.getAvailableSlots(
    clinicId,
    parsed.data.serviceId,
    parsed.data.professionalId,
    parsed.data.dateFrom,
    parsed.data.dateTo,
  );

  return success(c, { slots });
});

export default router;

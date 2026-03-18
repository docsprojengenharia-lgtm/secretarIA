import { Hono } from 'hono';
import { createAppointmentSchema, cancelAppointmentSchema, listAppointmentsQuerySchema } from '../validators/appointment.js';
import * as appointmentService from '../services/appointment.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /appointments
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const query = {
    date: c.req.query('date'),
    dateFrom: c.req.query('dateFrom'),
    dateTo: c.req.query('dateTo'),
    status: c.req.query('status'),
    professionalId: c.req.query('professionalId'),
    contactId: c.req.query('contactId'),
    page: c.req.query('page'),
    limit: c.req.query('limit'),
  };

  const parsed = listAppointmentsQuerySchema.safeParse(query);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const result = await appointmentService.listAppointments(clinicId, parsed.data);
  return success(c, result);
});

// GET /appointments/:id
router.get('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const appt = await appointmentService.getAppointment(clinicId, id);
  return success(c, appt);
});

// POST /appointments
router.post('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const appt = await appointmentService.createAppointment(clinicId, parsed.data);
  return success(c, appt, 201);
});

// PATCH /appointments/:id/cancel
router.patch('/:id/cancel', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = cancelAppointmentSchema.safeParse(body);

  const appt = await appointmentService.cancelAppointment(clinicId, id, parsed.success ? parsed.data.reason : undefined);
  return success(c, appt);
});

// PATCH /appointments/:id/complete
router.patch('/:id/complete', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const appt = await appointmentService.completeAppointment(clinicId, id);
  return success(c, appt);
});

// PATCH /appointments/:id/no-show
router.patch('/:id/no-show', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const appt = await appointmentService.noShowAppointment(clinicId, id);
  return success(c, appt);
});

export default router;

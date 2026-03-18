import { Hono } from 'hono';
import * as bookingRequestService from '../services/bookingRequest.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /booking-requests?status=pending&page=1&limit=20
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const status = c.req.query('status') || 'pending';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const rows = await bookingRequestService.listBookingRequests(clinicId, { status, page, limit });
  return success(c, rows);
});

// GET /booking-requests/count — count pending
router.get('/count', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const count = await bookingRequestService.countPending(clinicId);
  return success(c, { count });
});

// PATCH /booking-requests/:id/approve
router.patch('/:id/approve', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const appointment = await bookingRequestService.approveBookingRequest(clinicId, id);
  return success(c, appointment);
});

// PATCH /booking-requests/:id/reject
router.patch('/:id/reject', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const result = await bookingRequestService.rejectBookingRequest(
    clinicId,
    id,
    body.note,
    body.suggestedStartAt,
  );
  return success(c, result);
});

export default router;

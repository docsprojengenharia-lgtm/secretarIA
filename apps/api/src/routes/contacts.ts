import { Hono } from 'hono';
import { success, error } from '../lib/response.js';
import { updateContactSchema } from '../validators/contact.js';
import { validateIdParam } from '../middleware/validateId.js';
import * as contactService from '../services/contact.js';

const router = new Hono();

// GET /contacts — listar contatos com filtros
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const status = c.req.query('status');
  const search = c.req.query('search');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));

  const result = await contactService.listContacts(clinicId, {
    status,
    search,
    page,
    limit,
  });

  return success(c, result);
});

// GET /contacts/:id — buscar contato por ID
router.get('/:id', async (c) => {
  const idError = validateIdParam(c);
  if (idError) return idError;

  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  const contact = await contactService.getContact(clinicId, id);
  return success(c, contact);
});

// PUT /contacts/:id — atualizar contato (name, email, notes, status, birthDate)
router.put('/:id', async (c) => {
  const idError = validateIdParam(c);
  if (idError) return idError;

  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.errors.map(e => e.message).join(', '), 400);
  }

  const updated = await contactService.updateContact(clinicId, id, parsed.data);
  return success(c, updated);
});

// DELETE /contacts/:id — soft delete (marca deletedAt)
router.delete('/:id', async (c) => {
  const idError = validateIdParam(c);
  if (idError) return idError;

  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');

  await contactService.softDeleteContact(clinicId, id);
  return success(c, { deleted: true });
});

export default router;

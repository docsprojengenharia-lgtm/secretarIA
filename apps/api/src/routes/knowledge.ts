import { Hono } from 'hono';
import * as knowledgeService from '../services/knowledge.js';
import { success, error } from '../lib/response.js';

const router = new Hono();

// GET /knowledge — list documents
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const docs = await knowledgeService.listDocuments(clinicId);
  return success(c, docs);
});

// POST /knowledge/upload — upload text content
router.post('/upload', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();

  const fileName = body.fileName?.trim();
  const textContent = body.textContent?.trim();

  if (!fileName) {
    return error(c, 'VALIDATION_ERROR', 'Nome do arquivo e obrigatorio', 400);
  }

  if (!textContent) {
    return error(c, 'VALIDATION_ERROR', 'Conteudo do texto e obrigatorio', 400);
  }

  // Validar tamanho do arquivo antes de processar
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const fileSize = new TextEncoder().encode(textContent).length;
  if (fileSize > MAX_FILE_SIZE) {
    return error(c, 'FILE_TOO_LARGE', 'Arquivo excede o limite de 10MB', 413);
  }

  const doc = await knowledgeService.uploadDocument(clinicId, fileName, fileSize, textContent);
  return success(c, doc, 201);
});

// DELETE /knowledge/:id — delete document
router.delete('/:id', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const id = c.req.param('id');
  const result = await knowledgeService.deleteDocument(clinicId, id);
  return success(c, result);
});

// POST /knowledge/search — search knowledge base
router.post('/search', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const body = await c.req.json();
  const query = body.query?.trim();

  if (!query) {
    return error(c, 'VALIDATION_ERROR', 'A pergunta e obrigatoria', 400);
  }

  const results = await knowledgeService.searchKnowledge(clinicId, query);
  return success(c, results);
});

export default router;

import { Hono } from 'hono';
import { success, error } from '../lib/response.js';
import * as channelService from '../services/channel.js';

const router = new Hono();

// GET /channels — list all channels for clinic
router.get('/', async (c) => {
  const clinicId = c.get('clinicId') as string;

  try {
    const list = await channelService.listChannels(clinicId);
    return success(c, list);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar canais';
    return error(c, 'CHANNELS_LIST_ERROR', message, 500);
  }
});

// PUT /channels/:type — update channel config (enable/disable, config)
router.put('/:type', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const type = c.req.param('type');

  if (!['whatsapp', 'instagram', 'telegram'].includes(type)) {
    return error(c, 'INVALID_CHANNEL_TYPE', 'Tipo de canal invalido. Use: whatsapp, instagram, telegram', 400);
  }

  try {
    const body = await c.req.json();
    const { name, config, enabled } = body;

    if (!name || typeof name !== 'string') {
      return error(c, 'VALIDATION_ERROR', 'Campo "name" e obrigatorio', 400);
    }

    const channel = await channelService.upsertChannel(clinicId, type, {
      name: name.trim(),
      config: config || {},
      enabled: enabled ?? false,
    });

    return success(c, channel);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar canal';
    return error(c, 'CHANNEL_UPDATE_ERROR', message, 500);
  }
});

// POST /channels/:type/test — test connection (placeholder)
router.post('/:type/test', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const type = c.req.param('type');

  if (!['whatsapp', 'instagram', 'telegram'].includes(type)) {
    return error(c, 'INVALID_CHANNEL_TYPE', 'Tipo de canal invalido', 400);
  }

  try {
    const channel = await channelService.getChannel(clinicId, type);

    if (!channel) {
      return error(c, 'CHANNEL_NOT_FOUND', 'Canal nao encontrado. Configure-o primeiro.', 404);
    }

    // TODO: Implementar teste real de conexao por tipo de canal
    // - WhatsApp: verificar status da instancia Evolution
    // - Instagram: verificar token da Graph API
    // - Telegram: verificar bot token

    return success(c, { status: 'ok', message: `Teste de conexao para ${type} ainda nao implementado` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao testar canal';
    return error(c, 'CHANNEL_TEST_ERROR', message, 500);
  }
});

export default router;

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import type { JwtPayload } from '../middleware/auth.js';

const router = new Hono();

// Armazena conexoes ativas por clinicId
interface SseClient {
  id: string;
  send: (event: string, data: unknown) => void;
}

const clients = new Map<string, Set<SseClient>>();

// GET /sse/events?token=xxx
// Auth via query param porque EventSource nao suporta headers customizados
router.get('/events', async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Token obrigatorio via query param' } },
      401,
    );
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return c.json(
      { success: false, error: { code: 'AUTH_INVALID', message: 'Token invalido ou expirado' } },
      401,
    );
  }

  const clinicId = payload.clinicId;
  const clientId = crypto.randomUUID();

  return streamSSE(c, async (stream) => {
    // Registrar cliente
    if (!clients.has(clinicId)) {
      clients.set(clinicId, new Set());
    }

    const client: SseClient = {
      id: clientId,
      send: (event: string, data: unknown) => {
        try {
          stream.writeSSE({ data: JSON.stringify(data), event });
        } catch {
          // Conexao ja pode ter sido fechada
        }
      },
    };

    clients.get(clinicId)!.add(client);
    logger.info({ clinicId, clientId }, 'SSE cliente conectado');

    // Evento de conexao
    await stream.writeSSE({
      data: JSON.stringify({ type: 'connected', clientId }),
      event: 'message',
    });

    // Keepalive a cada 30s para manter conexao aberta
    const keepalive = setInterval(async () => {
      try {
        await stream.writeSSE({ data: '', event: 'ping' });
      } catch {
        clearInterval(keepalive);
      }
    }, 30_000);

    // Limpeza ao desconectar
    stream.onAbort(() => {
      clearInterval(keepalive);
      const clinicClients = clients.get(clinicId);
      if (clinicClients) {
        clinicClients.delete(client);
        if (clinicClients.size === 0) {
          clients.delete(clinicId);
        }
      }
      logger.info({ clinicId, clientId }, 'SSE cliente desconectado');
    });

    // Manter stream aberta ate abort — aguardar indefinidamente
    await new Promise<void>((resolve) => {
      stream.onAbort(() => resolve());
    });
  });
});

/**
 * Broadcast de evento para todos os clientes SSE de uma clinica.
 * Chamar de qualquer service quando algo relevante acontece.
 *
 * Exemplos:
 *   broadcastToClinic(clinicId, 'new_appointment', { appointmentId: '...' })
 *   broadcastToClinic(clinicId, 'appointment_update', { appointmentId: '...', status: 'cancelled' })
 *   broadcastToClinic(clinicId, 'new_message', { conversationId: '...' })
 *   broadcastToClinic(clinicId, 'new_contact', { contactId: '...' })
 */
export function broadcastToClinic(clinicId: string, event: string, data: unknown): void {
  const clinicClients = clients.get(clinicId);
  if (!clinicClients || clinicClients.size === 0) return;

  const payload = { type: event, ...((typeof data === 'object' && data !== null) ? data : { value: data }) };

  for (const client of clinicClients) {
    client.send('message', payload);
  }

  logger.debug({ clinicId, event, clientCount: clinicClients.size }, 'SSE broadcast enviado');
}

/** Retorna quantos clientes SSE estao conectados para uma clinica */
export function getConnectedCount(clinicId: string): number {
  return clients.get(clinicId)?.size ?? 0;
}

export default router;

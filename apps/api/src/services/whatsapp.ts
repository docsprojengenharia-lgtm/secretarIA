import { env } from '../lib/env.js';

const EVOLUTION_URL = env.EVOLUTION_API_URL;
const EVOLUTION_KEY = env.EVOLUTION_API_KEY;

async function evolutionFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
      ...options?.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    console.error(`[Evolution] ${path} failed (${res.status}):`, text);
    throw new Error(`Evolution API error: ${res.status}`);
  }
  return res.json();
}

export async function createInstance(instanceName: string, webhookUrl: string) {
  return evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        headers: {},
        events: ['MESSAGES_UPSERT'],
      },
    }),
  });
}

export async function getQrCode(instanceName: string) {
  return evolutionFetch(`/instance/connect/${instanceName}`);
}

export async function getInstanceStatus(instanceName: string) {
  return evolutionFetch(`/instance/connectionState/${instanceName}`);
}

export async function sendTextMessage(instanceName: string, phone: string, text: string) {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      text,
    }),
  });
}

export async function disconnectInstance(instanceName: string) {
  return evolutionFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
}

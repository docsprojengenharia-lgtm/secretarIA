import { env } from '../lib/env.js';

export async function downloadAudio(instanceName: string, messageId: string): Promise<Buffer | null> {
  try {
    const url = `${env.EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    });

    if (!res.ok) {
      console.error(`[Audio] Download failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json() as { base64?: string };
    if (data?.base64) {
      return Buffer.from(data.base64, 'base64');
    }

    console.warn('[Audio] No base64 data in response');
    return null;
  } catch (err) {
    console.error('[Audio] Download error:', err);
    return null;
  }
}

import { redis } from './redis.js';

/**
 * Cache genérico com Redis (fallback gracioso se Redis indisponível).
 * Busca no cache primeiro; se não encontrar, executa o fetcher e armazena.
 */
export async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (e) {
      // Redis falhou, segue sem cache
    }
  }

  const data = await fetcher();

  if (redis && data) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (e) {
      // Redis falhou, segue sem cache
    }
  }

  return data;
}

/**
 * Invalida chaves no cache que correspondem ao padrão (suporta wildcards).
 * Chamado quando dados são atualizados para evitar cache stale.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {
      // Ignora erro de invalidação
    }
  }
}

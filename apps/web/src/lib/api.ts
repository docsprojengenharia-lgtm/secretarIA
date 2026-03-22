import { getToken, setToken, removeToken, getRefreshToken, setRefreshToken, removeRefreshToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
  ? process.env.NEXT_PUBLIC_API_URL
  : 'https://secretaria-api.fly.dev';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// Controle para evitar multiplas tentativas de refresh simultaneas
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Tenta renovar o access token usando o refresh token
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data: ApiResponse<{ token: string; refreshToken: string }> = await res.json();
    if (data.success && data.data) {
      setToken(data.data.token);
      setRefreshToken(data.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Limpa tokens e redireciona para login
function forceLogout(): void {
  removeToken();
  removeRefreshToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

async function fetchAPI<T = unknown>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
      // Evita loop infinito: nao tentar refresh na propria rota de refresh
      if (path === '/auth/refresh') {
        forceLogout();
        return { success: false, error: { code: 'AUTH_EXPIRED', message: 'Sessao expirada' } };
      }

      // Se ja tem um refresh em andamento, espera ele terminar
      if (isRefreshing && refreshPromise) {
        const refreshed = await refreshPromise;
        if (refreshed) {
          // Retry da requisicao original com novo token
          const newToken = getToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
          }
          const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
          return await retryRes.json();
        }
        forceLogout();
        return { success: false, error: { code: 'AUTH_EXPIRED', message: 'Sessao expirada' } };
      }

      // Tenta renovar o token
      isRefreshing = true;
      refreshPromise = tryRefreshToken();
      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        // Retry da requisicao original com novo token
        const newToken = getToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }
        const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
        return await retryRes.json();
      }

      // Refresh falhou — logout
      forceLogout();
      return { success: false, error: { code: 'AUTH_EXPIRED', message: 'Sessao expirada' } };
    }

    return await res.json();
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Erro de conexao' } };
  }
}

export const api = {
  get: <T = unknown>(path: string) => fetchAPI<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    fetchAPI<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T = unknown>(path: string, body?: unknown) =>
    fetchAPI<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    fetchAPI<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string) =>
    fetchAPI<T>(path, { method: 'DELETE' }),
};

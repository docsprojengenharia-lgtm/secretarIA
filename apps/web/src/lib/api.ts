import { getToken, removeToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
  ? process.env.NEXT_PUBLIC_API_URL
  : 'https://secretaria-api.fly.dev';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
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
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
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

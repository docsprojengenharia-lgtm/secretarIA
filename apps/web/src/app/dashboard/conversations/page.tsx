'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPhone, formatTime } from '@/lib/formatters';
import type { Conversation, PaginatedResponse } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'pending_human', label: 'Pendentes' },
  { value: 'closed', label: 'Encerradas' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_human: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  pending_human: 'Pendente',
  closed: 'Encerrada',
};

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Resetar pagina ao mudar filtro ou busca
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (statusFilter) params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    const res = await api.get<PaginatedResponse<Conversation>>(
      `/conversations?${params.toString()}`
    );
    setConversations(res.data?.data ?? []);
    setTotalPages(res.data?.totalPages ?? 1);
    setLoading(false);
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe as conversas do WhatsApp
        </p>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative max-w-md flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Conversation Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-lg border border-border bg-white py-12 text-center text-sm text-muted-foreground shadow-sm">
          Nenhuma conversa encontrada
        </div>
      ) : (
        <div className="grid gap-3">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-white p-4 shadow-sm transition-colors hover:bg-muted/30 text-left w-full"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      className="h-5 w-5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {conv.contactName ?? 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.contactPhone ? formatPhone(conv.contactPhone) : '-'}
                    </p>
                  </div>
                </div>
                {conv.lastMessage && (
                  <p className="mt-2 truncate text-sm text-muted-foreground pl-[52px]">
                    {conv.lastMessage}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[conv.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABEL[conv.status] ?? conv.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(conv.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Paginacao */}
        <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

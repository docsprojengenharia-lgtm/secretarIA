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

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (statusFilter) params.set('status', statusFilter);

    const res = await api.get<PaginatedResponse<Conversation>>(
      `/conversations?${params.toString()}`
    );
    setConversations(res.data?.data ?? []);
    setLoading(false);
  }, [statusFilter]);

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

      {/* Filter */}
      <div className="flex items-end gap-4">
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
      )}
    </div>
  );
}

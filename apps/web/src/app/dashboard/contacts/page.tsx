'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatPhone, formatDateTime } from '@/lib/formatters';
import type { Contact, PaginatedResponse } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  active: 'Ativo',
  inactive: 'Inativo',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Resetar pagina ao buscar
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (debouncedSearch) params.set('search', debouncedSearch);

    const res = await api.get<PaginatedResponse<Contact>>(
      `/contacts?${params.toString()}`
    );
    setContacts(res.data?.data ?? []);
    setTotalPages(res.data?.totalPages ?? 1);
    setLoading(false);
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todos os clientes que entraram em contato
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
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

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum contato encontrado
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Telefone
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Ultimo Contato
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {contact.name ?? 'Sem nome'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {formatPhone(contact.phone)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[contact.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUS_LABEL[contact.status] ?? contact.status}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground md:table-cell">
                    {contact.lastContactAt
                      ? formatDateTime(contact.lastContactAt)
                      : '-'}
                  </td>
                  <td className="hidden max-w-[200px] truncate px-4 py-3 text-muted-foreground lg:table-cell">
                    {contact.notes ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginacao */}
        {!loading && contacts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
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
    </div>
  );
}

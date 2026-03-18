'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatters';

interface BookingRequest {
  id: string;
  contactName?: string;
  contactPhone?: string;
  serviceName?: string;
  professionalName?: string;
  requestedStartAt: string;
  status: string;
  ownerNote?: string;
  suggestedStartAt?: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await api.get<BookingRequest[]>(
      `/booking-requests?status=${filter}&limit=50`
    );
    setRequests(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    const res = await api.patch(`/booking-requests/${id}/approve`);
    if (!res.success) {
      alert(res.error?.message || 'Erro ao aprovar');
    }
    await fetchRequests();
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    const res = await api.patch(`/booking-requests/${id}/reject`, {
      note: rejectNote || undefined,
    });
    if (!res.success) {
      alert(res.error?.message || 'Erro ao rejeitar');
    }
    setRejectingId(null);
    setRejectNote('');
    await fetchRequests();
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitacoes de Agendamento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pedidos capturados pela IA aguardando sua aprovacao
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
            Nenhuma solicitacao {STATUS_LABEL[filter]?.toLowerCase()}
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {req.contactName || 'Sem nome'}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {req.serviceName || 'Servico'} &middot; {req.professionalName || 'Qualquer profissional'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Horario solicitado: <span className="font-medium">{formatDateTime(req.requestedStartAt)}</span>
                  </div>
                  {req.contactPhone && (
                    <div className="text-xs text-gray-400 mt-1">{req.contactPhone}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    Recebido em {formatDateTime(req.createdAt)}
                  </div>
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Aprovar
                    </button>
                    {rejectingId === req.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Motivo (opcional)"
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectNote(''); }}
                            className="rounded-md bg-gray-200 px-2 py-1 text-xs text-gray-700"
                          >
                            Voltar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejectingId(req.id)}
                        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Rejeitar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

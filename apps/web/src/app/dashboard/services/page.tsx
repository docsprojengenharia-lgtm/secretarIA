'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import type { Service } from '@/types';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  durationMinutes: string;
  priceDisplay: string;
}

const EMPTY_FORM: ServiceFormData = {
  name: '',
  description: '',
  category: '',
  durationMinutes: '30',
  priceDisplay: '',
};

function priceToCents(display: string): number {
  // Accept "45", "45,00", "45.00" → 4500
  const cleaned = display.replace(/[^\d,\.]/g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchServices = useCallback(async () => {
    const res = await api.get<Service[]>('/services');
    if (res.success && res.data) {
      setServices(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  function startEdit(svc: Service) {
    setForm({
      name: svc.name,
      description: svc.description || '',
      category: svc.category || '',
      durationMinutes: String(svc.durationMinutes),
      priceDisplay: centsToDisplay(svc.priceInCents),
    });
    setEditingId(svc.id);
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Nome e obrigatorio');
      return;
    }

    const duration = parseInt(form.durationMinutes, 10);
    if (isNaN(duration) || duration < 5) {
      setError('Duracao minima de 5 minutos');
      return;
    }

    const priceInCents = priceToCents(form.priceDisplay);
    if (priceInCents < 0) {
      setError('Preco invalido');
      return;
    }

    setSaving(true);
    setError('');

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      durationMinutes: duration,
      priceInCents,
    };

    const res = editingId
      ? await api.put<Service>(`/services/${editingId}`, body)
      : await api.post<Service>('/services', body);

    setSaving(false);

    if (res.success) {
      resetForm();
      fetchServices();
    } else {
      setError(res.error?.message || 'Erro ao salvar');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este servico?')) return;
    const res = await api.delete(`/services/${id}`);
    if (res.success) {
      fetchServices();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Servicos</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          + Novo Servico
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar Servico' : 'Novo Servico'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Ex: Consulta, Corte, Aula..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Ex: Consulta, Estetica, Corte..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                placeholder="Descricao do servico..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duracao (minutos) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preco (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    value={form.priceDisplay}
                    onChange={(e) => setForm({ ...form, priceDisplay: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    placeholder="45,00"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhum servico cadastrado.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em &quot;Novo Servico&quot; para comecar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Servico
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duracao
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Preco
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{svc.name}</p>
                        {svc.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{svc.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {svc.category ? (
                        <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {svc.category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-700">{svc.durationMinutes} min</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(svc.priceInCents)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          svc.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {svc.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(svc)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(svc.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

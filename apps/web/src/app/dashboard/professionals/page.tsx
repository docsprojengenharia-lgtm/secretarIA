'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Professional, Service, WorkingHour, LinkedService } from '@/types';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const EMPTY_HOURS: WorkingHour[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  startTime: '09:00',
  endTime: '18:00',
}));

interface ProfessionalFormData {
  name: string;
  phone: string;
  email: string;
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfessionalFormData>({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Expanded sections per professional
  const [expandedHours, setExpandedHours] = useState<string | null>(null);
  const [expandedServices, setExpandedServices] = useState<string | null>(null);

  // Working hours state
  const [hours, setHours] = useState<WorkingHour[]>(EMPTY_HOURS);
  const [enabledDays, setEnabledDays] = useState<boolean[]>(Array(7).fill(false));
  const [savingHours, setSavingHours] = useState(false);

  // Professional services state
  const [profServices, setProfServices] = useState<LinkedService[]>([]);
  const [addServiceId, setAddServiceId] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);

  const fetchProfessionals = useCallback(async () => {
    const res = await api.get<Professional[]>('/professionals');
    if (res.success && res.data) {
      setProfessionals(res.data);
    }
    setLoading(false);
  }, []);

  const fetchAllServices = useCallback(async () => {
    const res = await api.get<Service[]>('/services');
    if (res.success && res.data) {
      setAllServices(res.data.filter((s) => s.isActive));
    }
  }, []);

  useEffect(() => {
    fetchProfessionals();
    fetchAllServices();
  }, [fetchProfessionals, fetchAllServices]);

  // --- CRUD ---

  function resetForm() {
    setForm({ name: '', phone: '', email: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  function startEdit(prof: Professional) {
    setForm({ name: prof.name, phone: prof.phone || '', email: prof.email || '' });
    setEditingId(prof.id);
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    setError('');

    const body: Record<string, string | undefined> = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    };

    const res = editingId
      ? await api.put<Professional>(`/professionals/${editingId}`, body)
      : await api.post<Professional>('/professionals', body);

    setSaving(false);

    if (res.success) {
      toast.success(editingId ? 'Profissional atualizado com sucesso' : 'Profissional cadastrado com sucesso');
      resetForm();
      fetchProfessionals();
    } else {
      toast.error(res.error?.message || 'Erro ao salvar profissional');
      setError(res.error?.message || 'Erro ao salvar');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este profissional?')) return;
    const res = await api.delete(`/professionals/${id}`);
    if (res.success) {
      toast.success('Profissional excluido com sucesso');
      fetchProfessionals();
    } else {
      toast.error(res.error?.message || 'Erro ao excluir profissional');
    }
  }

  // --- Working Hours ---

  async function toggleHours(profId: string) {
    if (expandedHours === profId) {
      setExpandedHours(null);
      return;
    }

    setExpandedHours(profId);
    setSavingHours(false);

    const res = await api.get<WorkingHour[]>(`/professionals/${profId}/hours`);

    if (res.success && res.data && res.data.length > 0) {
      const newEnabled = Array(7).fill(false);
      const newHours = [...EMPTY_HOURS];
      res.data.forEach((wh) => {
        newEnabled[wh.dayOfWeek] = true;
        newHours[wh.dayOfWeek] = { dayOfWeek: wh.dayOfWeek, startTime: wh.startTime, endTime: wh.endTime };
      });
      setEnabledDays(newEnabled);
      setHours(newHours);
    } else {
      setEnabledDays(Array(7).fill(false));
      setHours([...EMPTY_HOURS]);
    }
  }

  function updateHour(day: number, field: 'startTime' | 'endTime', value: string) {
    setHours((prev) => prev.map((h) => (h.dayOfWeek === day ? { ...h, [field]: value } : h)));
  }

  function toggleDay(day: number) {
    setEnabledDays((prev) => prev.map((v, i) => (i === day ? !v : v)));
  }

  async function saveHours(profId: string) {
    setSavingHours(true);
    const payload = hours.filter((_, i) => enabledDays[i]);
    const res = await api.put(`/professionals/${profId}/hours`, payload);
    setSavingHours(false);

    if (res.success) {
      toast.success('Horarios salvos com sucesso');
    } else {
      toast.error(res.error?.message || 'Erro ao salvar horarios');
    }
  }

  // --- Professional Services ---

  async function toggleServices(profId: string) {
    if (expandedServices === profId) {
      setExpandedServices(null);
      return;
    }

    setExpandedServices(profId);
    setLoadingServices(true);

    const res = await api.get<LinkedService[]>(`/professionals/${profId}/services`);
    if (res.success && res.data) {
      setProfServices(res.data);
    } else {
      setProfServices([]);
    }
    setLoadingServices(false);
    setAddServiceId('');
  }

  async function linkService(profId: string) {
    if (!addServiceId) return;
    const res = await api.post(`/professionals/${profId}/services`, { serviceId: addServiceId });
    if (res.success) {
      toast.success('Servico vinculado com sucesso');
      setAddServiceId('');
      const refreshRes = await api.get<LinkedService[]>(`/professionals/${profId}/services`);
      if (refreshRes.success && refreshRes.data) {
        setProfServices(refreshRes.data);
      }
    } else {
      toast.error(res.error?.message || 'Erro ao vincular servico');
    }
  }

  async function unlinkService(profId: string, serviceId: string) {
    const res = await api.delete(`/professionals/${profId}/services/${serviceId}`);
    if (res.success) {
      toast.success('Servico desvinculado');
      setProfServices((prev) => prev.filter((s) => s.serviceId !== serviceId));
    } else {
      toast.error(res.error?.message || 'Erro ao desvincular servico');
    }
  }

  // Available services (not already linked)
  const availableServices = allServices.filter(
    (s) => !profServices.some((ps) => ps.serviceId === s.id)
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          + Novo Profissional
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar Profissional' : 'Novo Profissional'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Nome do profissional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="email@exemplo.com"
                />
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

      {/* Professionals List */}
      {professionals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Nenhum profissional cadastrado.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em &quot;Novo Profissional&quot; para comecar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {professionals.map((prof) => (
            <div key={prof.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-semibold text-sm">
                      {prof.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{prof.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      {prof.phone && <span>{prof.phone}</span>}
                      {prof.email && <span>{prof.email}</span>}
                    </div>
                  </div>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      prof.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {prof.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleHours(prof.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      expandedHours === prof.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Horarios
                  </button>
                  <button
                    onClick={() => toggleServices(prof.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      expandedServices === prof.id
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Servicos
                  </button>
                  <button
                    onClick={() => startEdit(prof)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(prof.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {/* Working Hours Section */}
              {expandedHours === prof.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Horarios de Trabalho</h4>
                  <div className="space-y-2">
                    {DAY_LABELS.map((label, day) => (
                      <div key={day} className="flex items-center gap-3">
                        <label className="flex items-center gap-2 w-16">
                          <input
                            type="checkbox"
                            checked={enabledDays[day]}
                            onChange={() => toggleDay(day)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </label>
                        <input
                          type="time"
                          value={hours[day].startTime}
                          onChange={(e) => updateHour(day, 'startTime', e.target.value)}
                          disabled={!enabledDays[day]}
                          className="px-2 py-1 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                        <span className="text-sm text-gray-500">ate</span>
                        <input
                          type="time"
                          value={hours[day].endTime}
                          onChange={(e) => updateHour(day, 'endTime', e.target.value)}
                          disabled={!enabledDays[day]}
                          className="px-2 py-1 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => saveHours(prof.id)}
                    disabled={savingHours}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {savingHours ? 'Salvando...' : 'Salvar Horarios'}
                  </button>
                </div>
              )}

              {/* Professional Services Section */}
              {expandedServices === prof.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Servicos Vinculados</h4>

                  {loadingServices ? (
                    <p className="text-sm text-gray-400">Carregando...</p>
                  ) : (
                    <>
                      {/* Current services */}
                      {profServices.length === 0 ? (
                        <p className="text-sm text-gray-400 mb-3">Nenhum servico vinculado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {profServices.map((ls) => (
                            <span
                              key={ls.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                            >
                              {ls.serviceName}
                              <button
                                onClick={() => unlinkService(prof.id, ls.serviceId)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                title="Desvincular"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Add service */}
                      {availableServices.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            value={addServiceId}
                            onChange={(e) => setAddServiceId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                          >
                            <option value="">Selecione um servico...</option>
                            {availableServices.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => linkService(prof.id)}
                            disabled={!addServiceId}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            Vincular
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

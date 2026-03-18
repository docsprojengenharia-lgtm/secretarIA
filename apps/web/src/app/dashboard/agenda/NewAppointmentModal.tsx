'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import type { Contact, Professional, Service, LinkedService } from '@/types';

interface Slot {
  professionalId: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
}

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'ligacao', label: 'Ligacao' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'outro', label: 'Outro' },
] as const;

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  professionals: Professional[];
  defaultDate: string;
}

export default function NewAppointmentModal({
  open,
  onClose,
  onCreated,
  professionals,
  defaultDate,
}: NewAppointmentModalProps) {
  // Contact search
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isNewContact, setIsNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [professionalId, setProfessionalId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [source, setSource] = useState('manual');

  // Data
  const [linkedServices, setLinkedServices] = useState<LinkedService[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setContactSearch('');
      setContactResults([]);
      setSelectedContact(null);
      setIsNewContact(false);
      setNewContactName('');
      setNewContactPhone('');
      setProfessionalId('');
      setServiceId('');
      setDate(defaultDate);
      setTime('');
      setSource('manual');
      setLinkedServices([]);
      setAvailableSlots([]);
      setErrorMsg('');
    }
  }, [open, defaultDate]);

  // Search contacts with debounce
  useEffect(() => {
    if (contactSearch.length < 2) {
      setContactResults([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingContacts(true);
      const res = await api.get<{ data: Contact[] }>(
        `/contacts?search=${encodeURIComponent(contactSearch)}&limit=10`
      );
      setContactResults(res.data?.data ?? []);
      setSearchingContacts(false);
    }, 300);
  }, [contactSearch]);

  // Fetch linked services when professional changes
  useEffect(() => {
    if (!professionalId) {
      setLinkedServices([]);
      setServiceId('');
      return;
    }
    setLoadingServices(true);
    setServiceId('');
    api.get<LinkedService[]>(`/professionals/${professionalId}/services`).then((res) => {
      setLinkedServices(Array.isArray(res.data) ? res.data : []);
      setLoadingServices(false);
    });
  }, [professionalId]);

  // Fetch available slots when service + date + professional change
  useEffect(() => {
    if (!serviceId || !date || !professionalId) {
      setAvailableSlots([]);
      setTime('');
      return;
    }
    setLoadingSlots(true);
    setTime('');
    const params = new URLSearchParams({
      serviceId,
      professionalId,
      dateFrom: date,
      dateTo: date,
    });
    api.get<{ slots: Slot[] }>(`/availability?${params.toString()}`).then((res) => {
      setAvailableSlots(res.data?.slots ?? []);
      setLoadingSlots(false);
    });
  }, [serviceId, date, professionalId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectContact(contact: Contact) {
    setSelectedContact(contact);
    setIsNewContact(false);
    setContactSearch('');
    setShowContactDropdown(false);
  }

  function switchToNewContact() {
    setSelectedContact(null);
    setIsNewContact(true);
    setShowContactDropdown(false);
    setNewContactName(contactSearch);
  }

  function clearContact() {
    setSelectedContact(null);
    setIsNewContact(false);
    setContactSearch('');
    setNewContactName('');
    setNewContactPhone('');
  }

  const selectedService = linkedServices.find((s) => s.serviceId === serviceId);

  async function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    setErrorMsg('');

    // Validation
    if (!selectedContact && !isNewContact) {
      setErrorMsg('Selecione um contato ou crie um novo');
      return;
    }
    if (isNewContact && (!newContactName.trim() || !newContactPhone.trim())) {
      setErrorMsg('Preencha nome e telefone do novo contato');
      return;
    }
    if (!professionalId) {
      setErrorMsg('Selecione um profissional');
      return;
    }
    if (!serviceId) {
      setErrorMsg('Selecione um servico');
      return;
    }
    if (!time) {
      setErrorMsg('Selecione um horario');
      return;
    }

    setSubmitting(true);

    // Find selected slot to get startAt ISO
    const slot = availableSlots.find((s) => s.startTime === time);

    // Build the body
    const body: Record<string, string> = {
      professionalId,
      serviceId,
      startAt: slot ? slot.startAt : `${date}T${time}:00.000Z`,
      source,
    };

    if (selectedContact) {
      body.contactId = selectedContact.id;
    } else if (isNewContact) {
      body.contactName = newContactName.trim();
      body.contactPhone = newContactPhone.trim().replace(/\D/g, '');
    }

    const res = await api.post('/appointments', body);

    if (res.success) {
      onCreated();
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Erro ao criar agendamento');
    }

    setSubmitting(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-lg rounded-lg border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Novo Agendamento</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Contact */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contato</label>

            {selectedContact ? (
              <div className="flex items-center justify-between rounded-md border border-input bg-green-50 px-3 py-2">
                <div>
                  <span className="font-medium text-foreground">{selectedContact.name || 'Sem nome'}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{selectedContact.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={clearContact}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Trocar
                </button>
              </div>
            ) : isNewContact ? (
              <div className="space-y-2 rounded-md border border-input bg-blue-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Novo contato</span>
                  <button
                    type="button"
                    onClick={clearContact}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nome"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="tel"
                  placeholder="Telefone (ex: 11999999999)"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ) : (
              <div className="relative" ref={contactDropdownRef}>
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setShowContactDropdown(true);
                  }}
                  onFocus={() => {
                    if (contactSearch.length >= 2) setShowContactDropdown(true);
                  }}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showContactDropdown && contactSearch.length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
                    {searchingContacts ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                    ) : (
                      <>
                        {contactResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectContact(c)}
                            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
                          >
                            <span className="font-medium">{c.name || 'Sem nome'}</span>
                            <span className="ml-2 text-muted-foreground">{c.phone}</span>
                          </button>
                        ))}
                        {contactResults.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum contato encontrado
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={switchToNewContact}
                          className="w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                        >
                          + Criar novo contato
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Professional */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Profissional</label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {professionals.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Servico</label>
            {!professionalId ? (
              <p className="text-sm text-muted-foreground italic">Selecione um profissional primeiro</p>
            ) : loadingServices ? (
              <p className="text-sm text-muted-foreground">Carregando servicos...</p>
            ) : linkedServices.length === 0 ? (
              <p className="text-sm text-yellow-600">Nenhum servico vinculado a este profissional</p>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {linkedServices.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.serviceName} — {s.durationMinutes}min — {formatCurrency(s.priceInCents)}
                  </option>
                ))}
              </select>
            )}
            {selectedService && (
              <p className="mt-1 text-xs text-muted-foreground">
                Duracao: {selectedService.durationMinutes}min | Valor: {formatCurrency(selectedService.priceInCents)}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Time slot */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Horario</label>
            {!serviceId || !date ? (
              <p className="text-sm text-muted-foreground italic">Selecione servico e data primeiro</p>
            ) : loadingSlots ? (
              <p className="text-sm text-muted-foreground">Carregando horarios disponiveis...</p>
            ) : availableSlots.length === 0 ? (
              <div>
                <p className="text-sm text-yellow-600 mb-2">Nenhum horario disponivel nesta data</p>
                <div>
                  <label className="text-xs text-muted-foreground">Ou digite o horario manualmente:</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setTime(slot.startTime)}
                    className={`rounded-md border px-2 py-1.5 text-sm font-medium transition-colors
                      ${time === slot.startTime
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-border bg-white text-foreground hover:border-green-300 hover:bg-green-50/50'
                      }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Origem</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Agendando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

interface ClinicInfo {
  id: string;
  name: string;
  slug: string;
  segment: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  priceInCents: number;
}

interface ProfessionalItem {
  id: string;
  name: string;
}

interface SlotItem {
  professionalId: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
}

interface BookingConfirmation {
  id: string;
  clinicName: string;
  serviceName: string;
  professionalName: string;
  startAt: string;
  endAt: string;
}

// ============================================================================
// API helper (public, no auth)
// ============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
  ? process.env.NEXT_PUBLIC_API_URL
  : 'https://secretaria-api.fly.dev';

async function publicApi<T>(path: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: { code: string; message: string } }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      },
    });
    return await res.json();
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Erro de conexao. Tente novamente.' } };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  return days[date.getDay()];
}

function generateDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ============================================================================
// Main Component
// ============================================================================

type Step = 'service' | 'professional' | 'date' | 'time' | 'info' | 'confirmed';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [step, setStep] = useState<Step>('service');
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selections
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalItem | null>(null);
  const [noProfPreference, setNoProfPreference] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const dates = generateDates(30);

  // ============================================================================
  // Load clinic + services on mount
  // ============================================================================

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [clinicRes, servicesRes] = await Promise.all([
        publicApi<ClinicInfo>(`/public/clinics/${slug}`),
        publicApi<ServiceItem[]>(`/public/clinics/${slug}/services`),
      ]);

      if (clinicRes.success && clinicRes.data) {
        setClinic(clinicRes.data);
      } else {
        setErrorMsg('Estabelecimento nao encontrado.');
      }

      if (servicesRes.success && servicesRes.data) {
        setServices(servicesRes.data);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  // ============================================================================
  // Load professionals when service is selected
  // ============================================================================

  const loadProfessionals = useCallback(async (serviceId: string) => {
    const res = await publicApi<ProfessionalItem[]>(`/public/clinics/${slug}/professionals?serviceId=${serviceId}`);
    if (res.success && res.data) {
      setProfessionals(res.data);
    }
  }, [slug]);

  // ============================================================================
  // Load slots when date is selected
  // ============================================================================

  const loadSlots = useCallback(async (date: string) => {
    if (!selectedService) return;
    setSlotsLoading(true);
    const profParam = selectedProfessional ? `&professionalId=${selectedProfessional.id}` : '';
    const res = await publicApi<{ slots: SlotItem[] }>(`/public/clinics/${slug}/availability?serviceId=${selectedService.id}&date=${date}${profParam}`);
    if (res.success && res.data) {
      setSlots(res.data.slots);
    }
    setSlotsLoading(false);
  }, [slug, selectedService, selectedProfessional]);

  // ============================================================================
  // Step handlers
  // ============================================================================

  function handleSelectService(service: ServiceItem) {
    setSelectedService(service);
    setSelectedProfessional(null);
    setNoProfPreference(false);
    setSelectedDate('');
    setSelectedSlot(null);
    loadProfessionals(service.id);
    setStep('professional');
  }

  function handleSelectProfessional(prof: ProfessionalItem | null) {
    setSelectedProfessional(prof);
    setNoProfPreference(prof === null);
    setSelectedDate('');
    setSelectedSlot(null);
    setStep('date');
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadSlots(date);
    setStep('time');
  }

  function handleSelectSlot(slot: SlotItem) {
    setSelectedSlot(slot);
    setStep('info');
  }

  async function handleBook() {
    if (!selectedService || !selectedSlot || !name.trim() || !phone.trim()) return;

    setBooking(true);
    setErrorMsg('');

    const res = await publicApi<BookingConfirmation>(`/public/clinics/${slug}/book`, {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim().replace(/\D/g, ''),
        serviceId: selectedService.id,
        professionalId: selectedSlot.professionalId,
        startAt: selectedSlot.startAt,
      }),
    });

    setBooking(false);

    if (res.success && res.data) {
      setConfirmation(res.data);
      setStep('confirmed');
    } else {
      setErrorMsg(res.error?.message || 'Erro ao agendar. Tente novamente.');
    }
  }

  function goBack() {
    switch (step) {
      case 'professional': setStep('service'); break;
      case 'date': setStep('professional'); break;
      case 'time': setStep('date'); break;
      case 'info': setStep('time'); break;
    }
  }

  // ============================================================================
  // Phone mask helper
  // ============================================================================

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 2) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setPhone(masked);
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Estabelecimento nao encontrado</h1>
          <p className="mt-2 text-gray-500">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const stepNumber = { service: 1, professional: 2, date: 3, time: 4, info: 5, confirmed: 6 }[step];
  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">{clinic.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{clinic.name}</h1>
              {clinic.address && (
                <p className="text-xs text-gray-500 truncate">{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {step !== 'confirmed' && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < stepNumber ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Passo {stepNumber} de {totalSteps}</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Back button */}
        {step !== 'service' && step !== 'confirmed' && (
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </button>
        )}

        {errorMsg && step !== 'confirmed' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 1: Choose service */}
        {/* ============================================================= */}
        {step === 'service' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha o servico</h2>
            <p className="text-sm text-gray-500 mb-6">Selecione o que voce deseja agendar</p>

            {services.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum servico disponivel no momento.</p>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => handleSelectService(svc)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                        {svc.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center text-xs text-gray-400">
                            <svg className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {formatDuration(svc.durationMinutes)}
                          </span>
                          {svc.category && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{svc.category}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-green-600 font-bold text-sm ml-3 whitespace-nowrap">
                        {formatPrice(svc.priceInCents)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 2: Choose professional */}
        {/* ============================================================= */}
        {step === 'professional' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha o profissional</h2>
            <p className="text-sm text-gray-500 mb-6">Quem voce prefere? (opcional)</p>

            <div className="space-y-3">
              {/* No preference option */}
              <button
                onClick={() => handleSelectProfessional(null)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                  noProfPreference ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sem preferencia</h3>
                    <p className="text-sm text-gray-500">Qualquer profissional disponivel</p>
                  </div>
                </div>
              </button>

              {professionals.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => handleSelectProfessional(prof)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    selectedProfessional?.id === prof.id ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-green-700">{prof.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{prof.name}</h3>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 3: Choose date */}
        {/* ============================================================= */}
        {step === 'date' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha a data</h2>
            <p className="text-sm text-gray-500 mb-6">Quando voce prefere?</p>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {dates.map((date) => {
                const isSelected = selectedDate === date;
                const isToday = date === dates[0];
                return (
                  <button
                    key={date}
                    onClick={() => handleSelectDate(date)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-xs text-gray-400 font-medium">{getDayName(date).slice(0, 3)}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{date.split('-')[2]}</p>
                    <p className="text-xs text-gray-400">{date.split('-')[1]}/{date.split('-')[0].slice(2)}</p>
                    {isToday && <span className="text-[10px] text-green-600 font-medium">Hoje</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 4: Choose time slot */}
        {/* ============================================================= */}
        {step === 'time' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha o horario</h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedDate && `${getDayName(selectedDate)}, ${formatDateBR(selectedDate)}`}
              {selectedService && ` — ${selectedService.name}`}
            </p>

            {slotsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                <p className="mt-3 text-sm text-gray-400">Buscando horarios...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Nenhum horario disponivel nesta data.</p>
                <button
                  onClick={() => setStep('date')}
                  className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Escolher outra data
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot, i) => {
                  const isSelected = selectedSlot?.startAt === slot.startAt && selectedSlot?.professionalId === slot.professionalId;
                  return (
                    <button
                      key={`${slot.professionalId}-${slot.startAt}-${i}`}
                      onClick={() => handleSelectSlot(slot)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                      }`}
                    >
                      <p className="text-base font-bold text-gray-900">{slot.startTime}</p>
                      {noProfPreference && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{slot.professionalName}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 5: Enter info + confirm */}
        {/* ============================================================= */}
        {step === 'info' && selectedSlot && selectedService && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Seus dados</h2>
            <p className="text-sm text-gray-500 mb-6">Quase la! Informe seu nome e telefone.</p>

            {/* Summary card */}
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 mb-6">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Resumo do agendamento</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p><span className="font-medium">Servico:</span> {selectedService.name} ({formatPrice(selectedService.priceInCents)})</p>
                <p><span className="font-medium">Profissional:</span> {selectedSlot.professionalName}</p>
                <p><span className="font-medium">Data:</span> {getDayName(selectedSlot.date)}, {formatDateBR(selectedSlot.date)}</p>
                <p><span className="font-medium">Horario:</span> {selectedSlot.startTime} - {selectedSlot.endTime}</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
                />
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={booking || !name.trim() || phone.replace(/\D/g, '').length < 10}
              className="w-full mt-6 px-4 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booking ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Agendando...
                </span>
              ) : (
                'Confirmar agendamento'
              )}
            </button>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 6: Confirmation */}
        {/* ============================================================= */}
        {step === 'confirmed' && confirmation && (
          <div className="text-center py-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h2 className="mt-4 text-2xl font-bold text-gray-900">Agendamento confirmado!</h2>
            <p className="mt-2 text-gray-500">Voce recebera uma confirmacao por WhatsApp.</p>

            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Servico</span>
                <span className="font-medium text-gray-900">{confirmation.serviceName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Profissional</span>
                <span className="font-medium text-gray-900">{confirmation.professionalName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Data e hora</span>
                <span className="font-medium text-gray-900">{formatDateTimeBR(confirmation.startAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Local</span>
                <span className="font-medium text-gray-900">{confirmation.clinicName}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setStep('service');
                setSelectedService(null);
                setSelectedProfessional(null);
                setNoProfPreference(false);
                setSelectedDate('');
                setSelectedSlot(null);
                setName('');
                setPhone('');
                setConfirmation(null);
                setErrorMsg('');
              }}
              className="mt-6 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              Agendar outro horario
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-lg mx-auto px-4 py-4 text-center">
          <p className="text-xs text-gray-400">
            Powered by <span className="font-semibold text-green-600">SecretarIA</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

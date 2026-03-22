'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/formatters';
import type { Professional } from '@/types';

interface BlockedTime {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdAt: string;
}

type Tab = 'clinic' | 'professional';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const REASON_OPTIONS = ['Feriado', 'Recesso', 'Reforma', 'Evento', 'Ferias', 'Imprevisto', 'Almoco', 'Outro'];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const days: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: true });
  }
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startPad - totalDays + 1);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
  }
  return days;
}

export default function BlockedTimesPage() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [tab, setTab] = useState<Tab>('clinic');
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [professionalId, setProfessionalId] = useState('');

  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  useEffect(() => {
    api.get<Professional[]>('/professionals').then((res) => {
      setProfessionals(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (tab === 'professional' && professionalId) {
      params.set('professionalId', professionalId);
    }
    const res = await api.get<BlockedTime[]>(`/blocked-times?${params.toString()}`);
    setBlockedTimes(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [tab, professionalId]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  // Check if a date is already blocked
  const blockedDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const bt of blockedTimes) {
      const start = new Date(bt.startAt);
      const end = new Date(bt.endAt);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(toDateStr(d));
      }
    }
    return set;
  }, [blockedTimes]);

  function toggleDate(dateStr: string) {
    const next = new Set(selectedDates);
    if (next.has(dateStr)) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
    }
    setSelectedDates(next);
  }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  }

  async function handleBlock() {
    if (selectedDates.size === 0) return;
    setSaving(true);

    const sorted = Array.from(selectedDates).sort();

    // Create one blocked_time per selected date
    for (const dateStr of sorted) {
      const startAt = allDay
        ? `${dateStr}T00:00:00.000Z`
        : `${dateStr}T${startTime}:00.000Z`;
      const endAt = allDay
        ? `${dateStr}T23:59:59.000Z`
        : `${dateStr}T${endTime}:00.000Z`;

      const body: Record<string, unknown> = { startAt, endAt, reason: reason || undefined };
      body.professionalId = tab === 'professional' && professionalId ? professionalId : null;

      const postRes = await api.post('/blocked-times', body);
      if (!postRes.success) {
        toast.error(postRes.error?.message || 'Erro ao bloquear data');
        setSaving(false);
        return;
      }
    }

    toast.success(`${sorted.length} dia${sorted.length > 1 ? 's' : ''} bloqueado${sorted.length > 1 ? 's' : ''} com sucesso`);
    setSaving(false);
    setSelectedDates(new Set());
    setReason('');
    fetchBlocked();
  }

  async function handleDelete(id: string) {
    const res = await api.delete(`/blocked-times/${id}`);
    if (res.success) {
      toast.success('Bloqueio removido com sucesso');
    } else {
      toast.error(res.error?.message || 'Erro ao remover bloqueio');
    }
    fetchBlocked();
  }

  function formatRange(bt: BlockedTime) {
    const start = new Date(bt.startAt);
    const end = new Date(bt.endAt);
    const sameDay = start.toDateString() === end.toDateString();
    const isAllDay = start.getHours() === 0 && end.getHours() === 23;
    if (sameDay && isAllDay) return `${formatDate(bt.startAt)} (dia inteiro)`;
    if (sameDay) return `${formatDate(bt.startAt)} ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    if (isAllDay) return `${formatDate(bt.startAt)} ate ${formatDate(bt.endAt)}`;
    return `${formatDateTime(bt.startAt)} ate ${formatDateTime(bt.endAt)}`;
  }

  const isFuture = (bt: BlockedTime) => new Date(bt.endAt) >= new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bloqueios de Agenda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Selecione os dias no calendario para bloquear agendamentos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => { setTab('clinic'); setSelectedDates(new Set()); }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'clinic' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Empresa (afeta todos)
        </button>
        <button
          onClick={() => { setTab('professional'); setSelectedDates(new Set()); }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'professional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Por Profissional
        </button>
      </div>

      {/* Professional selector */}
      {tab === 'professional' && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Profissional:</label>
          <select
            value={professionalId}
            onChange={(e) => { setProfessionalId(e.target.value); setSelectedDates(new Set()); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Selecione...</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Month nav */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button onClick={prevMonth} className="rounded-md p-2 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
          <button onClick={nextMonth} className="rounded-md p-2 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {monthDays.map((day, i) => {
            const isSelected = selectedDates.has(day.dateStr);
            const isBlocked = blockedDateSet.has(day.dateStr);
            const isToday = day.dateStr === todayStr;
            const isPast = day.date < today && day.dateStr !== todayStr;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!day.isCurrentMonth || isPast || isBlocked) return;
                  toggleDate(day.dateStr);
                }}
                disabled={!day.isCurrentMonth || isPast}
                className={`relative flex flex-col items-center justify-center border-b border-r border-gray-100 py-3 min-h-[56px] transition-colors
                  ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-300 cursor-default' : ''}
                  ${isPast && day.isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                  ${day.isCurrentMonth && !isPast && !isBlocked ? 'hover:bg-gray-50 cursor-pointer' : ''}
                  ${isSelected ? 'bg-red-100 ring-2 ring-inset ring-red-500' : ''}
                  ${isBlocked && !isSelected ? 'bg-red-50' : ''}
                `}
              >
                <span className={`text-sm font-medium rounded-full w-8 h-8 flex items-center justify-center
                  ${isToday ? 'bg-green-600 text-white' : ''}
                  ${isBlocked && !isToday ? 'bg-red-500 text-white' : ''}
                `}>
                  {day.date.getDate()}
                </span>
                {isBlocked && (
                  <span className="text-[9px] text-red-600 font-medium mt-0.5">bloqueado</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-red-500" />
            <span className="text-xs text-gray-500">Bloqueado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-red-100 ring-2 ring-red-500" />
            <span className="text-xs text-gray-500">Selecionado para bloquear</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            <span className="text-xs text-gray-500">Hoje</span>
          </div>
        </div>
      </div>

      {/* Block form (appears when dates selected) */}
      {selectedDates.size > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Bloquear {selectedDates.size} dia{selectedDates.size > 1 ? 's' : ''}
              {tab === 'professional' && professionalId && (
                <span className="font-normal text-gray-600">
                  {' '}para {professionals.find(p => p.id === professionalId)?.name}
                </span>
              )}
            </h3>
            <button
              onClick={() => setSelectedDates(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Limpar selecao
            </button>
          </div>

          {/* Selected dates preview */}
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedDates).sort().map((dateStr) => (
              <span
                key={dateStr}
                onClick={() => toggleDate(dateStr)}
                className="inline-flex items-center gap-1 rounded-full bg-red-200 px-2.5 py-1 text-xs font-medium text-red-800 cursor-pointer hover:bg-red-300 transition-colors"
              >
                {formatDate(dateStr + 'T12:00:00')}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </span>
            ))}
          </div>

          {/* Time toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500" />
            </label>
            <span className="text-sm text-gray-700">Dia inteiro</span>
          </div>

          {!allDay && (
            <div className="flex items-center gap-3">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
              <span className="text-gray-500">ate</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
          )}

          {/* Reason */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {REASON_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(reason === r ? '' : r)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    reason === r ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ou digite um motivo"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleBlock}
              disabled={saving || (tab === 'professional' && !professionalId)}
              className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Bloqueando...' : `Bloquear ${selectedDates.size} dia${selectedDates.size > 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setSelectedDates(new Set())}
              className="rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Existing blocks list */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="font-semibold text-gray-900">
            {tab === 'clinic' ? 'Bloqueios gerais' : 'Bloqueios do profissional'}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-red-600 border-t-transparent" />
          </div>
        ) : blockedTimes.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {tab === 'clinic'
              ? 'Nenhum bloqueio geral cadastrado'
              : professionalId
                ? 'Nenhum bloqueio para este profissional'
                : 'Selecione um profissional acima'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockedTimes.filter(isFuture).map((bt) => (
              <div key={bt.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full bg-red-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{formatRange(bt)}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {bt.reason && (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-red-700">{bt.reason}</span>
                      )}
                      {bt.professionalName && <span>{bt.professionalName}</span>}
                      {!bt.professionalId && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">Toda empresa</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(bt.id)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatTime, formatCurrency } from '@/lib/formatters';
import type { Appointment, Professional } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-yellow-100 text-yellow-800',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmado',
  completed: 'Concluido',
  cancelled: 'Cancelado',
  no_show: 'Nao compareceu',
};

const STATUS_DOT: Record<string, string> = {
  confirmed: 'bg-green-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-yellow-500',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=dom
  const totalDays = lastDay.getDate();

  const days: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

  // Pad start with previous month days
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: true });
  }

  // Pad end to fill grid (6 rows x 7)
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startPad - totalDays + 1);
    days.push({ date: d, dateStr: toDateStr(d), isCurrentMonth: false });
  }

  return days;
}

export default function AgendaPage() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [professionalId, setProfessionalId] = useState('');

  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  // Fetch professionals
  useEffect(() => {
    api.get<Professional[]>('/professionals').then((res) => {
      setProfessionals(Array.isArray(res.data) ? res.data : []);
    });
  }, []);

  // Fetch all appointments for the month (to show dots on calendar)
  const fetchMonthAppointments = useCallback(async () => {
    setLoadingMonth(true);
    const dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const params = new URLSearchParams({ dateFrom, dateTo, limit: '200' });
    if (professionalId) params.set('professionalId', professionalId);

    const res = await api.get<{ data: Appointment[] }>(
      `/appointments?${params.toString()}`
    );
    setMonthAppointments(res.data?.data ?? []);
    setLoadingMonth(false);
  }, [currentYear, currentMonth, professionalId]);

  useEffect(() => {
    fetchMonthAppointments();
  }, [fetchMonthAppointments]);

  // Fetch appointments for selected day
  const fetchDayAppointments = useCallback(async () => {
    setLoadingDay(true);
    const params = new URLSearchParams({ date: selectedDate, limit: '50' });
    if (professionalId) params.set('professionalId', professionalId);

    const res = await api.get<{ data: Appointment[] }>(
      `/appointments?${params.toString()}`
    );
    setDayAppointments(res.data?.data ?? []);
    setLoadingDay(false);
  }, [selectedDate, professionalId]);

  useEffect(() => {
    fetchDayAppointments();
  }, [fetchDayAppointments]);

  // Group month appointments by date for calendar dots
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of monthAppointments) {
      const dateStr = appt.startAt.split('T')[0];
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(appt);
    }
    return map;
  }, [monthAppointments]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(todayStr);
  }

  async function handleAction(id: string, action: 'complete' | 'no-show' | 'cancel') {
    setActionLoading(id);
    await api.patch(`/appointments/${id}/${action}`);
    await Promise.all([fetchDayAppointments(), fetchMonthAppointments()]);
    setActionLoading(null);
  }

  // Format selected date for display
  const selectedDateObj = new Date(selectedDate + 'T12:00:00');
  const selectedDateLabel = selectedDateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize e gerencie seus agendamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Profissional</label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="rounded-md border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={prevMonth} className="rounded-md p-2 hover:bg-muted transition-colors">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToToday} className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
              Hoje
            </button>
          </div>
          <button onClick={nextMonth} className="rounded-md p-2 hover:bg-muted transition-colors">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {monthDays.map((day, i) => {
            const dayAppts = appointmentsByDate.get(day.dateStr) || [];
            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayStr;
            const confirmedCount = dayAppts.filter(a => a.status === 'confirmed').length;
            const completedCount = dayAppts.filter(a => a.status === 'completed').length;
            const cancelledCount = dayAppts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`relative flex flex-col items-center gap-1 border-b border-r border-border px-1 py-2 min-h-[72px] transition-colors
                  ${!day.isCurrentMonth ? 'bg-muted/30 text-muted-foreground/50' : 'hover:bg-muted/50'}
                  ${isSelected ? 'bg-green-50 ring-2 ring-inset ring-green-500' : ''}
                `}
              >
                <span className={`text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center
                  ${isToday && !isSelected ? 'bg-green-600 text-white' : ''}
                  ${isToday && isSelected ? 'bg-green-600 text-white' : ''}
                `}>
                  {day.date.getDate()}
                </span>

                {/* Appointment dots */}
                {dayAppts.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-0.5">
                    {confirmedCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {confirmedCount > 1 && <span className="text-[10px] text-green-700 font-medium">{confirmedCount}</span>}
                      </div>
                    )}
                    {completedCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        {completedCount > 1 && <span className="text-[10px] text-blue-700 font-medium">{completedCount}</span>}
                      </div>
                    )}
                    {cancelledCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {cancelledCount > 1 && <span className="text-[10px] text-red-700 font-medium">{cancelledCount}</span>}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Confirmado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-muted-foreground">Concluido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Cancelado / No-show</span>
          </div>
        </div>
      </div>

      {/* Selected day appointments */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground capitalize">{selectedDateLabel}</h3>
          <p className="text-xs text-muted-foreground">
            {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loadingDay ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : dayAppointments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum agendamento neste dia
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dayAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                {/* Time */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="text-lg font-bold text-foreground">{formatTime(appt.startAt)}</div>
                  <div className="text-[10px] text-muted-foreground">{formatTime(appt.endAt)}</div>
                </div>

                {/* Status bar */}
                <div className={`w-1 h-12 rounded-full ${STATUS_DOT[appt.status] ?? 'bg-gray-300'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {appt.contactName || 'Sem nome'}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[appt.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABEL[appt.status] ?? appt.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {appt.serviceName ?? 'Servico'} &middot; {appt.professionalName ?? 'Profissional'}
                  </div>
                  {appt.contactPhone && (
                    <div className="text-xs text-muted-foreground/70">{appt.contactPhone}</div>
                  )}
                </div>

                {/* Actions */}
                {appt.status === 'confirmed' && (
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => handleAction(appt.id, 'complete')}
                      disabled={actionLoading === appt.id}
                      className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      title="Marcar como concluido"
                    >
                      Concluir
                    </button>
                    <button
                      onClick={() => handleAction(appt.id, 'no-show')}
                      disabled={actionLoading === appt.id}
                      className="rounded-md bg-yellow-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                      title="Nao compareceu"
                    >
                      No-show
                    </button>
                    <button
                      onClick={() => handleAction(appt.id, 'cancel')}
                      disabled={actionLoading === appt.id}
                      className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      title="Cancelar agendamento"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

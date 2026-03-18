'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { formatTime } from '@/lib/formatters';
import type { Appointment, PaginatedResponse } from '@/types';

interface DashboardStats {
  appointmentsToday: number;
  newContacts: number;
  pendingConversations: number;
  nextAppointment: Appointment | null;
}

export default function DashboardPage() {
  const { clinic } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    appointmentsToday: 0,
    newContacts: 0,
    pendingConversations: 0,
    nextAppointment: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [appointmentsRes, contactsRes, conversationsRes, nextRes] = await Promise.all([
        api.get<PaginatedResponse<Appointment>>(`/appointments?date=${today}&status=confirmed`),
        api.get<PaginatedResponse<unknown>>('/contacts?status=new'),
        api.get<PaginatedResponse<unknown>>('/conversations?status=pending_human'),
        api.get<PaginatedResponse<Appointment>>(`/appointments?date=${today}&status=confirmed&limit=1`),
      ]);

      setStats({
        appointmentsToday: appointmentsRes.data?.total ?? 0,
        newContacts: contactsRes.data?.total ?? 0,
        pendingConversations: conversationsRes.data?.total ?? 0,
        nextAppointment: nextRes.data?.data?.[0] ?? null,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Agendamentos Hoje',
      value: stats.appointmentsToday,
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: 'Contatos Novos',
      value: stats.newContacts,
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
    },
    {
      label: 'Conversas Pendentes',
      value: stats.pendingConversations,
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
    },
    {
      label: 'Proximo Horario',
      value: stats.nextAppointment
        ? formatTime(stats.nextAppointment.startAt)
        : '--:--',
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      subtitle: stats.nextAppointment?.contactName ?? undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bem-vindo{clinic?.name ? `, ${clinic.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja o resumo do seu dia
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg bg-white p-6 shadow-sm border border-border"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {card.label}
              </span>
              {card.icon}
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {card.value}
            </p>
            {card.subtitle && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {card.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

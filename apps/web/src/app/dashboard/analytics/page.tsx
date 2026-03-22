'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AnalyticsSummary {
  period: string;
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    confirmed: number;
  };
  contacts: {
    total: number;
  };
  conversations: {
    total: number;
    aiMessages: number;
  };
  nps: {
    average: number | null;
    responses: number;
  };
  rates: {
    noShow: number;
    conversion: number;
    completion: number;
  };
  value: {
    hoursSaved: number;
    revenueRecoveredCents: number;
    preventedNoShows: number;
  };
}

const PLAN_PRICE_CENTS: Record<string, number> = {
  trial: 0,
  essential: 9900,
  professional: 24900,
  business: 49900,
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const res = await api.get<AnalyticsSummary>(`/analytics/summary?period=${period}`);
      if (res.success && res.data) {
        setData(res.data);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Erro ao carregar analytics</p>
      </div>
    );
  }

  // ROI calculation (use essential as default if trial)
  const planCostCents = PLAN_PRICE_CENTS.essential; // R$ 99/mes
  const periodMultiplier = period === '7d' ? 0.25 : period === '90d' ? 3 : 1;
  const periodCostCents = Math.round(planCostCents * periodMultiplier);
  const roiPercent = periodCostCents > 0
    ? Math.round((data.value.revenueRecoveredCents / periodCostCents) * 100)
    : 0;

  const periods = [
    { key: '7d' as const, label: '7 dias' },
    { key: '30d' as const, label: '30 dias' },
    { key: '90d' as const, label: '90 dias' },
  ];

  const bigNumbers = [
    {
      label: 'Agendamentos',
      value: data.appointments.total,
      subtitle: `${data.appointments.completed} concluidos`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: (
        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      label: 'Taxa de No-show',
      value: `${data.rates.noShow}%`,
      subtitle: `${data.appointments.noShow} faltas`,
      color: data.rates.noShow > 20 ? 'text-red-600' : 'text-amber-600',
      bgColor: data.rates.noShow > 20 ? 'bg-red-50' : 'bg-amber-50',
      icon: (
        <svg className={`h-5 w-5 ${data.rates.noShow > 20 ? 'text-red-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      ),
    },
    {
      label: 'Conversao',
      value: `${data.rates.conversion}%`,
      subtitle: `${data.contacts.total} contatos`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: (
        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      ),
    },
    {
      label: 'NPS Medio',
      value: data.nps.average !== null ? data.nps.average.toFixed(1) : '--',
      subtitle: `${data.nps.responses} respostas`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      icon: (
        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    },
  ];

  // Appointment breakdown for bar chart
  const appointmentBreakdown = [
    { label: 'Concluidos', value: data.appointments.completed, color: 'bg-green-500', total: data.appointments.total },
    { label: 'Confirmados', value: data.appointments.confirmed, color: 'bg-blue-500', total: data.appointments.total },
    { label: 'Cancelados', value: data.appointments.cancelled, color: 'bg-red-400', total: data.appointments.total },
    { label: 'No-show', value: data.appointments.noShow, color: 'bg-amber-400', total: data.appointments.total },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Metricas e indicadores do seu negocio
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center rounded-lg border border-border bg-white p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-green-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {bigNumbers.map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-white p-6 shadow-sm border border-border"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {item.label}
              </span>
              <div className={`rounded-lg p-2 ${item.bgColor}`}>
                {item.icon}
              </div>
            </div>
            <p className={`mt-3 text-3xl font-bold ${item.color}`}>
              {item.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Value metrics + ROI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Value metrics */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hours saved */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Horas economizadas pela IA
                </p>
                <p className="mt-2 text-4xl font-bold text-green-600">
                  {data.value.hoursSaved}h
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.conversations.aiMessages} mensagens respondidas automaticamente em {data.conversations.total} conversas
                </p>
              </div>
              <div className="hidden sm:block rounded-full bg-green-50 p-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            {/* Visual bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Mensagens IA</span>
                <span>{data.conversations.aiMessages}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (data.conversations.aiMessages / Math.max(1, data.conversations.aiMessages + 10)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Revenue recovered */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Receita recuperada (estimativa)
                </p>
                <p className="mt-2 text-4xl font-bold text-blue-600">
                  {formatCurrency(data.value.revenueRecoveredCents)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.value.preventedNoShows} no-shows evitados por lembretes automaticos
                </p>
              </div>
              <div className="hidden sm:block rounded-full bg-blue-50 p-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ROI card */}
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-green-600 to-green-700 p-6 shadow-sm text-white">
            <p className="text-sm font-medium text-green-100">
              Retorno sobre Investimento (ROI)
            </p>
            <p className="mt-3 text-5xl font-bold">
              {roiPercent}%
            </p>
            <div className="mt-4 space-y-2 text-sm text-green-100">
              <div className="flex items-center justify-between">
                <span>Custo do plano ({period === '7d' ? '~1 semana' : period === '90d' ? '3 meses' : '1 mes'})</span>
                <span className="font-medium text-white">{formatCurrency(periodCostCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Valor gerado</span>
                <span className="font-medium text-white">{formatCurrency(data.value.revenueRecoveredCents)}</span>
              </div>
              <div className="border-t border-green-500 pt-2 flex items-center justify-between">
                <span>Resultado</span>
                <span className="font-bold text-white">
                  {data.value.revenueRecoveredCents >= periodCostCents ? '+' : ''}
                  {formatCurrency(data.value.revenueRecoveredCents - periodCostCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Appointment breakdown */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Distribuicao de Agendamentos
            </h3>
            <div className="space-y-3">
              {appointmentBreakdown.map((item) => {
                const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Conversations summary */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Resumo de Conversas IA
        </h3>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de conversas</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.conversations.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mensagens da IA</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.conversations.aiMessages}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Novos contatos</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.contacts.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de conclusao</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.rates.completion}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { getToken } from '@/lib/auth';

// ---------- types ----------

interface StatusCount {
  status: string;
  total: number;
}

interface NamedCount {
  professionalId?: string;
  professionalName?: string | null;
  serviceId?: string;
  serviceName?: string | null;
  total: number;
  count?: number;
}

interface DayOfWeekCount {
  dayOfWeek: number;
  total: number;
}

interface HourCount {
  hour: number;
  total: number;
}

interface AppointmentsReport {
  total: number;
  byStatus: StatusCount[];
  byProfessional: NamedCount[];
  byService: NamedCount[];
  byDayOfWeek: DayOfWeekCount[];
  byHour: HourCount[];
}

interface ContactsReport {
  newContacts: number;
  totalContacts: number;
  byStatus: StatusCount[];
  contactsWithAppointment: number;
  conversionRate: number;
}

interface RevenueReport {
  totalRevenue: number;
  completedCount: number;
  lostRevenue: number;
  lostCount: number;
  revenueByProfessional: NamedCount[];
  revenueByService: NamedCount[];
}

// ---------- constants ----------

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  completed: 'Concluido',
  cancelled: 'Cancelado',
  no_show: 'Nao compareceu',
  new: 'Novo',
  active: 'Ativo',
  inactive: 'Inativo',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')
    ? process.env.NEXT_PUBLIC_API_URL
    : 'https://secretaria-api.fly.dev';

type Tab = 'appointments' | 'contacts' | 'revenue';

// ---------- component ----------

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [loading, setLoading] = useState(true);

  const [appointmentsData, setAppointmentsData] = useState<AppointmentsReport | null>(null);
  const [contactsData, setContactsData] = useState<ContactsReport | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = `startDate=${startDate}&endDate=${endDate}`;

    const [apptRes, contRes, revRes] = await Promise.all([
      api.get<AppointmentsReport>(`/reports/appointments?${params}`),
      api.get<ContactsReport>(`/reports/contacts?${params}`),
      api.get<RevenueReport>(`/reports/revenue?${params}`),
    ]);

    setAppointmentsData(apptRes.data ?? null);
    setContactsData(contRes.data ?? null);
    setRevenueData(revRes.data ?? null);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- CSV export ----------

  const handleExportCSV = async (type: 'appointments' | 'contacts') => {
    const token = getToken();
    const endpoint = type === 'appointments' ? 'appointments' : 'contacts';
    const filename = type === 'appointments' ? 'agendamentos.csv' : 'contatos.csv';

    try {
      const res = await fetch(
        `${API_URL}/reports/${endpoint}/csv?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  // ---------- render helpers ----------

  const tabs: { key: Tab; label: string }[] = [
    { key: 'appointments', label: 'Agendamentos' },
    { key: 'contacts', label: 'Contatos' },
    { key: 'revenue', label: 'Faturamento' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe as metricas do seu negocio
        </p>
      </div>

      {/* Date range + export */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={() => handleExportCSV(activeTab === 'contacts' ? 'contacts' : 'appointments')}
          className="inline-flex items-center gap-2 rounded-md bg-white border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'appointments' && appointmentsData && (
            <AppointmentsTab data={appointmentsData} />
          )}
          {activeTab === 'contacts' && contactsData && (
            <ContactsTab data={contactsData} />
          )}
          {activeTab === 'revenue' && revenueData && (
            <RevenueTab data={revenueData} />
          )}
        </>
      )}
    </div>
  );
}

// ---------- Tab components ----------

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm border border-border">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para o periodo</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AppointmentsTab({ data }: { data: AppointmentsReport }) {
  const confirmed = data.byStatus.find((s) => s.status === 'confirmed')?.total ?? 0;
  const completed = data.byStatus.find((s) => s.status === 'completed')?.total ?? 0;
  const cancelled = data.byStatus.find((s) => s.status === 'cancelled')?.total ?? 0;
  const noShow = data.byStatus.find((s) => s.status === 'no_show')?.total ?? 0;
  const noShowRate = data.total > 0 ? Math.round((noShow / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total" value={data.total} />
        <MetricCard label="Confirmados" value={confirmed} />
        <MetricCard label="Concluidos" value={completed} />
        <MetricCard label="Cancelados" value={cancelled} />
        <MetricCard label="Nao compareceu" value={noShow} subtitle={`${noShowRate}% no-show`} />
      </div>

      {/* Por profissional */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Por Profissional</h3>
        <SimpleTable
          headers={['Profissional', 'Total']}
          rows={data.byProfessional.map((p) => [p.professionalName || 'Sem nome', p.total])}
        />
      </div>

      {/* Por servico */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Por Servico</h3>
        <SimpleTable
          headers={['Servico', 'Total']}
          rows={data.byService.map((s) => [s.serviceName || 'Sem nome', s.total])}
        />
      </div>

      {/* Por dia da semana */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Por Dia da Semana</h3>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, idx) => {
            const count = data.byDayOfWeek.find((d) => d.dayOfWeek === idx)?.total ?? 0;
            return (
              <div key={idx} className="flex flex-col items-center rounded-lg bg-white border border-border p-3 min-w-[60px] shadow-sm">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-lg font-bold text-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horarios de pico */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Horarios de Pico</h3>
        <SimpleTable
          headers={['Horario', 'Agendamentos']}
          rows={data.byHour
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
            .map((h) => [`${String(h.hour).padStart(2, '0')}:00`, h.total])}
        />
      </div>
    </div>
  );
}

function ContactsTab({ data }: { data: ContactsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Novos no Periodo" value={data.newContacts} />
        <MetricCard label="Total de Contatos" value={data.totalContacts} />
        <MetricCard label="Com Agendamento" value={data.contactsWithAppointment} />
        <MetricCard
          label="Taxa de Conversao"
          value={`${data.conversionRate}%`}
          subtitle="Contatos que agendaram"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Por Status</h3>
        <SimpleTable
          headers={['Status', 'Total']}
          rows={data.byStatus.map((s) => [STATUS_LABELS[s.status] || s.status, s.total])}
        />
      </div>
    </div>
  );
}

function RevenueTab({ data }: { data: RevenueReport }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Faturamento" value={formatCurrency(data.totalRevenue)} subtitle={`${data.completedCount} atendimentos`} />
        <MetricCard label="Ticket Medio" value={formatCurrency(data.completedCount > 0 ? Math.round(data.totalRevenue / data.completedCount) : 0)} />
        <MetricCard label="Receita Perdida" value={formatCurrency(data.lostRevenue)} subtitle={`${data.lostCount} cancelados/no-show`} />
        <MetricCard
          label="Taxa de Perda"
          value={`${data.completedCount + data.lostCount > 0 ? Math.round((data.lostCount / (data.completedCount + data.lostCount)) * 100) : 0}%`}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Faturamento por Profissional</h3>
        <SimpleTable
          headers={['Profissional', 'Atendimentos', 'Faturamento']}
          rows={data.revenueByProfessional.map((p) => [
            p.professionalName || 'Sem nome',
            p.count ?? 0,
            formatCurrency(p.total),
          ])}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Faturamento por Servico</h3>
        <SimpleTable
          headers={['Servico', 'Atendimentos', 'Faturamento']}
          rows={data.revenueByService.map((s) => [
            s.serviceName || 'Sem nome',
            s.count ?? 0,
            formatCurrency(s.total),
          ])}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_DATA = {
  todayAppointments: 8,
  newContacts: 12,
  pendingConversations: 3,
  completionRate: 87,
  recentAppointments: [
    { id: '1', clientName: 'Maria Silva', service: 'Corte Feminino', professional: 'Ana', time: '10:00', status: 'confirmed' as const },
    { id: '2', clientName: 'Joao Santos', service: 'Barba', professional: 'Carlos', time: '10:30', status: 'confirmed' as const },
    { id: '3', clientName: 'Pedro Lima', service: 'Corte + Barba', professional: 'Ze', time: '11:00', status: 'confirmed' as const },
    { id: '4', clientName: 'Ana Costa', service: 'Coloracao', professional: 'Maria', time: '14:00', status: 'confirmed' as const },
    { id: '5', clientName: 'Lucas Oliveira', service: 'Hidratacao', professional: 'Ana', time: '15:00', status: 'completed' as const },
  ],
  conversations: [
    { name: 'Fernanda R.', lastMsg: 'Quero agendar um corte pra sabado', time: '2 min', status: 'active' as const },
    { name: 'Ricardo M.', lastMsg: 'Quanto custa coloracao?', time: '15 min', status: 'active' as const },
    { name: 'Camila S.', lastMsg: 'Obrigada! Ate sabado', time: '1h', status: 'closed' as const },
  ],
};

const statusLabels: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Concluido', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
  no_show: { label: 'Faltou', className: 'bg-yellow-100 text-yellow-700' },
};

const convStatusLabels: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Encerrada', className: 'bg-gray-100 text-gray-500' },
};

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'conversations'>('appointments');

  const cards = [
    {
      label: 'Agendamentos Hoje',
      value: DEMO_DATA.todayAppointments,
      icon: (
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
      color: 'text-green-600',
    },
    {
      label: 'Contatos Novos',
      value: DEMO_DATA.newContacts,
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
      color: 'text-blue-600',
    },
    {
      label: 'Conversas Pendentes',
      value: DEMO_DATA.pendingConversations,
      icon: (
        <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
      color: 'text-amber-600',
    },
    {
      label: 'Taxa de Conclusao',
      value: `${DEMO_DATA.completionRate}%`,
      icon: (
        <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner de demonstracao */}
      <div className="bg-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-md bg-blue-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                Demo
              </span>
              <p className="text-sm font-medium">
                Modo Demonstracao — Dados ficticios para visualizacao
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 transition-colors"
            >
              Comece seu teste gratis
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SecretarIA</h1>
            <p className="text-sm text-gray-500">Painel do estabelecimento</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg bg-white p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {card.label}
                </span>
                {card.icon}
              </div>
              <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Appointments table - 2 cols */}
          <div className="lg:col-span-2 rounded-lg bg-white shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 pt-4">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'appointments'
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Agendamentos de Hoje
                </button>
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors lg:hidden ${
                    activeTab === 'conversations'
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Conversas
                </button>
              </div>
            </div>

            {activeTab === 'appointments' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Servico
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Profissional
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {DEMO_DATA.recentAppointments.map((appt) => {
                      const statusInfo = statusLabels[appt.status];
                      return (
                        <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {appt.time}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {appt.clientName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                            {appt.service}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                            {appt.professional}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile conversations tab */}
            {activeTab === 'conversations' && (
              <div className="p-4 space-y-3 lg:hidden">
                {DEMO_DATA.conversations.map((conv, i) => {
                  const convStatus = convStatusLabels[conv.status];
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-700">
                          {conv.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{conv.name}</p>
                          <span className="text-xs text-gray-400">{conv.time}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500 truncate">{conv.lastMsg}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${convStatus.className}`}>
                        {convStatus.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversations sidebar - 1 col (desktop) */}
          <div className="hidden lg:block rounded-lg bg-white shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Conversas Recentes</h3>
            </div>
            <div className="p-4 space-y-3">
              {DEMO_DATA.conversations.map((conv, i) => {
                const convStatus = convStatusLabels[conv.status];
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-green-700">
                        {conv.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{conv.name}</p>
                        <span className="text-xs text-gray-400">{conv.time}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500 truncate">{conv.lastMsg}</p>
                      <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${convStatus.className}`}>
                        {convStatus.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA card inside sidebar */}
            <div className="border-t border-gray-200 p-4">
              <div className="rounded-lg bg-green-50 p-4">
                <h4 className="text-sm font-semibold text-green-800">
                  Gostou do que viu?
                </h4>
                <p className="mt-1 text-xs text-green-700">
                  A IA atende seus clientes no WhatsApp enquanto voce descansa. Teste gratis por 7 dias.
                </p>
                <Link
                  href="/register"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Criar conta gratis
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA (mobile) */}
        <div className="mt-8 rounded-lg bg-green-50 border border-green-200 p-6 text-center lg:hidden">
          <h3 className="text-lg font-semibold text-green-800">
            Gostou do que viu?
          </h3>
          <p className="mt-2 text-sm text-green-700">
            A IA atende seus clientes no WhatsApp enquanto voce descansa. Teste gratis por 7 dias, sem cartao.
          </p>
          <Link
            href="/register"
            className="mt-4 inline-flex items-center rounded-md bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Comece seu teste gratis
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

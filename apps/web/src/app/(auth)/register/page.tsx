'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setToken, setRefreshToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

const SEGMENTS = [
  { value: 'clinica', label: 'Clinica' },
  { value: 'salao', label: 'Salao de Beleza' },
  { value: 'barbearia', label: 'Barbearia' },
  { value: 'academia', label: 'Academia' },
  { value: 'petshop', label: 'Petshop' },
  { value: 'veterinaria', label: 'Veterinaria' },
  { value: 'outro', label: 'Outro' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [segment, setSegment] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await api.post<{ token: string; refreshToken: string; user: any; clinic: any }>('/auth/register', {
      name,
      email,
      password,
      clinicName,
      segment,
      ...(phone ? { phone } : {}),
    });

    if (res.success && res.data) {
      setToken(res.data.token);
      if (res.data.refreshToken) setRefreshToken(res.data.refreshToken);
      setAuth(res.data.user, res.data.clinic);
      router.replace('/dashboard');
    } else {
      setError(res.error?.message || 'Erro ao criar conta. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
          <p className="mt-1 text-sm text-gray-500">Teste gratis por 7 dias, sem cartao</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Seu nome
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome do estabelecimento
            </label>
            <input
              id="clinicName"
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Ex: Studio Maria Hair"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="segment" className="block text-sm font-medium text-gray-700 mb-1.5">
              Segmento
            </label>
            <select
              id="segment"
              required
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="" disabled>
                Selecione o segmento
              </option>
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Telefone{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Criando conta...' : 'Criar conta gratis'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Ja tem conta?{' '}
            <Link href="/login" className="font-medium text-green-600 hover:text-green-700">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

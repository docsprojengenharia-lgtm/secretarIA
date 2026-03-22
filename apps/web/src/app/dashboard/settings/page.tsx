'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Clinic, ClinicSettings, WhatsAppStatus, WhatsAppQr, Channel } from '@/types';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
      <ClinicDataSection />
      <BotConfigSection />
      <WhatsAppSection />
      <ChannelsSection />
      <TemplatesSection />
    </div>
  );
}

// =============================================================================
// SECAO 1: Dados da Clinica
// =============================================================================

function ClinicDataSection() {
  const { clinic, setAuth, user } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchClinic = useCallback(async () => {
    const res = await api.get<Clinic>('/clinics/me');
    if (res.success && res.data) {
      const c = res.data;
      setForm({
        name: c.name || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClinic();
  }, [fetchClinic]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const body = {
      name: form.name.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
    };

    const res = await api.put<Clinic>('/clinics/me', body);
    setSaving(false);

    if (res.success && res.data) {
      toast.success('Dados da clinica salvos com sucesso');
      setMessage('Dados salvos com sucesso');
      // Update auth store with fresh clinic data
      if (user) {
        setAuth(user, res.data);
      }
      setTimeout(() => setMessage(''), 3000);
    } else {
      toast.error(res.error?.message || 'Erro ao salvar dados da clinica');
      setError(res.error?.message || 'Erro ao salvar');
    }
  }

  if (loading) {
    return <SectionSkeleton title="Dados da Clinica" />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Dados da Clinica</h2>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
              placeholder="clinica@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input
              type="text"
              value={form.state}
              maxLength={2}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              placeholder="SP"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Rua, numero, bairro..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

// =============================================================================
// SECAO 2: Configuracao do Bot
// =============================================================================

function BotConfigSection() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [aiAlwaysOn, setAiAlwaysOn] = useState(false);
  const [aiStartTime, setAiStartTime] = useState('18:01');
  const [aiEndTime, setAiEndTime] = useState('07:59');
  const [aiEnabledDays, setAiEnabledDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [minAdvanceHours, setMinAdvanceHours] = useState(2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoBook, setAutoBook] = useState(true);

  const fetchSettings = useCallback(async () => {
    const res = await api.get<ClinicSettings>('/clinics/me/settings');
    if (res.success && res.data) {
      const s = res.data;
      setSettings(s);
      setAiAlwaysOn(s.aiAlwaysOn);
      setAiStartTime(s.aiStartTime);
      setAiEndTime(s.aiEndTime);
      setAiEnabledDays(s.aiEnabledDays);
      setMinAdvanceHours(s.minAdvanceHours);
      setMaxAdvanceDays(s.maxAdvanceDays);
      setWelcomeMessage(s.welcomeMessage || '');
      setAutoBook(s.autoBook ?? true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function toggleEnabledDay(day: number) {
    setAiEnabledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const body = {
      aiAlwaysOn,
      aiStartTime,
      aiEndTime,
      aiEnabledDays,
      minAdvanceHours,
      maxAdvanceDays,
      welcomeMessage: welcomeMessage.trim() || null,
      autoBook,
    };

    const res = await api.put<ClinicSettings>('/clinics/me/settings', body);
    setSaving(false);

    if (res.success) {
      toast.success('Configuracoes do bot salvas com sucesso');
      setMessage('Configuracoes salvas com sucesso');
      setTimeout(() => setMessage(''), 3000);
    } else {
      toast.error(res.error?.message || 'Erro ao salvar configuracoes');
      setError(res.error?.message || 'Erro ao salvar');
    }
  }

  if (loading) {
    return <SectionSkeleton title="Configuracao do Bot" />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Configuracao do Bot</h2>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        {/* AI Always On */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiAlwaysOn}
              onChange={(e) => setAiAlwaysOn(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
          </label>
          <span className="text-sm font-medium text-gray-700">IA ativa 24h</span>
        </div>

        {/* Auto Book Toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoBook}
              onChange={(e) => setAutoBook(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
          </label>
          <div>
            <span className="text-sm font-medium text-gray-700">Agendamento automatico</span>
            <p className="text-xs text-gray-500">
              {autoBook
                ? 'Ligado: IA agenda direto na sua agenda (ideal se nao tem outro sistema)'
                : 'Desligado: IA captura o pedido e envia pra voce aprovar antes de confirmar'}
            </p>
          </div>
        </div>

        {/* Time range (disabled when always on) */}
        {!aiAlwaysOn && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horario da IA</label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={aiStartTime}
                onChange={(e) => setAiStartTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
              />
              <span className="text-sm text-gray-500">ate</span>
              <input
                type="time"
                value={aiEndTime}
                onChange={(e) => setAiEndTime(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Enabled days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dias ativos</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleEnabledDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  aiEnabledDays.includes(day)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduling options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antecedencia minima (horas)
            </label>
            <input
              type="number"
              min="0"
              value={minAdvanceHours}
              onChange={(e) => setMinAdvanceHours(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agendamento ate (dias)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value, 10) || 30)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
          </div>
        </div>

        {/* Welcome message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensagem de boas-vindas
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
            placeholder="Ola! Bem-vindo(a). Como posso ajudar?"
          />
          <p className="text-xs text-gray-400 mt-1">
            Deixe vazio para usar a mensagem padrao.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Configuracoes'}
        </button>
      </form>
    </div>
  );
}

// =============================================================================
// SECAO 3: WhatsApp
// =============================================================================

function WhatsAppSection() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<WhatsAppQr | null>(null);
  const [error, setError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await api.get<WhatsAppStatus>('/whatsapp/status');
    if (res.success && res.data) {
      setStatus(res.data);

      // If connected while showing QR, stop polling and hide QR
      if (res.data.connected && showQr) {
        setShowQr(false);
        setQrData(null);
        stopPolling();
      }
    }
    setLoading(false);
  }, [showQr]);

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, []);

  function startPolling() {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const res = await api.get<WhatsAppStatus>('/whatsapp/status');
      if (res.success && res.data) {
        setStatus(res.data);
        if (res.data.connected) {
          setShowQr(false);
          setQrData(null);
          stopPolling();
        }
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function handleSetup() {
    setSettingUp(true);
    setError('');

    const res = await api.post('/whatsapp/setup');
    if (res.success) {
      toast.success('WhatsApp configurado, escaneie o QR code');
      // Fetch QR code
      await fetchQr();
    } else {
      toast.error(res.error?.message || 'Erro ao configurar WhatsApp');
      setError(res.error?.message || 'Erro ao configurar WhatsApp');
    }
    setSettingUp(false);
  }

  async function fetchQr() {
    const res = await api.get<WhatsAppQr>('/whatsapp/qr');
    if (res.success && res.data) {
      setQrData(res.data);
      setShowQr(true);
      startPolling();
    } else {
      setError(res.error?.message || 'Erro ao obter QR code');
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    setDisconnecting(true);
    setError('');

    const res = await api.post('/whatsapp/disconnect');
    if (res.success) {
      toast.success('WhatsApp desconectado');
      setStatus({ connected: false, status: 'disconnected' });
    } else {
      toast.error(res.error?.message || 'Erro ao desconectar WhatsApp');
      setError(res.error?.message || 'Erro ao desconectar');
    }
    setDisconnecting(false);
  }

  if (loading) {
    return <SectionSkeleton title="WhatsApp" />;
  }

  const isConnected = status?.connected === true;
  const isNotSetup = status?.status === 'not_setup';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">WhatsApp</h2>
      </div>
      <div className="p-6 space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Conectado
            </span>
          ) : isNotSetup ? (
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm font-medium">
              Nao configurado
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
              Desconectado
            </span>
          )}
        </div>

        {/* Actions */}
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {disconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        ) : isNotSetup ? (
          <button
            onClick={handleSetup}
            disabled={settingUp}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {settingUp ? 'Configurando...' : 'Configurar WhatsApp'}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={fetchQr}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Reconectar (QR Code)
            </button>
            <button
              onClick={handleSetup}
              disabled={settingUp}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {settingUp ? 'Recriando...' : 'Recriar Instancia'}
            </button>
          </div>
        )}

        {/* QR Code Display */}
        {showQr && qrData && (
          <div className="border border-gray-200 rounded-lg p-6 text-center bg-gray-50">
            <p className="text-sm text-gray-600 mb-4">
              Escaneie o QR code com o WhatsApp do seu celular
            </p>
            {qrData.base64 ? (
              <div className="inline-block bg-white p-4 rounded-lg shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64"
                />
              </div>
            ) : qrData.pairingCode ? (
              <div className="inline-block bg-white px-6 py-4 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-2">Codigo de pareamento:</p>
                <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">
                  {qrData.pairingCode}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aguardando QR code...</p>
            )}
            <p className="text-xs text-gray-400 mt-4">
              O status sera verificado automaticamente a cada 5 segundos.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

// =============================================================================
// SECAO 4: Canais de Atendimento
// =============================================================================

const CHANNEL_CONFIG = [
  {
    type: 'whatsapp' as const,
    label: 'WhatsApp',
    description: 'Atendimento via WhatsApp (Evolution API)',
    color: 'green',
    managed: true, // Gerenciado pela secao WhatsApp acima
  },
  {
    type: 'instagram' as const,
    label: 'Instagram DM',
    description: 'Receba e responda mensagens do Instagram Direct',
    color: 'pink',
    managed: false,
  },
  {
    type: 'telegram' as const,
    label: 'Telegram',
    description: 'Atendimento via bot do Telegram (em breve)',
    color: 'blue',
    managed: false,
    comingSoon: true,
  },
];

function ChannelsSection() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [togglingType, setTogglingType] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    const [channelsRes, wpRes] = await Promise.all([
      api.get<Channel[]>('/channels'),
      api.get<WhatsAppStatus>('/whatsapp/status'),
    ]);

    if (channelsRes.success && channelsRes.data) {
      setChannels(channelsRes.data);
    }
    if (wpRes.success && wpRes.data) {
      setWhatsappStatus(wpRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  function getChannelData(type: string): Channel | undefined {
    return channels.find((ch) => ch.type === type);
  }

  function getStatusForType(type: string): { label: string; color: string } {
    if (type === 'whatsapp') {
      if (whatsappStatus?.connected) return { label: 'Conectado', color: 'green' };
      if (whatsappStatus?.status === 'not_setup') return { label: 'Nao configurado', color: 'gray' };
      return { label: 'Desconectado', color: 'yellow' };
    }

    const ch = getChannelData(type);
    if (!ch) return { label: 'Nao configurado', color: 'gray' };
    if (ch.enabled && ch.status === 'connected') return { label: 'Conectado', color: 'green' };
    if (ch.enabled) return { label: 'Ativado', color: 'yellow' };
    return { label: 'Desativado', color: 'gray' };
  }

  async function handleToggle(type: string, config: typeof CHANNEL_CONFIG[0]) {
    if (config.managed || config.comingSoon) return;

    setTogglingType(type);
    const existing = getChannelData(type);
    const newEnabled = !existing?.enabled;

    const res = await api.put<Channel>(`/channels/${type}`, {
      name: config.label,
      config: existing?.config || {},
      enabled: newEnabled,
    });

    if (res.success && res.data) {
      setChannels((prev) => {
        const idx = prev.findIndex((ch) => ch.type === type);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.data!;
          return updated;
        }
        return [...prev, res.data!];
      });
      toast.success(newEnabled ? `${config.label} ativado` : `${config.label} desativado`);
    } else {
      toast.error(res.error?.message || `Erro ao alterar ${config.label}`);
    }
    setTogglingType(null);
  }

  if (loading) {
    return <SectionSkeleton title="Canais de Atendimento" />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Canais de Atendimento</h2>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie os canais por onde seus clientes entram em contato
        </p>
      </div>
      <div className="p-6 space-y-4">
        {CHANNEL_CONFIG.map((config) => {
          const status = getStatusForType(config.type);
          const ch = getChannelData(config.type);
          const isEnabled = config.type === 'whatsapp'
            ? whatsappStatus?.connected === true
            : ch?.enabled === true;

          const statusBgMap: Record<string, string> = {
            green: 'bg-green-100 text-green-700',
            yellow: 'bg-yellow-100 text-yellow-700',
            gray: 'bg-gray-100 text-gray-500',
          };

          const dotBgMap: Record<string, string> = {
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            gray: 'bg-gray-400',
          };

          return (
            <div
              key={config.type}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                config.comingSoon ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Channel icon placeholder */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                  config.color === 'green' ? 'bg-green-500'
                    : config.color === 'pink' ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-blue-500'
                }`}>
                  {config.type === 'whatsapp' ? 'W' : config.type === 'instagram' ? 'IG' : 'TG'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{config.label}</span>
                    {config.comingSoon && (
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Em breve</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusBgMap[status.color]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotBgMap[status.color]} ${status.color === 'green' ? 'animate-pulse' : ''}`} />
                  {status.label}
                </span>

                {/* Toggle (not for WhatsApp — managed separately, not for coming soon) */}
                {!config.managed && !config.comingSoon && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggle(config.type, config)}
                      disabled={togglingType === config.type}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50" />
                  </label>
                )}

                {config.managed && (
                  <span className="text-xs text-gray-400">Gerenciado acima</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Instagram setup instructions (shown when enabled but not connected) */}
        {(() => {
          const igChannel = getChannelData('instagram');
          if (!igChannel?.enabled) return null;

          return (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">Configurar Instagram DM</h3>
              <ol className="text-xs text-purple-700 space-y-1.5 list-decimal list-inside">
                <li>Crie um App no <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Meta for Developers</a></li>
                <li>Ative o produto &quot;Instagram&quot; e configure as permissoes de mensagem</li>
                <li>Configure o webhook URL: <code className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-800">{typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : ''}/instagram/webhook</code></li>
                <li>Defina o token de verificacao na variavel <code className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-800">INSTAGRAM_VERIFY_TOKEN</code></li>
                <li>Assine os eventos de &quot;messages&quot; no painel do Meta</li>
              </ol>
              <p className="text-xs text-purple-500 mt-3">
                O processamento completo de mensagens do Instagram sera implementado em breve. Por enquanto, as mensagens serao recebidas e registradas.
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// =============================================================================
// SECAO: Templates de Mensagem
// =============================================================================

interface TemplateItem {
  eventType: string;
  label: string;
  content: string;
  isActive: boolean;
  isCustomized: boolean;
  id: string | null;
}

const TEMPLATE_VARIABLES = [
  { key: '{nome}', desc: 'Nome do cliente' },
  { key: '{servico}', desc: 'Nome do servico' },
  { key: '{data}', desc: 'Data do agendamento' },
  { key: '{hora}', desc: 'Horario do agendamento' },
  { key: '{profissional}', desc: 'Nome do profissional' },
  { key: '{clinica}', desc: 'Nome do estabelecimento' },
];

function TemplatesSection() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchTemplates = useCallback(async () => {
    const res = await api.get<TemplateItem[]>('/templates');
    if (res.success && res.data) {
      setTemplates(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function startEdit(t: TemplateItem) {
    setEditingKey(t.eventType);
    setEditContent(t.content);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditContent('');
  }

  async function saveTemplate(eventType: string) {
    setSavingKey(eventType);
    const res = await api.put<TemplateItem>(`/templates/${eventType}`, { content: editContent });
    setSavingKey(null);

    if (res.success && res.data) {
      setTemplates((prev) => prev.map((t) => t.eventType === eventType ? res.data! : t));
      setEditingKey(null);
      setEditContent('');
      toast.success('Template salvo com sucesso');
    } else {
      toast.error(res.error?.message || 'Erro ao salvar template');
    }
  }

  async function resetTemplate(eventType: string) {
    if (!window.confirm('Restaurar o template padrao? Sua personalizacao sera perdida.')) return;
    setSavingKey(eventType);
    const res = await api.delete<TemplateItem>(`/templates/${eventType}`);
    setSavingKey(null);

    if (res.success && res.data) {
      setTemplates((prev) => prev.map((t) => t.eventType === eventType ? res.data! : t));
      setEditingKey(null);
      toast.success('Template restaurado ao padrao');
    } else {
      toast.error(res.error?.message || 'Erro ao restaurar template');
    }
  }

  if (loading) {
    return <SectionSkeleton title="Templates de Mensagem" />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Templates de Mensagem</h2>
        <p className="text-sm text-gray-500 mt-1">Personalize as mensagens enviadas automaticamente aos seus clientes.</p>
      </div>
      <div className="p-6 space-y-4">
        {/* Variable hints */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-1.5">Variaveis disponiveis:</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <span key={v.key} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded px-2 py-1">
                <code className="font-mono text-green-600 font-medium">{v.key}</code>
                <span className="text-gray-400">= {v.desc}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Templates list */}
        {templates.map((t) => {
          const isEditing = editingKey === t.eventType;
          const isSaving = savingKey === t.eventType;

          return (
            <div key={t.eventType} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{t.label}</h3>
                  {t.isCustomized && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Personalizado</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Editar
                    </button>
                  ) : (
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                  {t.isCustomized && !isEditing && (
                    <button
                      onClick={() => resetTemplate(t.eventType)}
                      disabled={isSaving}
                      className="text-xs text-gray-400 hover:text-red-500 font-medium disabled:opacity-50"
                    >
                      Restaurar padrao
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none text-sm text-gray-900"
                    />
                    <button
                      onClick={() => saveTemplate(t.eventType)}
                      disabled={isSaving || !editContent.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.content}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Skeleton loader for sections
// =============================================================================

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

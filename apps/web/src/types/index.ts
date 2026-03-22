export interface User {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'owner' | 'admin' | 'secretary';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  segment: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  plan: 'trial' | 'essential' | 'professional' | 'business';
  trialEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Professional {
  id: string;
  clinicId: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  priceInCents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  clinicId: string;
  name: string | null;
  phone: string;
  email: string | null;
  status: 'new' | 'active' | 'inactive';
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  professionalId: string;
  professionalName: string | null;
  serviceId: string;
  serviceName: string | null;
  startAt: string;
  endAt: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancelledAt: string | null;
  cancelReason: string | null;
  source: 'ai' | 'dashboard' | 'manual' | 'ligacao' | 'instagram' | 'presencial' | 'outro' | 'booking_page';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  clinicId: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  status: 'active' | 'pending_human' | 'closed';
  channel: string;
  startedAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  clinicId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl: string | null;
  intent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ClinicSettings {
  id: string;
  clinicId: string;
  aiStartTime: string;
  aiEndTime: string;
  aiEnabledDays: number[];
  aiAlwaysOn: boolean;
  aiManualOverride: boolean;
  timezone: string;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
  autoBook: boolean;
}

export interface WorkingHour {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface LinkedService {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string | null;
  durationMinutes: number;
  priceInCents: number;
}

export interface WhatsAppStatus {
  connected: boolean;
  status: string;
}

export interface WhatsAppQr {
  base64?: string;
  pairingCode?: string;
}

export interface Channel {
  id: string;
  clinicId: string;
  type: 'whatsapp' | 'instagram' | 'telegram';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  updatedAt: string | null;
}

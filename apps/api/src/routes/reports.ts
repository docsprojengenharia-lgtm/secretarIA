import { Hono } from 'hono';
import { db } from '@secretaria/db';
import { appointments, contacts, services, professionals } from '@secretaria/db';
import { sql, eq, and, gte, lte, isNull } from 'drizzle-orm';
import { success } from '../lib/response.js';

const router = new Hono();

// ---------- helpers ----------

function parseDateRange(c: { req: { query: (k: string) => string | undefined } }) {
  const startDate = c.req.query('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const endDate = c.req.query('endDate') || new Date().toISOString().slice(0, 10);
  const start = new Date(startDate + 'T00:00:00-03:00');
  const end = new Date(endDate + 'T23:59:59-03:00');
  return { start, end, startDate, endDate };
}

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ---------- GET /reports/appointments ----------
router.get('/appointments', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const { start, end } = parseDateRange(c);

  const baseConditions = [
    eq(appointments.clinicId, clinicId),
    isNull(appointments.deletedAt),
    gte(appointments.startAt, start),
    lte(appointments.startAt, end),
  ];

  // Total por status
  const byStatus = await db
    .select({
      status: appointments.status,
      total: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(and(...baseConditions))
    .groupBy(appointments.status);

  // Total por profissional
  const byProfessional = await db
    .select({
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      total: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(...baseConditions))
    .groupBy(appointments.professionalId, professionals.name);

  // Total por servico
  const byService = await db
    .select({
      serviceId: appointments.serviceId,
      serviceName: services.name,
      total: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(...baseConditions))
    .groupBy(appointments.serviceId, services.name);

  // Por dia da semana (0=dom, 6=sab)
  const byDayOfWeek = await db
    .select({
      dayOfWeek: sql<number>`extract(dow from ${appointments.startAt})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(and(...baseConditions))
    .groupBy(sql`extract(dow from ${appointments.startAt})`);

  // Horarios de pico (hora)
  const byHour = await db
    .select({
      hour: sql<number>`extract(hour from ${appointments.startAt} at time zone 'America/Sao_Paulo')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .where(and(...baseConditions))
    .groupBy(sql`extract(hour from ${appointments.startAt} at time zone 'America/Sao_Paulo')`)
    .orderBy(sql`extract(hour from ${appointments.startAt} at time zone 'America/Sao_Paulo')`);

  // Total geral
  const totalAll = byStatus.reduce((sum, r) => sum + r.total, 0);

  return success(c, {
    total: totalAll,
    byStatus,
    byProfessional,
    byService,
    byDayOfWeek,
    byHour,
  });
});

// ---------- GET /reports/contacts ----------
router.get('/contacts', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const { start, end } = parseDateRange(c);

  // Novos contatos no periodo
  const [newContacts] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(
      eq(contacts.clinicId, clinicId),
      isNull(contacts.deletedAt),
      gte(contacts.createdAt, start),
      lte(contacts.createdAt, end),
    ));

  // Ativos vs inativos (geral)
  const byStatus = await db
    .select({
      status: contacts.status,
      total: sql<number>`count(*)::int`,
    })
    .from(contacts)
    .where(and(
      eq(contacts.clinicId, clinicId),
      isNull(contacts.deletedAt),
    ))
    .groupBy(contacts.status);

  // Total de contatos
  const [totalContacts] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contacts)
    .where(and(
      eq(contacts.clinicId, clinicId),
      isNull(contacts.deletedAt),
    ));

  // Taxa de conversao (contatos que viraram agendamentos no periodo)
  const [contactsWithAppointment] = await db
    .select({
      total: sql<number>`count(distinct ${appointments.contactId})::int`,
    })
    .from(appointments)
    .where(and(
      eq(appointments.clinicId, clinicId),
      isNull(appointments.deletedAt),
      gte(appointments.startAt, start),
      lte(appointments.startAt, end),
    ));

  const conversionRate = newContacts.total > 0
    ? Math.round((contactsWithAppointment.total / newContacts.total) * 100)
    : 0;

  return success(c, {
    newContacts: newContacts.total,
    totalContacts: totalContacts.total,
    byStatus,
    contactsWithAppointment: contactsWithAppointment.total,
    conversionRate,
  });
});

// ---------- GET /reports/revenue ----------
router.get('/revenue', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const { start, end } = parseDateRange(c);

  const completedConditions = [
    eq(appointments.clinicId, clinicId),
    isNull(appointments.deletedAt),
    gte(appointments.startAt, start),
    lte(appointments.startAt, end),
    eq(appointments.status, 'completed'),
  ];

  // Faturamento total (completed)
  const [totalRevenue] = await db
    .select({
      total: sql<number>`coalesce(sum(${services.priceInCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(...completedConditions));

  // Faturamento por profissional
  const revenueByProfessional = await db
    .select({
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      total: sql<number>`coalesce(sum(${services.priceInCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(...completedConditions))
    .groupBy(appointments.professionalId, professionals.name);

  // Faturamento por servico
  const revenueByService = await db
    .select({
      serviceId: appointments.serviceId,
      serviceName: services.name,
      total: sql<number>`coalesce(sum(${services.priceInCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(...completedConditions))
    .groupBy(appointments.serviceId, services.name);

  // Receita perdida (cancelled + no_show)
  const [lostRevenue] = await db
    .select({
      total: sql<number>`coalesce(sum(${services.priceInCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      eq(appointments.clinicId, clinicId),
      isNull(appointments.deletedAt),
      gte(appointments.startAt, start),
      lte(appointments.startAt, end),
      sql`${appointments.status} IN ('cancelled', 'no_show')`,
    ));

  return success(c, {
    totalRevenue: totalRevenue.total,
    completedCount: totalRevenue.count,
    lostRevenue: lostRevenue.total,
    lostCount: lostRevenue.count,
    revenueByProfessional,
    revenueByService,
  });
});

// ---------- GET /reports/appointments/csv ----------
router.get('/appointments/csv', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const { start, end } = parseDateRange(c);

  const rows = await db
    .select({
      startAt: appointments.startAt,
      clientName: contacts.name,
      phone: contacts.phone,
      service: services.name,
      professional: professionals.name,
      status: appointments.status,
      priceInCents: services.priceInCents,
      source: appointments.source,
    })
    .from(appointments)
    .leftJoin(contacts, eq(appointments.contactId, contacts.id))
    .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      eq(appointments.clinicId, clinicId),
      isNull(appointments.deletedAt),
      gte(appointments.startAt, start),
      lte(appointments.startAt, end),
    ))
    .orderBy(appointments.startAt);

  const statusLabels: Record<string, string> = {
    confirmed: 'Confirmado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
    no_show: 'Nao compareceu',
  };

  // BOM (byte order mark) para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const header = 'Data,Horario,Cliente,Telefone,Servico,Profissional,Status,Valor (R$),Origem\n';
  const csvRows = rows.map((r) => {
    const dt = new Date(r.startAt);
    const date = dt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const price = r.priceInCents != null ? (r.priceInCents / 100).toFixed(2).replace('.', ',') : '0,00';
    return [
      escapeCsvField(date),
      escapeCsvField(time),
      escapeCsvField(r.clientName),
      escapeCsvField(r.phone),
      escapeCsvField(r.service),
      escapeCsvField(r.professional),
      escapeCsvField(statusLabels[r.status] || r.status),
      escapeCsvField(price),
      escapeCsvField(r.source),
    ].join(',');
  }).join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename=agendamentos.csv');
  return c.body(bom + header + csvRows);
});

// ---------- GET /reports/contacts/csv ----------
router.get('/contacts/csv', async (c) => {
  const clinicId = c.get('clinicId') as string;
  const { start, end } = parseDateRange(c);

  const rows = await db
    .select({
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      status: contacts.status,
      lastContactAt: contacts.lastContactAt,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .where(and(
      eq(contacts.clinicId, clinicId),
      isNull(contacts.deletedAt),
      gte(contacts.createdAt, start),
      lte(contacts.createdAt, end),
    ))
    .orderBy(contacts.createdAt);

  const statusLabels: Record<string, string> = {
    new: 'Novo',
    active: 'Ativo',
    inactive: 'Inativo',
  };

  const bom = '\uFEFF';
  const header = 'Nome,Telefone,Email,Status,Ultimo Contato,Criado em\n';
  const csvRows = rows.map((r) => {
    const lastContact = r.lastContactAt
      ? new Date(r.lastContactAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : '';
    const createdAt = new Date(r.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return [
      escapeCsvField(r.name),
      escapeCsvField(r.phone),
      escapeCsvField(r.email),
      escapeCsvField(statusLabels[r.status] || r.status),
      escapeCsvField(lastContact),
      escapeCsvField(createdAt),
    ].join(',');
  }).join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename=contatos.csv');
  return c.body(bom + header + csvRows);
});

export default router;
